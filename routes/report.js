// reports.js
const express = require('express');
const { connectToDB, sql } = require('../db');
const router = express.Router();

router.get('/reports', async (req, res) => {
    try {
        const pool = await connectToDB();
        if (!pool) {
            return res.status(500).json({ message: 'Failed to connect to the database' });
        }

        const reportGroup = req.query.group; // Get the ReportGroup from query parameters
        const query = reportGroup 
            ? `SELECT * FROM RptAppReports WHERE ReportGroup = '${reportGroup}'`
            : `SELECT * FROM RptAppReports`; // Default to fetch all if no group specified

        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching reports:', error.message);
        res.status(500).json({ message: 'Error fetching reports', error: error.message });
    }
});
// reportsRoute.js
router.post('/execute', async (req, res) => {
    const { procedureName, fromDate, toDate, reportId, branchId, dbConfig } = req.body;
    console.log('Received procedureName:', procedureName);
    console.log('Received fromDate:', fromDate);
    console.log('Received toDate:', toDate);
    console.log('Received reportId:', reportId);
    console.log('Received branchId:', branchId); // Log the received branchId
    console.log('Received dbConfig:', dbConfig); // Log the received database configuration

    try {
        // Set up a new pool using dbConfig from frontend
        const pool = new sql.ConnectionPool({
            user: dbConfig.sqlUserId,
            password: dbConfig.sqlPwd,
            server: dbConfig.serverIp,
            port: parseInt(dbConfig.sqlPort),
            database: dbConfig.clientDbName,
            options: {
                encrypt: true,
                trustServerCertificate: true,
            },
        });

        await pool.connect(); // Connect to the specified database
        console.log('Connected to the specified database');

        // Adjust query to match the stored procedure's parameters
        const query = `EXEC ${procedureName} @cReportId, @dFromDt, @dToDt, @cBranchId`;
        
        const result = await pool.request()
            .input('cReportId', sql.VarChar, reportId)     // Pass ReportId parameter
            .input('dFromDt', sql.Date, fromDate)          // Pass FromDate parameter
            .input('dToDt', sql.Date, toDate)              // Pass ToDate parameter
            .input('cBranchId', sql.Char(3), branchId)     // Pass branchId from frontend
            .query(query);

        // Log the result to debug
        console.log('Stored procedure result:', result.recordset);

        // Return the result data to the client
        res.json(result.recordset);
    } catch (error) {
        console.error('Error executing stored procedure:', error);
        res.status(500).json({ message: 'Error executing stored procedure', error: error.message });
    }
});
router.post('/executebatch', async (req, res) => {
    const { reports, dbConfig } = req.body;
    const pool = new sql.ConnectionPool({
        user: dbConfig.sqlUserId,
        password: dbConfig.sqlPwd,
        server: dbConfig.serverIp,
        port: parseInt(dbConfig.sqlPort),
        database: dbConfig.clientDbName,
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
    });

    try {
        await pool.connect();
        const results = {};

        for (const report of reports) {
            const { procedureName, fromDate, toDate, reportId, branchId } = report;

            const query = `EXEC ${procedureName} @cReportId, @dFromDt, @dToDt, @cBranchId`;
            const result = await pool.request()
                .input('cReportId', sql.VarChar, reportId)
                .input('dFromDt', sql.Date, fromDate)
                .input('dToDt', sql.Date, toDate)
                .input('cBranchId', sql.Char(3), branchId)
                .query(query);

            results[reportId] = result.recordset; // Save each report's data
        }

        res.json(results);
    } catch (error) {
        console.error('Error executing batch reports:', error);
        res.status(500).json({ message: 'Error executing batch reports', error: error.message });
    } finally {
        pool.close();
    }
});


router.post('/getBranches', async (req, res) => {
    const { dbConfig } = req.body;
    console.log('Received dbConfig:', dbConfig);

    try {
        // Set up a new pool using dbConfig from frontend
        const pool = new sql.ConnectionPool({
            user: dbConfig.sqlUserId,
            password: dbConfig.sqlPwd,
            server: dbConfig.serverIp,
            port: parseInt(dbConfig.sqlPort),
            database: dbConfig.clientDbName,
            options: {
                encrypt: true,
                trustServerCertificate: true,
            },
        });

        await pool.connect(); // Connect to the specified database
        console.log('Connected to the specified database for retrieving branches');

        // Execute query to fetch branchId and branchName from MstBranch table
        const query = `SELECT branchId, branchName FROM MstBranch`;
        const result = await pool.request().query(query);

        // Log the result for debugging
        console.log('Branch data result:', result.recordset);

        // Return the branch data to the client
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching branch data:', error);
        res.status(500).json({ message: 'Error fetching branch data', error: error.message });
    }
});

  
module.exports = router;