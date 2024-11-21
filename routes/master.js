const express = require('express');

const router = express.Router();
const { connectToDB, sql } = require('../db');



// Route to get articles
router.get('/articles', async (req, res) => {
  try {
    
    const pool = await connectToDB();
    const result = await pool.request()
            .query(`SELECT TOP 1000 * FROM VwMstArticleEntry`);
        
        res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
