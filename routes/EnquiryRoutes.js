const express = require('express');
const router = express.Router();
const { connectToDB, sql } = require('../db');
const generateUniqueId = async (table, idColumn, prefix, pool) => {
  const result = await pool.request().query(
    `SELECT TOP 1 ${idColumn} FROM [iNextInhouseErp].[dbo].[${table}]
     ORDER BY ${idColumn} DESC`
  );
  const lastId = result.recordset[0]?.[idColumn] || `${prefix}000000000`;
  const numericPart = parseInt(lastId.replace(prefix, ''), 10) + 1;
  return `${prefix}${numericPart.toString().padStart(9, '0')}`;
};

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
  const { Locality, City, StateId, PinCode } = req.body;

  // Validate input
  if (!Locality || !City || !StateId || !PinCode) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const pool = await connectToDB();
    if (!pool) throw new Error('Database connection failed');

    // Check if the city already exists
    const cityResult = await pool.request()
      .input('CityName', City)
      .input('StateId', StateId)
      .query(
        `SELECT [CityId] FROM [iNextInhouseErp].[dbo].[MstCity]
         WHERE [CityName] = @CityName AND [StateId] = @StateId`
      );

    let cityId = cityResult.recordset[0]?.CityId;

    // If city doesn't exist, create a new CityId and insert it
    if (!cityId) {
      const generateUniqueId = async (table, idColumn, prefix, pool) => {
        const result = await pool.request().query(
          `SELECT TOP 1 ${idColumn} FROM [iNextInhouseErp].[dbo].[${table}]
           ORDER BY ${idColumn} DESC`
        );
        const lastId = result.recordset[0]?.[idColumn] || `${prefix}000000000`;
        const numericPart = parseInt(lastId.replace(prefix, ''), 10) + 1;
        return `${prefix}${numericPart.toString().padStart(9, '0')}`;
      };

      cityId = await generateUniqueId('MstCity', 'CityId', 'C', pool);
      await pool.request()
        .input('CityId', cityId)
        .input('CityName', City)
        .input('StateId', StateId)
        .input('ActiveStatus', 1)
        .query(
          `INSERT INTO [iNextInhouseErp].[dbo].[MstCity] ([CityId], [CityName], [StateId], [ActiveStatus], [LastUpdate])
           VALUES (@CityId, @CityName, @StateId, @ActiveStatus, GETDATE())`
        );
    }

    // Check if locality already exists
    const localityResult = await pool.request()
      .input('Locality', Locality)
      .input('CityId', cityId)
      .query(
        `SELECT [LocalityId] FROM [iNextInhouseErp].[dbo].[MstLocality]
         WHERE [Locality] = @Locality AND [CityId] = @CityId`
      );

    if (localityResult.recordset.length > 0) {
      return res.status(400).json({ message: 'Locality already exists for the given city.' });
    }

    // Generate a unique LocalityId and insert the locality
    const localityId = await generateUniqueId('MstLocality', 'LocalityId', 'L', pool);
    await pool.request()
      .input('LocalityId', localityId)
      .input('Locality', Locality)
      .input('CityId', cityId)
      .input('PinCode', PinCode)
      .input('ActiveStatus', 1)
      .query(
        `INSERT INTO [iNextInhouseErp].[dbo].[MstLocality] ([LocalityId], [Locality], [CityId], [PinCode], [ActiveStatus], [LastUpdate])
         VALUES (@LocalityId, @Locality, @CityId, @PinCode, @ActiveStatus, GETDATE())`
      );

    res.status(201).json({ message: 'Locality saved successfully.', localityId, cityId });
  } catch (error) {
    console.error('Error saving locality:', error.message);
    res.status(500).json({ message: 'Error saving locality', error: error.message });
  }
});

