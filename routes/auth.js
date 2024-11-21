const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const JWT_SECRET = 'your_secret_key';

router.post('/login', async (req, res) => {
    const { emailid, userpwd } = req.body;
    
    if (!emailid) {
        return res.status(400).json({ success: false, message: 'Email ID is required' });
    }

    try {
        const pool = await connectToDB();

        if (!pool) {
            throw new Error('Database connection is not established');
        }

        // Query to find user by emailid
        const userResult = await pool.request()
            .input('emailid', sql.VarChar, emailid)
            .query(`
                SELECT UserPwd, CustomerId , UserName
                FROM MstUsers
                WHERE EmailId = @emailid 
            `);

        if (userResult.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = userResult.recordset[0];

        if (user.UserPwd) {
            let decryptedPwd;
            try {
                // Decrypt the password with CryptoJS
                const key = CryptoJS.MD5("z.Order!PRK10").toString();
                const iv = CryptoJS.enc.Hex.parse("f0032d1d004cad3b");
                const encryptedData = CryptoJS.enc.Base64.parse(user.UserPwd);

                const decrypted = CryptoJS.TripleDES.decrypt(
                    { ciphertext: encryptedData },
                    CryptoJS.enc.Hex.parse(key),
                    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
                );
                
                decryptedPwd = decrypted.toString(CryptoJS.enc.Utf8);

                if (decryptedPwd !== userpwd) {
                    return res.status(401).json({ success: false, message: 'Invalid password' });
                }
            } catch (decryptionError) {
                console.error('Error during password decryption:', decryptionError.message);
                return res.status(500).json({ success: false, message: 'Error processing password' });
            }
        } else if (userpwd) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        // Retrieve additional data from MstProductKey using the CustomerId
        const productKeyResult = await pool.request()
            .input('customerId', sql.VarChar, user.CustomerId)
            .query(`
                SELECT ServerIp, SqlPort, SQLUserId, SQLPwd, ClientDbName
                FROM MstProductKey
                WHERE CustomerId = @customerId
            `);

        if (productKeyResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Product key details not found for customer' });
        }

        const productKey = productKeyResult.recordset[0];

        // Generate JWT token
        const token = jwt.sign({ customerId: user.CustomerId }, JWT_SECRET, { expiresIn: '1h' });
        const tokenExpiration = Date.now() + 3600000;

        res.json({
            success: true,
            token,
            tokenExpiration,
            customerId: user.CustomerId,
            UserName: user.UserName,
            serverIp: productKey.ServerIp,
            sqlPort: productKey.SqlPort,
            sqlUserId: productKey.SQLUserId,
            sqlPwd: productKey.SQLPwd,
            clientDbName: productKey.ClientDbName
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
