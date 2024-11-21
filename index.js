// src/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const cusDetails = require('./routes/cusDetails');
const reports = require('./routes/report');
const masterRoutes = require('./routes/master');
const bodyParser = require('body-parser');
const departmentRoutes = require('./routes/department');
const categoryRoutes = require('./routes/category');
const subcategoryRoutes = require('./routes/subcategory');
// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());            // Enable CORS for cross-origin requests
app.use(express.json());     // Parse JSON requests
app.use(bodyParser.json());
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/verify', cusDetails);
app.use('/api/reports', reports );

app.use('/api/master', masterRoutes);
app.use('/api/department', departmentRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/subcategory', subcategoryRoutes);

// Basic route to check if server is running
app.get('/', (req, res) => {
  res.send('ERP API is running');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
