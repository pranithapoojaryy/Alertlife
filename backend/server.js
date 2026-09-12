const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Define API router
const apiRouter = express.Router();
apiRouter.use('/auth',          require('./routes/auth'));
apiRouter.use('/citizens',      require('./routes/citizen'));
apiRouter.use('/volunteers',    require('./routes/volunteer'));
apiRouter.use('/emergencies',   require('./routes/emergency'));
apiRouter.use('/ambulance',     require('./routes/ambulance'));
apiRouter.use('/doctors',       require('./routes/doctor'));
apiRouter.use('/hospitals',     require('./routes/hospital'));
apiRouter.use('/education',     require('./routes/education'));
apiRouter.use('/events',        require('./routes/events'));
apiRouter.use('/notifications', require('./routes/notifications'));
apiRouter.use('/reports',       require('./routes/reports'));
apiRouter.use('/admin',         require('./routes/admin'));

apiRouter.get('/', (req, res) => {
  res.json({ message: '🚨 Alert Life API Running (Supabase PostgreSQL)', version: '1.0.0', status: 'OK' });
});

// Mount router on both '/api' and '/' for complete rewrite flexibility
app.use('/api', apiRouter);
app.use(apiRouter);

// Root health check
app.get('/', (req, res) => {
  res.json({ message: '🚨 Alert Life API Running (Supabase PostgreSQL)', version: '1.0.0', status: 'OK' });
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

// Start listener only when run directly as standalone script
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Alert Life Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: Supabase PostgreSQL`);
  });
}

module.exports = app;
