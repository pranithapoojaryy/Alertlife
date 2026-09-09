const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('./models/User');
const Citizen = require('./models/Citizen');
const Volunteer = require('./models/Volunteer');
const EmergencyRequest = require('./models/EmergencyRequest');
const AmbulanceRequest = require('./models/AmbulanceRequest');
const VolunteerAssignment = require('./models/VolunteerAssignment');
const Notification = require('./models/Notification');
const DoctorConsultation = require('./models/DoctorConsultation');

async function cleanDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Delete all non-admin users (citizens, test volunteers, dummy responders)
    const delCitizens = await Citizen.deleteMany({});
    const delVolunteers = await Volunteer.deleteMany({});
    const delEmergencies = await EmergencyRequest.deleteMany({});
    const delAmbulance = await AmbulanceRequest.deleteMany({});
    const delAssignments = await VolunteerAssignment.deleteMany({});
    const delConsults = await DoctorConsultation.deleteMany({});
    const delNotifications = await Notification.deleteMany({});
    
    // Delete all users except main admin
    const delUsers = await User.deleteMany({ email: { $ne: 'admin@alertlife.com' } });

    console.log('Purged:');
    console.log(`- ${delUsers.deletedCount} dummy users deleted`);
    console.log(`- ${delCitizens.deletedCount} citizen profiles cleared`);
    console.log(`- ${delVolunteers.deletedCount} volunteer profiles cleared`);
    console.log(`- ${delEmergencies.deletedCount} emergency requests cleared`);
    console.log(`- ${delAmbulance.deletedCount} ambulance requests cleared`);
    console.log(`- ${delAssignments.deletedCount} volunteer assignments cleared`);
    console.log(`- ${delConsults.deletedCount} doctor consultations cleared`);
    console.log(`- ${delNotifications.deletedCount} notifications cleared`);

    // Ensure clean admin user exists
    let admin = await User.findOne({ email: 'admin@alertlife.com' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      admin = await User.create({
        name: 'System Admin',
        email: 'admin@alertlife.com',
        phone: '9999999999',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        isActive: true
      });
      console.log('Created clean System Admin (admin@alertlife.com / password123)');
    } else {
      console.log('System Admin account preserved (admin@alertlife.com)');
    }

    console.log('\n🎉 Database is now completely clean and ready for new data!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning database:', err);
    process.exit(1);
  }
}

cleanDatabase();
