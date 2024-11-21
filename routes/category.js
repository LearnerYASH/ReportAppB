const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();

// POST route to add a new category
router.post('/category/add', async (req, res) => {
    const { departmentId, categoryName, description, extDescription, shortName, status, userId } = req.body;

    if (!departmentId || !categoryName || !userId) {
        return res.status(400).json({ success: false, message: 'Department, category name, and user ID are required' });
    }

    try {
        const pool = await connectToDB();

        // Fetch the last InvCategoryId to generate the next one
        const result = await pool.request()
            .query(`
                SELECT TOP 1 InvCategoryId 
                FROM MstInvCategory 
                ORDER BY InvCategoryId DESC
            `);

        let newInvCategoryId = '001000000000001'; // Default first ID

        if (result.recordset.length > 0) {
            const lastInvCategoryId = result.recordset[0].InvCategoryId;
            const lastNumericPart = parseInt(lastInvCategoryId.slice(-12)); // Get the numeric part
            const newNumericPart = (lastNumericPart + 1).toString().padStart(12, '0');
            newInvCategoryId = `001${newNumericPart}`; // Generate new ID
        }

        // Insert new category into the table
        await pool.request()
            .input('InvCategoryId', sql.VarChar, newInvCategoryId)
            .input('InvCategoryName', sql.VarChar, categoryName)
            .input('Description', sql.VarChar, description || '')
            .input('ExtDescription', sql.VarChar, extDescription || '')
            .input('ShortName', sql.VarChar, shortName || '')
            .input('InvDepartmentId', sql.VarChar, departmentId)
            .input('UserId', sql.VarChar, userId)
            .input('EdtUserId', sql.VarChar, userId) // Created by and edited by the same user initially
            .input('CreatedOn', sql.DateTime, new Date())
            .input('LastUpdate', sql.DateTime, new Date())
            .input('ActiveStatus', sql.Bit, status)  // Updated column name
            .query(`
                INSERT INTO MstInvCategory 
                (InvCategoryId, InvCategoryName, Description, ExtDescription, ShortName, InvDepartmentId, UserId, EdtUserId, CreatedOn, LastUpdate, ActiveStatus)
                VALUES 
                (@InvCategoryId, @InvCategoryName, @Description, @ExtDescription, @ShortName, @InvDepartmentId, @UserId, @EdtUserId, @CreatedOn, @LastUpdate, @ActiveStatus)
            `);

        res.json({ success: true, message: 'Category added successfully', newInvCategoryId });
    } catch (error) {
        console.error('Error adding category:', error.message);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});
router.get('/category/list', async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .query(`
                SELECT InvCategoryId, InvCategoryName 
                FROM MstInvCategory
            `);

            res.json({ success: true, categories: result.recordset });
    } catch (error) {
        console.error('Error fetching categories:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
