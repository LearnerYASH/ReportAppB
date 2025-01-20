const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
// Routes
const authRoutes = require('./routes/auth');
const cusDetails = require('./routes/cusDetails');
const reports = require('./routes/report');
const EnquiryRoutes = require('./routes/EnquiryRoutes');
const departmentRoutes = require('./routes/department');
const categoryRoutes = require('./routes/category');
const subcategoryRoutes = require('./routes/subcategory');
const User = require('./routes/UserMaster');

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000', // Local frontend during development
  'https://register-f.vercel.app',
  'https://report-app-f.vercel.app/',
  'https://report-app-f.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, // Allow credentials (cookies/authorization headers)
}));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(bodyParser.json());

// Routes
app.use('/auth', authRoutes);
app.use('/verify', cusDetails);
app.use('/reports', reports);
app.use('/CustomerEnq', EnquiryRoutes);
app.use('/UserMaster', User);
app.use('/department', departmentRoutes);
app.use('/category', categoryRoutes);
app.use('/subcategory', subcategoryRoutes);

// Basic route to check if server is running
app.get('/', (req, res) => {
  res.send('ERP API is running');
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