router.post('/AddCustomer', async (req, res) => {
  try {
    const pool = await connectToDB();
    const {
      salutation,
      firstName,
      lastName,
      businessName,
      address,
      email,
      phone,
      website,
      gstTreatment,
      taxGSTINNo,
      locality,
    } = req.body;

    // Step 1: Merge firstName and lastName for CustomerName
    const CustomerName = `${firstName} ${lastName}`.trim();

    // Step 2: Map gstTreatment to GSTClassification
    const gstMapping = {
      'Registered Taxpayer': 1,
      'Normal Taxpayer': 2,
      'Composition Taxpayer': 3,
    };
    const GSTClassification = gstMapping[gstTreatment] || null; // Default to null if not found

    // Step 3: Get the last CustomerId
    const lastIdQuery = `
      SELECT MAX(CustomerId) AS LastCustomerId 
      FROM [MstCustomer];
    `;
    const lastIdResult = await pool.request().query(lastIdQuery);

    const lastId = lastIdResult.recordset[0].LastCustomerId || 'iNext-000000000';

    // Step 4: Generate the next CustomerId
    const lastNumber = parseInt(lastId.split('-')[1], 10); // Extract numeric part
    const nextNumber = lastNumber + 1; // Increment the number
    const nextCustomerId = `iNext-${nextNumber.toString().padStart(9, '0')}`; // Format with leading zeros

    // Step 5: Insert the new customer with the provided data
    const insertQuery = `
      INSERT INTO [MstCustomer] 
      (
        CustomerId, CustomerName, BusinessName, Address, ContactEmail1, 
        ContactPhone1, ContactWebsite, GSTClassification, TaxGSTINNo, 
        LocalityId, CreatedOn
      ) 
      VALUES 
      (
        @CustomerId, @CustomerName, @BusinessName, @Address, @ContactEmail1, 
        @ContactPhone1, @ContactWebsite, @GSTClassification, @TaxGSTINNo, 
        @LocalityId, GETDATE()
      );
    `;

    await pool.request()
      .input('CustomerId', sql.Char, nextCustomerId)
      .input('CustomerName', sql.VarChar, CustomerName)
      .input('BusinessName', sql.VarChar, businessName)
      .input('Address', sql.VarChar, address)
      .input('ContactEmail1', sql.VarChar, email)
      .input('ContactPhone1', sql.VarChar, phone)
      .input('ContactWebsite', sql.VarChar, website)
      .input('GSTClassification', sql.Int, GSTClassification)
      .input('TaxGSTINNo', sql.VarChar, taxGSTINNo)
      .input('LocalityId', sql.Char, locality)
      .query(insertQuery);

    res.status(200).send(`Customer added successfully with ID: ${nextCustomerId}`);
  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).send('Error adding customer');
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
router.post('/UpdateCustomer', async (req, res) => {
  try {
    const pool = await connectToDB();
    if (!pool) throw new Error('Database connection failed');

    // Extract customer details from the request body
    const {
      CustomerId,
      CustomerName,
      BusinessName,
      Address,
      Email,
      Phone,
      Website,
      gstTreatment,
      TaxGSTINNo,
      LocalityId,
      ProjectManagerId = '0000000000',
    } = req.body;

    if (!CustomerId) {
      return res.status(400).json({ message: 'Customer ID is required for update' });
    }

    // Execute the stored procedure ProcMstCustomerUpdate
    await pool.request()
      .input('cCustomerID', CustomerId)
      .input('cCustomerName', CustomerName)
      .input('cBusinessName', BusinessName)
      .input('cAddress', Address)
      .input('cContactEmail1', Email)
      .input('cContactPhone1', Phone)
      .input('cContactWebsite', Website)
      .input('cGSTClassification', gstTreatment)
      .input('cTaxGSTINNo', TaxGSTINNo)
      .input('cLocalityId', LocalityId)
      .input('cProjectManagerId', ProjectManagerId)
      .execute('ProcMstCustomerUpdate');

    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    console.error('Error updating customer data:', error.message);
    res.status(500).json({ message: 'Error updating customer data', error: error.message });
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

module.exports = router;

