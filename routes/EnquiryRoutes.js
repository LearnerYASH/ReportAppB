const express = require('express');
const router = express.Router();
const { connectToDB, sql } = require('../db');

// Get all customers
router.get('/Customer', async (req, res) => {
  try {
    const pool = await connectToDB();
    const query = `
      SELECT TOP (1000)
        CustomerId, CustomerName, BusinessName, ShortName, Address, LocalityId,
        ActiveStatus, ContactEmail1, ContactEmail2, ContactPhone1, ContactPhone2,
        ContactWebsite, IsOnHold, Remarks, AssignedUserId, AMCUpto, IsPublish,
        Trade, StoreType, HoCount, WhCount, PosCount, SisCount, AutomationArea,
        InstallationType, AdvanceAmount, TotalAmount, PayMode, ChqNo, ChqDate,
        BankName, ImplementationStartDate, ImplementationEndDate, Modules,
        TaxGSTINNo, GSTClassification, ProjectManagerId, PartyMode, IsAmcExtended,
        AmcExtendedDays, AmcExtendedUserId, AmcExtentedOn, LastUpdate, CreatedOn, TS
      FROM [iNextInhouseErp].[dbo].[MstCustomer]
    `;
    const result = await pool.request().query(query);

    // Remove the first row
    const filteredResult = result.recordset.slice(1);

    res.json(filteredResult);
  } catch (error) {
    console.error('Error fetching customer data:', error);
    res.status(500).send('Error fetching customer data');
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


module.exports = router;

