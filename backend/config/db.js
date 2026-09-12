const supabase = require('./supabase');

const connectDB = async () => {
  console.log('✅ Supabase PostgreSQL configuration active');
  return supabase;
};

module.exports = connectDB;
