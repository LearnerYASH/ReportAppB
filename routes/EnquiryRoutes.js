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

module.exports = router;

