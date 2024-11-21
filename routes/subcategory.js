const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();

// POST route to add a new subcategory
router.post('/subcategory/add', async (req, res) => {
    const { categoryId, subCategoryName, description, extDescription, shortName, status, userId } = req.body;

    if (!categoryId || !subCategoryName || !userId) {
        return res.status(400).json({ success: false, message: 'Category, subcategory name, and user ID are required' });
    }

    try {
        const pool = await connectToDB();

        // Fetch the last InvSubCategoryId to generate the next one
        const result = await pool.request()
            .query(`
                SELECT TOP 1 InvSubCategoryId 
                FROM MstInvSubCategory 
                ORDER BY InvSubCategoryId DESC
            `);

        let newInvSubCategoryId = '001000000000001'; // Default first ID

        if (result.recordset.length > 0) {
            const lastInvSubCategoryId = result.recordset[0].InvSubCategoryId;
            const lastNumericPart = parseInt(lastInvSubCategoryId.slice(-12)); // Get the numeric part
            const newNumericPart = (lastNumericPart + 1).toString().padStart(12, '0');
            newInvSubCategoryId = `001${newNumericPart}`; // Generate new ID
        }

        // Insert new subcategory into the table
        await pool.request()
            .input('InvSubCategoryId', sql.VarChar, newInvSubCategoryId)
            .input('InvSubCategoryName', sql.VarChar, subCategoryName)
            .input('Description', sql.VarChar, description || '')
            .input('ExtDescription', sql.VarChar, extDescription || '')
            .input('ShortName', sql.VarChar, shortName || '')
            .input('InvCategoryId', sql.VarChar, categoryId)
            .input('UserId', sql.VarChar, userId)
            .input('EdtUserId', sql.VarChar, userId) // Created by and edited by the same user initially
            .input('CreatedOn', sql.DateTime, new Date())
            .input('LastUpdate', sql.DateTime, new Date())
            .input('ActiveStatus', sql.Bit, status)
            .query(`
                INSERT INTO MstInvSubCategory 
                (InvSubCategoryId, InvSubCategoryName, Description, ExtDescription, ShortName, InvCategoryId, UserId, EdtUserId, CreatedOn, LastUpdate, ActiveStatus)
                VALUES 
                (@InvSubCategoryId, @InvSubCategoryName, @Description, @ExtDescription, @ShortName, @InvCategoryId, @UserId, @EdtUserId, @CreatedOn, @LastUpdate, @ActiveStatus)
            `);

        res.json({ success: true, message: 'SubCategory added successfully', newInvSubCategoryId });
    } catch (error) {
        console.error('Error adding subcategory:', error.message);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
