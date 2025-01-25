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
        if (!pool) throw new Error('Database connection failed');

        // Call the stored procedure with @cCustomerId as an empty string
        const result = await pool.request()
            .input('cCustomerId', sql.VarChar, '') // Pass empty string as @cCustomerId
            .execute('ProcMstUsersSelect'); // Execute the stored procedure

        // Filter records in the backend
        const filteredUsers = result.recordset.filter(user => user.ContactType === 1);

        res.json(filteredUsers);
    } catch (error) {
        console.error('Error fetching users:', error.message);
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
        @UserId, @MgrUserId, @UserName, @ShortName, @UserPwd, @MobileNo,
        @EmailId, @ContactType, @UserRoleId, 1, @LastUpdate, 1, @TS
      )
    `;
  
      await pool.request()
      .input('UserId', sql.Char, nextUserId)
      .input('MgrUserId', sql.Char, UserId)
        .input('UserName', sql.VarChar, UserName)
        .input('ShortName', sql.VarChar, ShortName)
        .input('UserPwd', sql.VarChar, encryptedPassword) // Save the encrypted password
        .input('MobileNo', sql.VarChar, MobileNo)
        .input('EmailId', sql.VarChar, EmailId)
        .input('ContactType', sql.Int, ContactType)
        .input('UserRoleId', sql.Char, UserRoleId)
        .input('LastUpdate', sql.DateTime, new Date()) // Add LastUpdate
        .input('TS', sql.timestamp, tsValue) // Dynamically generated TS
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
        EXEC ProcMstProductSelect 
      `);
  
      res.json(result.recordset);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
  });
  router.post('/AddNewProduct', async (req, res) => {
    const {
        ProductName,
        Price,
        ProductDetail,
        ProductCategory,
        ProductType,
        IsSubscription,
    } = req.body;

    try {
        const pool = await connectToDB();

        // Fetch the last ProductId to calculate the next one
        const lastProductIdQuery = `
            SELECT TOP 1 [ProductId]
            FROM [dbo].[MstProduct]
            WHERE [ProductId] LIKE 'iNext-%'
            ORDER BY [ProductId] DESC
        `;

        const result = await pool.request().query(lastProductIdQuery);

        let nextProductId = 'iNext-000000001'; // Default for the first product

        if (result.recordset.length > 0) {
            const lastProductId = result.recordset[0].ProductId;
            const numericPart = parseInt(lastProductId.replace('iNext-', ''), 10);
            const nextNumericPart = numericPart + 1;
            nextProductId = `iNext-${nextNumericPart.toString().padStart(9, '0')}`;
        }

        const query = `
            INSERT INTO [dbo].[MstProduct] (
                [ProductId], [ProductName], [Price], [ProductDetail],
                [ProductCategory], [ProductType], [IsSubscription], [LastUpdate]
            )
            VALUES (
                @ProductId, @ProductName, @Price, @ProductDetail,
                @ProductCategory, @ProductType, @IsSubscription, GETDATE()
            )
        `;

        await pool.request()
            .input('ProductId', sql.VarChar, nextProductId)
            .input('ProductName', sql.VarChar, ProductName)
            .input('Price', sql.VarChar(20), Price)
            .input('ProductDetail', sql.Text, ProductDetail)
            .input('ProductCategory', sql.VarChar, ProductCategory)
            .input('ProductType', sql.VarChar, ProductType)
            .input('IsSubscription', sql.Bit, IsSubscription ? 1 : 0)
            .query(query);

        res.status(200).json({ message: 'Product added successfully', ProductId: nextProductId });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product', error: error.message });
    }
});
router.post('/editproduct', async (req, res) => {
  const {
    ProductId,
    ProductName,
    Price, // Required
    ProductDetail, // Optional (Maps to @cDesc in the procedure)
    ProductCategory, // Required
    ProductType, // Required
    IsSubscription, // Optional (Maps to @lIsForLicense in the procedure)
  } = req.body;

  try {
    // Validate required fields
    if (!ProductId || !ProductName || !Price || !ProductCategory || !ProductType) {
      return res.status(400).json({
        message: 'Missing required fields: ProductId, ProductName, Price, ProductCategory, and ProductType',
      });
    }

    // Ensure Price is a valid numeric string
    const parsedPrice = parseFloat(Price);
    if (isNaN(parsedPrice)) {
      return res.status(400).json({ message: 'Invalid value for Price. It must be a valid number.' });
    }

    // Format Price as a string (with 2 decimal places, if needed)
    const formattedPrice = parsedPrice.toFixed(2);

    const pool = await connectToDB();

    // Execute the stored procedure with provided parameters
    await pool.request()
      .input('cProductId', sql.VarChar(20), ProductId) // Map ProductId
      .input('cProductName', sql.VarChar(100), ProductName) // Map ProductName
      .input('cPrice', sql.VarChar(20), formattedPrice) // Map formatted Price as a string
      .input('cDesc', sql.VarChar(sql.MAX), ProductDetail) // Map ProductDetail (optional)
      .input('cProductCategory', sql.VarChar(100), ProductCategory) // Map ProductCategory
      .input('cProductType', sql.VarChar(50), ProductType) // Map ProductType
      .input('lIsForLicense', sql.Bit, IsSubscription ? 1 : 0) // Map IsSubscription
      .input('cRefProductId', sql.VarChar, '') // Map IsSubscription
      .execute('ProcMstProductUpdate'); // Call the stored procedure

    res.status(200).json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error.message);
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});
router.post('/edituser', async (req, res) => {
  const { UserId, UserName, EmailId, MobileNo, UserRoleId, ActiveStatus } = req.body;

  try {
    // Validate required fields
    if (!UserId || !UserName || !EmailId || !UserRoleId) {
      return res.status(400).json({ message: 'Missing required fields: UserId, UserName, EmailId, and UserRoleId' });
    }

    const pool = await connectToDB();

    // Execute the stored procedure or write a query to update user information
    await pool.request()
      .input('UserId', sql.Char, UserId) // Map UserId
      .input('UserName', sql.VarChar, UserName) // Map UserName
      .input('EmailId', sql.VarChar, EmailId) // Map EmailId
      .input('MobileNo', sql.VarChar, MobileNo || null) // Map MobileNo (optional)
      .input('UserRoleId', sql.Char, UserRoleId) // Map UserRoleId
      .input('ActiveStatus', sql.Bit, ActiveStatus ? 1 : 0) // Map ActiveStatus
      .query(`
        UPDATE [dbo].[MstUsers]
        SET 
          [UserName] = @UserName,
          [EmailId] = @EmailId,
          [MobileNo] = @MobileNo,
          [UserRoleId] = @UserRoleId,
          [ActiveStatus] = @ActiveStatus,
          [LastUpdate] = GETDATE()
        WHERE [UserId] = @UserId
      `);

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});


  

module.exports = router;
