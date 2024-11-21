import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Routes
import authRoutes from './routes/auth';
import cusDetails from './routes/cusDetails';
import reports from './routes/report';
import masterRoutes from './routes/master';
import departmentRoutes from './routes/department';
import categoryRoutes from './routes/category';
import subcategoryRoutes from './routes/subcategory';

// Load environment variables
config();

const app = express();

// CORS Configuration
const allowedOrigins = ['https://reportapp-ruby.vercel.app'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, // If using cookies or Authorization headers
}));

// Middleware
app.use(express.json()); // Parse JSON requests (no need for body-parser)

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
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
