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
            .input('cEmailId', sql.VarChar, emailid)
            .input('cMobileNo', sql.VarChar, '')   
            .query(`
                EXEC sProcGetCustomerInfo @cEmailId, @cMobileNo
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
            UserId: user.UserId,
            HoBranchId: user.HoBranchId,
            UserName: user.UserName,
            ServerIp: user.ServerIp,
            SqlPort: user.SqlPort,
            SQLUserId: user.SQLUserId,
            SQLPwd: user.SQLPwd,
            ClientDbName: user.ClientDbName,
            CustomerName: user.CustomerName,
            BusinessName: user.BusinessName,
            ContactEmail1: user.ContactEmail1,
            ContactPhone1: user.ContactPhone1,
            Address: user.Address
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});
router.post('/loginr', async (req, res) => {
    const { emailid, userpwd } = req.body;

    // Validate input
    if (!emailid || !userpwd) {
        return res.status(400).json({ success: false, message: 'Email ID and password are required' });
    }

    try {
        // Encrypt the user-provided password
        const encryptedPwd = encryptPassword(userpwd);

        const pool = await connectToDB();
        if (!pool) throw new Error('Database connection failed');

        // Pass the encrypted password and email ID to the stored procedure
        const userResult = await pool.request()
            .input('cEmailId', sql.VarChar, emailid)
            .input('cPassword', sql.VarChar, encryptedPwd) // Pass encrypted password
            .query(`EXEC procUserLogin @cEmailId, @cPassword`);

        // Check if user exists
        if (userResult.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = userResult.recordset[0];

        // Generate JWT token
        const token = jwt.sign({ customerId: user.CustomerId }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Respond with user details and token
        res.json({
            success: true,
            token,
            UserId: user.UserId,
            HoBranchId: user.HoBranchId,
            UserName: user.UserName,
            ClientDbName: user.ClientDbName,
            CustomerName: user.CustomerName,
            BusinessName: user.BusinessName,
            ContactEmail1: user.ContactEmail1,
            ContactPhone1: user.ContactPhone1,
            Address: user.Address
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// Utility function to encrypt the password
function encryptPassword(plainPassword) {
    const key = CryptoJS.MD5("i.Next.!PRK10").toString(); // Use a secure key
    const iv = CryptoJS.enc.Hex.parse("f0032d1d004cad3b"); // Use a secure IV

    const encrypted = CryptoJS.TripleDES.encrypt(
        plainPassword,
        CryptoJS.enc.Hex.parse(key),
        { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    return encrypted.ciphertext.toString(CryptoJS.enc.Base64); // Return the encrypted password as a Base64 string
}
module.exports = router;