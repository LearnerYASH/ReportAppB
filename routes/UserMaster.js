const express = require('express');
const { connectToDB, sql } = require('../db');
const CryptoJS = require('crypto-js');
const router = express.Router();

// Triple DES Encryption configuration
const ENCRYPTION_KEY = CryptoJS.MD5("i.Next.!PRK10").toString();
const IV = CryptoJS.enc.Hex.parse("f0032d1d004cad3b");

// Function to encrypt password
const encryptPassword = (password) => {
  const encrypted = CryptoJS.TripleDES.encrypt(
    password,
    CryptoJS.enc.Hex.parse(ENCRYPTION_KEY),
    { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
};
const getNextUserId = async (pool) => {
    const query = `
      SELECT TOP 1 UserId 
      FROM [dbo].[MstUsers]
      ORDER BY UserId DESC
    `;
  
    const result = await pool.request().query(query);
    const lastUserId = result.recordset.length > 0 ? result.recordset[0].UserId : '000000000000000';
  
    // Increment the last UserId
    const nextUserId = (parseInt(lastUserId, 10) + 1).toString().padStart(15, '0');
    return nextUserId;
  };

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
router.get('/UserRoles', async (req, res) => {
    try {
      const pool = await connectToDB();
      const result = await pool.request().query(`
        SELECT UserRoleId, UserRoleName FROM [dbo].[MstUserRoles] WHERE [ActiveStatus] = 1
      `);
  
      res.json(result.recordset);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user roles', error: error.message });
    }
  });
  router.post('/AddNew', async (req, res) => {
    const {
      UserName,
      ShortName,
      UserPwd,
      MobileNo,
      EmailId,
      ContactType,
      UserRoleId,
      UserId,
    } = req.body;
  
    try {
      // Validate required fields
      if (!UserName || !UserPwd || !EmailId || !ContactType || !UserRoleId || !UserId) {
        return res.status(400).json({ message: 'All fields are required' });
      }
  
      const pool = await connectToDB();
      const nextUserId = await getNextUserId(pool);

  
      // Encrypt the password
      const encryptedPassword = encryptPassword(UserPwd);
      // Generate LastUpdate timestamp
    const lastUpdate = new Date().toISOString().replace('T', ' ').substring(0, 23); // Current timestamp

    // Generate a dynamic TS value
    const randomHex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase(); // Random 4-digit hex
    const tsValue = Buffer.from(`000000000000${randomHex.padStart(4, '0')}`, 'hex'); // Convert hex to Buffer (binary)

  
      // Insert user data into the database
      const query = `
        INSERT INTO [dbo].[MstUsers] (
          [UserId], [MgrUserId], [UserName], [ShortName], [UserPwd], [MobileNo], 
        [EmailId], [ContactType], [UserRoleId], [ActiveStatus], [LastUpdate], [IsNewUser], [TS]
        )
        VALUES (
         @NextUserId, @MgrUserId, @UserName, @ShortName, @UserPwd, @MobileNo, 
        @EmailId, @ContactType, @UserRoleId, 1, @LastUpdate, 1, @TS
      `;
  
      await pool.request()
      .input('NextUserId', sql.NVarChar, nextUserId)
      .input('MgrUserId', sql.NVarChar, UserId)
        .input('UserName', sql.NVarChar, UserName)
        .input('ShortName', sql.NVarChar, ShortName)
        .input('UserPwd', sql.NVarChar, encryptedPassword) // Save the encrypted password
        .input('MobileNo', sql.NVarChar, MobileNo)
        .input('EmailId', sql.NVarChar, EmailId)
        .input('ContactType', sql.Int, ContactType)
        .input('UserRoleId', sql.NVarChar, UserRoleId)
        .input('LastUpdate', sql.DateTime, lastUpdate) // Add LastUpdate
        .input('TS', sql.VarBinary, tsValue) // Dynamically generated TS
        .query(query);
  
      res.status(200).json({ message: 'User added successfully' });
    } catch (error) {
      console.error('Error saving user:', error);
      res.status(500).json({ message: 'Error saving user', error: error.message });
    }
  });
  router.get('/products', async (req, res) => {
    try {
      const pool = await connectToDB();
      const result = await pool.request().query(`
        SELECT TOP 1000 
          ProductId, ProductName, Price, ProductDetail, LastUpdate, TS, 
          ProductCategory, ProductType, IsSubcription, RefProductId
        FROM [dbo].[MstProduct]
      `);
  
      res.json(result.recordset);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
  });

module.exports = router;
