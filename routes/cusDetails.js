const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();

router.get('/customers/:customerId', async (req, res) => {
    const { customerId } = req.params;
    console.log(customerId);
    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('customerId', sql.VarChar, customerId)
            .query(`SELECT * FROM MstCustomer WHERE CustomerId = @customerId`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customer details', error: error.message });
    }
});

module.exports = router;
