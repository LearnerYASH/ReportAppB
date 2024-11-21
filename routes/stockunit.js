const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();

router.get('/stockunits/:branchId', async (req, res) => {
    const { branchId } = req.params;

    try {
        const pool = await connectToDB();
        
        const result = await pool.request()
            .input('branchId', sql.Int, branchId)
            .query('SELECT StockUnitId, StockUnitName FROM MstStockUnit WHERE BranchId = @branchId AND ActiveStatus = 1');
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching stock units:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch stock units', error: err.message });
    }
});

module.exports = router;