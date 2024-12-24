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
        if (!pool) throw new Error('Database connection is not established');

        // Query to validate user
        const userResult = await pool.request()
            .input('EmailId', sql.VarChar, emailid)
            .query(`
                EXEC sProcGetCustomerInfo @cEmailId 
            `);

        if (userResult.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = userResult.recordset[0];

        if (user.UserPwd) {
            const key = CryptoJS.MD5("i.Next.!PRK10").toString();
            const iv = CryptoJS.enc.Hex.parse("f0032d1d004cad3b");
            const encryptedData = CryptoJS.enc.Base64.parse(user.UserPwd);

            const decrypted = CryptoJS.TripleDES.decrypt(
                { ciphertext: encryptedData },
                CryptoJS.enc.Hex.parse(key),
                { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
            );

            const decryptedPwd = decrypted.toString(CryptoJS.enc.Utf8);

            if (decryptedPwd !== userpwd) {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            }
        } else if (userpwd) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        // Generate JWT token
        const token = jwt.sign({ customerId: user.CustomerId }, JWT_SECRET, { expiresIn: '1h' });
        

        res.json({
            success: true,
            token,
            customerId: user.CustomerId,
            UserName: user.UserName
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

router.get('/get-product-key', async (req, res) => {
    const { customerId } = req.query;

    if (!customerId) {
        return res.status(400).json({ success: false, message: 'CustomerId is required' });
    }

    try {
        const pool = await connectToDB();
        if (!pool) throw new Error('Database connection is not established');

        const productKeyResult = await pool.request()
            .input('customerId', sql.VarChar, customerId)
            .query(`
                SELECT ServerIp, SqlPort, SQLUserId, SQLPwd, ClientDbName, HoBranchId
                FROM MstProductKey
                WHERE CustomerId = @customerId
            `);

        if (productKeyResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Product key details not found' });
        }

        res.json({ success: true, productKey: productKeyResult.recordset[0] });
    } catch (error) {
        console.error('Error fetching product key:', error.message);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});
module.exports = router;