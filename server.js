const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// Routes
const authRoutes = require('./routes/auth');
const cusDetails = require('./routes/cusDetails');
const reports = require('./routes/report');
const masterRoutes = require('./routes/master');
const departmentRoutes = require('./routes/department');
const categoryRoutes = require('./routes/category');
const subcategoryRoutes = require('./routes/subcategory');

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000', // Local frontend during development
  'https://reportapp-ruby.vercel.app', // Deployed frontend URL,
   'https://reportapp-learneryashs-projects.vercel.app',
   'https://reportapp-ruby.vercel.app/login'
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

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(bodyParser.json());

// Routes
app.use('/auth', authRoutes);
app.use('/verify', cusDetails);
app.use('/reports', reports);
app.use('/master', masterRoutes);
app.use('/department', departmentRoutes);
app.use('/category', categoryRoutes);
app.use('/subcategory', subcategoryRoutes);

// Basic route to check if server is running
app.get('/', (req, res) => {
  res.send('ERP API is running');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
