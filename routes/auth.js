const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const JWT_SECRET = 'your_secret_key';
const redis = require('./redisClient');

router.post('/login', async (req, res) => {
    const { emailid, userpwd } = req.body;

    if (!emailid) {
        return res.status(400).json({ success: false, message: 'Email ID is required' });
    }

    try {
        // Check if user data is cached in Redis
        const cachedUser = await redis.get(`user:${emailid}`);
        if (cachedUser) {
            const user = JSON.parse(cachedUser);

            // Validate password
            if (user.UserPwd && decryptPassword(user.UserPwd) !== userpwd) {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            }

            // Generate token and respond
            const token = jwt.sign(
                { customerId: user.CustomerId, userName: user.UserName },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            return res.json({
                success: true,
                token,
                tokenExpiration: Date.now() + 3600000,
                customerId: user.CustomerId,
                UserName: user.UserName
            });
        }

        // If not cached, query the database
        const pool = await connectToDB();
        if (!pool) throw new Error('Database connection failed');

        const userResult = await pool.request()
            .input('emailid', sql.VarChar, emailid)
            .query(`
                SELECT TOP 1 UserPwd, CustomerId, UserName
                FROM MstUsers
                WHERE EmailId = @emailid
            `);

        if (userResult.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = userResult.recordset[0];

        // Validate password
        if (user.UserPwd) {
            const decryptedPwd = decryptPassword(user.UserPwd);
            if (decryptedPwd !== userpwd) {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            }
        } else if (userpwd) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }

        // Cache user data in Redis for 10 minutes
        await redis.setex(`user:${emailid}`, 600, JSON.stringify(user));

        // Generate token and respond
        const token = jwt.sign(
            { customerId: user.CustomerId, userName: user.UserName },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({
            success: true,
            token,
            tokenExpiration: Date.now() + 3600000,
            customerId: user.CustomerId,
            UserName: user.UserName
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
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
                SELECT ServerIp, SqlPort, SQLUserId, SQLPwd, ClientDbName
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