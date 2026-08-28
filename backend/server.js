const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/citizens',      require('./routes/citizen'));
app.use('/api/volunteers',    require('./routes/volunteer'));
app.use('/api/emergencies',   require('./routes/emergency'));
app.use('/api/ambulance',     require('./routes/ambulance'));
app.use('/api/doctors',       require('./routes/doctor'));
app.use('/api/hospitals',     require('./routes/hospital'));
app.use('/api/education',     require('./routes/education'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/admin',         require('./routes/admin'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🚨 Alert Life API Running', version: '1.0.0', status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Alert Life Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
