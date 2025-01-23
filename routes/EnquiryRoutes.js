const express = require('express');
const router = express.Router();
const { connectToDB, sql } = require('../db');

// Get all customers
router.get('/Customer', async (req, res) => {
  try {
    const pool = await connectToDB();
    if (!pool) throw new Error('Database connection failed');

    // Execute the stored procedure ProcMstCustomerSelect
    const result = await pool.request().execute('ProcMstCustomerSelect');

    // Remove the first row (if required)
    const filteredResult = result.recordset;

    res.json(filteredResult);
  } catch (error) {
    console.error('Error fetching customer data:', error.message);
    res.status(500).json({ message: 'Error fetching customer data', error: error.message });
  }
});
router.get('/cities', async (req, res) => {
  try {
    const pool = await connectToDB();
    if (!pool) throw new Error('Database connection failed');

    const result = await pool.request().query(`
      SELECT [CityId], [CityName], [ActiveStatus]
      FROM [iNextInhouseErp].[dbo].[MstCity]
      WHERE [ActiveStatus] = 1
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching cities:', error.message);
    res.status(500).json({ message: 'Error fetching cities', error: error.message });
  }
});
router.get('/states', async (req, res) => {
  try {
    const pool = await connectToDB();
    if (!pool) throw new Error('Database connection failed');

    const result = await pool.request().query(`
      SELECT [StateId], [StateName], [ActiveStatus]
      FROM [iNextInhouseErp].[dbo].[MstState]
      WHERE [ActiveStatus] = 1
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching states:', error.message);
    res.status(500).json({ message: 'Error fetching states', error: error.message });
  }
});

// Fetch all localities
router.get('/localities', async (req, res) => {
  try {
    const pool = await connectToDB();
    if (!pool) throw new Error('Database connection failed');

    const result = await pool.request().query(`
      SELECT [LocalityId], [Locality], [CityId], [PinCode], [ActiveStatus]
      FROM [iNextInhouseErp].[dbo].[MstLocality]
      WHERE [ActiveStatus] = 1
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching localities:', error.message);
    res.status(500).json({ message: 'Error fetching localities', error: error.message });
  }
});

// Add a new locality
router.post('/localities', async (req, res) => {
  const { Locality, CityId, PinCode } = req.body;

  if (!Locality || !CityId ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const pool = await connectToDB();
    if (!pool) throw new Error('Database connection failed');

    await pool.request()
      .input('Locality', sql.VarChar, Locality)
      .input('CityId', sql.Int, CityId)
      .input('PinCode', sql.VarChar, PinCode)
      .input('ActiveStatus', sql.Bit, 1) // Default to active
      .query(`
        INSERT INTO [iNextInhouseErp].[dbo].[MstLocality]
        ([Locality], [CityId], [PinCode], [ActiveStatus])
        VALUES (@Locality, @CityId, @PinCode, @ActiveStatus)
      `);

    res.status(201).json({ message: 'Locality added successfully' });
  } catch (error) {
    console.error('Error adding locality:', error.message);
    res.status(500).json({ message: 'Error adding locality', error: error.message });
  }
});
router.post('/AddCustomer', async (req, res) => {
  try {
    const pool = await connectToDB();
    const {
      CustomerName,
      BusinessName,
      Address,
      ContactEmail,
      ContactPhone,
      ContactWebsite,
    } = req.body;

    // Step 1: Get the last CustomerId
    const lastIdQuery = `
      SELECT MAX(CustomerId) AS LastCustomerId 
      FROM [MstCustomer];
    `;
    const lastIdResult = await pool.request().query(lastIdQuery);

    const lastId = lastIdResult.recordset[0].LastCustomerId || 'iNext-000000000';

    // Step 2: Generate the next CustomerId
    const lastNumber = parseInt(lastId.split('-')[1], 10); // Extract numeric part
    const nextNumber = lastNumber + 1; // Increment the number
    const nextCustomerId = `iNext-${nextNumber.toString().padStart(9, '0')}`; // Format with leading zeros

    // Step 3: Insert new customer with generated CustomerId
    const insertQuery = `
      INSERT INTO [MstCustomer] 
      (CustomerId, CustomerName, BusinessName, Address, ContactEmail1, ContactPhone1, ContactWebsite, CreatedOn) 
      VALUES 
      (@CustomerId, @CustomerName, @BusinessName, @Address, @ContactEmail, @ContactPhone, @ContactWebsite, GETDATE());
    `;

    await pool.request()
      .input('CustomerId', sql.VarChar, nextCustomerId)
      .input('CustomerName', sql.VarChar, CustomerName)
      .input('BusinessName', sql.VarChar, BusinessName)
      .input('Address', sql.VarChar, Address)
      .input('ContactEmail', sql.VarChar, ContactEmail)
      .input('ContactPhone', sql.VarChar, ContactPhone)
      .input('ContactWebsite', sql.VarChar, ContactWebsite)
      .query(insertQuery);

    res.status(200).send(`Customer added successfully with ID: ${nextCustomerId}`);
  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).send('Error adding customer');
  }
});
router.post('/AddProduct', async (req, res) => {
  try {
    const pool = await connectToDB();
    const {
      CustomerId,
      ProductName,
      ProductDetail,
      ProductCategory,
      ProductType,
      Price,
    } = req.body;

    const insertQuery = `
      INSERT INTO [MstProduct] 
      (ProductId, ProductName, Price, ProductDetail, ProductCategory, ProductType, CreatedOn)
      VALUES 
      (@ProductId, @ProductName, @Price, @ProductDetail, @ProductCategory, @ProductType, GETDATE());
    `;

    await pool.request()
      .input('ProductId', sql.VarChar, CustomerId)
      .input('ProductName', sql.VarChar, ProductName)
      .input('Price', sql.Decimal, Price)
      .input('ProductDetail', sql.VarChar, ProductDetail)
      .input('ProductCategory', sql.VarChar, ProductCategory)
      .input('ProductType', sql.VarChar, ProductType)
      .query(insertQuery);

    res.status(200).send(`Product added successfully with ID: ${CustomerId}`);
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).send('Error adding product');
  }
});

router.post('/AddEnquiry', async (req, res) => {
  const pool = await connectToDB();
  const transaction = new sql.Transaction(pool);

  try {
    const {
      CustomerId,
      EnquiryDt,
      DemoDate,
      NextDemoDate,
      AssignedUserId,
      CallMode,
      IsClosed,
      ClosedStr,
      Remarks,
      ActionType,
      Details, // Array of detail objects: [{ DemoDate, UserId, Remarks, NextDemoDate, IsNextDemo, CallMode, AttachmentName, ActionType }]
    } = req.body;

    await transaction.begin();

    // Insert into `MstCustomerEnquiryHead`
    const insertHeadQuery = `
      INSERT INTO [MstCustomerEnquiryHead] 
      (CustomerId, EnquiryDt, DemoDate, NextDemoDate, AssignedUserId, CallMode, IsClosed, ClosedStr, Remarks, CreatedOn) 
      OUTPUT INSERTED.EnquiryId
      VALUES 
      (@CustomerId, @EnquiryDt, @DemoDate, @NextDemoDate, @AssignedUserId, @CallMode, @IsClosed, @ClosedStr, @Remarks, GETDATE());
    `;

    const headResult = await transaction.request()
      .input('CustomerId', sql.VarChar, CustomerId)
      .input('EnquiryDt', sql.Date, EnquiryDt)
      .input('DemoDate', sql.Date, DemoDate)
      .input('NextDemoDate', sql.Date, NextDemoDate)
      .input('AssignedUserId', sql.VarChar, AssignedUserId)
      .input('CallMode', sql.VarChar, CallMode)
      .input('IsClosed', sql.Bit, IsClosed)
      .input('ClosedStr', sql.VarChar, ClosedStr)
      .input('Remarks', sql.VarChar, Remarks)
      .query(insertHeadQuery);

    const newEnquiryId = headResult.recordset[0].EnquiryId;

    // Insert into `MstCustomerEnquiryDetail`
    const insertDetailQuery = `
      INSERT INTO [MstCustomerEnquiryDetail]
      (EnquiryId, DemoDate, UserId, Remarks, NextDemoDate, IsNextDemo, CallMode, AttachmentName, ActionType, CreatedOn)
      VALUES 
      (@EnquiryId, @DemoDate, @UserId, @Remarks, @NextDemoDate, @IsNextDemo, @CallMode, @AttachmentName, @ActionType, GETDATE());
    `;

    for (const detail of Details) {
      await transaction.request()
        .input('EnquiryId', sql.Int, newEnquiryId)
        .input('DemoDate', sql.Date, detail.DemoDate)
        .input('UserId', sql.VarChar, detail.UserId)
        .input('Remarks', sql.VarChar, detail.Remarks)
        .input('NextDemoDate', sql.Date, detail.NextDemoDate)
        .input('IsNextDemo', sql.Bit, detail.IsNextDemo)
        .input('CallMode', sql.VarChar, detail.CallMode)
        .input('AttachmentName', sql.VarChar, detail.AttachmentName)
        .input('ActionType', sql.VarChar, detail.ActionType)
        .query(insertDetailQuery);
    }

    await transaction.commit();

    res.status(200).send({
      message: 'Enquiry added successfully',
      EnquiryId: newEnquiryId,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error saving enquiry:', error);
    res.status(500).send('Error saving enquiry');
  }
});


module.exports = router;

