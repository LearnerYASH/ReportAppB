const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();

router.get('/allusers', async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query(`
            SELECT * FROM [dbo].[MstUsers] WHERE [ActiveStatus] = 1
 `);

        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

module.exports = router;
