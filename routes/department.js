const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();

// POST route to add a new department
router.post('/department/add', async (req, res) => {
    const { departmentName, description, extDescription, shortName, userId } = req.body;
    console.log('Received userId:', userId);
    console.log('Received departmentName:', departmentName);
    const paddedUserId = userId.padStart(15, '0');


    if (!departmentName || !userId) {
        return res.status(400).json({ success: false, message: 'Department name and user ID are required' });
    }

    try {
        const pool = await connectToDB();

        // Fetch the last InvDepartmentId to generate the next one
        const result = await pool.request()
            .query(`
                SELECT TOP 1 InvDepartmentId 
                FROM MstInvDepartment 
                ORDER BY InvDepartmentId DESC
            `);

        let newInvDepartmentId = '001000000000001'; // Default first ID

        if (result.recordset.length > 0) {
            const lastInvDepartmentId = result.recordset[0].InvDepartmentId;
            const lastNumericPart = parseInt(lastInvDepartmentId.slice(-12)); // Get the numeric part
            const newNumericPart = (lastNumericPart + 1).toString().padStart(12, '0');
            newInvDepartmentId = `001${newNumericPart}`; // Generate new ID
        }

        // Insert new department into the table
        await pool.request()
            .input('InvDepartmentId', sql.VarChar, newInvDepartmentId)
            .input('InvDepartmentName', sql.VarChar, departmentName)
            .input('Description', sql.VarChar, description || '')
            .input('ExtDescription', sql.VarChar, extDescription || '')
            .input('ShortName', sql.VarChar, shortName || '')
            .input('UserId', sql.Char(15), paddedUserId) // Ensure it matches the column's data type
            .input('EdtUserId', sql.Char(15), paddedUserId)
            .input('CreatedOn', sql.DateTime, new Date())
            .input('LastUpdate', sql.DateTime, new Date())
            .query(`
                INSERT INTO MstInvDepartment 
                (InvDepartmentId, InvDepartmentName, Description, ExtDescription, ShortName, UserId, EdtUserId, CreatedOn, LastUpdate)
                VALUES 
                (@InvDepartmentId, @InvDepartmentName, @Description, @ExtDescription, @ShortName, @UserId, @EdtUserId, @CreatedOn, @LastUpdate)
            `);

        res.json({ success: true, message: 'Department added successfully', newInvDepartmentId });
    } catch (error) {
        console.error('Error adding department:', error.message);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});
router.get('/department/list', async (req, res) => {
    try {
        const pool = await connectToDB();

        // Query to fetch all departments
        const result = await pool.request()
            .query(`SELECT InvDepartmentId, InvDepartmentName FROM MstInvDepartment`);

        // Send the list of departments in the response
        res.json({ success: true, departments: result.recordset });
    } catch (error) {
        console.error('Error fetching departments:', error.message);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});


module.exports = router;
