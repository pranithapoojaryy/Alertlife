/**
 * AlertLink – Full Atlas Seeder
 * Run: node seed-atlas.js
 * Clears and re-seeds ALL collections in the alertlink Atlas database.
 */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

// ─── Model imports ────────────────────────────────────────────────────────────
const User                = require('./models/User');
const Citizen             = require('./models/Citizen');
const Volunteer           = require('./models/Volunteer');
const Hospital            = require('./models/Hospital');
const Doctor              = require('./models/Doctor');
const EmergencyRequest    = require('./models/EmergencyRequest');
const VolunteerAssignment = require('./models/VolunteerAssignment');
const AmbulanceRequest    = require('./models/AmbulanceRequest');
const DoctorConsultation  = require('./models/DoctorConsultation');
const Notification        = require('./models/Notification');
const EducationalContent  = require('./models/EducationalContent');
const AwarenessEvent      = require('./models/AwarenessEvent');

const MONGO_URI = process.env.MONGO_URI;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hashPw = (pw) => bcrypt.hash(pw, 12);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);
const hoursAgo = (n) => new Date(Date.now() - n * 3_600_000);

async function seed() {
  console.log('\n🌐 Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected: ${mongoose.connection.host}`);

  // ── Drop all collections ──────────────────────────────────────────────────
  console.log('\n🗑️  Clearing existing data...');
  const toDrop = [
    User, Citizen, Volunteer, Hospital, Doctor,
    EmergencyRequest, VolunteerAssignment, AmbulanceRequest,
    DoctorConsultation, Notification, EducationalContent, AwarenessEvent,
  ];
  for (const M of toDrop) {
    try { await M.deleteMany({}); } catch {}
  }
  console.log('✅ All collections cleared');

  // ════════════════════════════════════════════════════════════════════
  // 1. USERS
  // ════════════════════════════════════════════════════════════════════
  console.log('\n👤 Creating users...');

  const pw = await hashPw('password123');

  const usersData = [
    // ── Admins ──
    { name: 'System Admin',       email: 'admin@alertlife.com',     role: 'admin',     phone: '9999999999', isVerified: true,  isActive: true },

    // ── Citizens ──
    { name: 'Amit Patel',         email: 'citizen@alertlife.com',   role: 'citizen',   phone: '9876543210', isVerified: true,  isActive: true },
    { name: 'Priya Sharma',       email: 'priya@alertlife.com',     role: 'citizen',   phone: '9876543211', isVerified: true,  isActive: true },
    { name: 'Rahul Verma',        email: 'rahul@alertlife.com',     role: 'citizen',   phone: '9876543212', isVerified: true,  isActive: true },
    { name: 'Sneha Reddy',        email: 'sneha@alertlife.com',     role: 'citizen',   phone: '9876543213', isVerified: true,  isActive: true },

    // ── Volunteers ──
    { name: 'Rohan Sharma',       email: 'volunteer@alertlife.com', role: 'volunteer', phone: '9876500000', isVerified: true,  isActive: true },
    { name: 'Arun Kumar',         email: 'arun@alertlife.com',      role: 'volunteer', phone: '9876500001', isVerified: true,  isActive: true },
    { name: 'Divya Suresh',       email: 'divya@alertlife.com',     role: 'volunteer', phone: '9876500002', isVerified: true,  isActive: true },
    { name: 'Kumar Rajesh',       email: 'kumar@alertlife.com',     role: 'volunteer', phone: '9876500003', isVerified: false, isActive: true },
    { name: 'Karthik Bhat',       email: 'karthik@alertlife.com',   role: 'volunteer', phone: '9876500004', isVerified: true,  isActive: true },
    { name: 'Sandeep Rao',        email: 'sandeep@alertlife.com',   role: 'volunteer', phone: '9876500005', isVerified: true,  isActive: true },
    { name: 'Swathi Naik',        email: 'swathi@alertlife.com',     role: 'volunteer', phone: '9876500006', isVerified: true,  isActive: true },
    { name: 'Aditi Shetty',       email: 'aditi@alertlife.com',     role: 'volunteer', phone: '9876500007', isVerified: true,  isActive: true },
    { name: 'Vikram Prabhu',      email: 'vikram@alertlife.com',    role: 'volunteer', phone: '9876500008', isVerified: true,  isActive: true },
    { name: 'Pooja Hegde',        email: 'pooja@alertlife.com',     role: 'volunteer', phone: '9876500009', isVerified: true,  isActive: true },
    { name: 'Ananya Pai',         email: 'ananya@alertlife.com',    role: 'volunteer', phone: '9876500010', isVerified: true,  isActive: true },
    { name: 'Manoj Kamath',       email: 'manoj@alertlife.com',     role: 'volunteer', phone: '9876500011', isVerified: true,  isActive: true },
    { name: 'Shwetha Shenoy',     email: 'shwetha@alertlife.com',   role: 'volunteer', phone: '9876500012', isVerified: true,  isActive: true },
    { name: 'Deepak Kini',        email: 'deepak@alertlife.com',    role: 'volunteer', phone: '9876500013', isVerified: true,  isActive: true },

    // ── Hospitals ──
    { name: 'Metro City Hospital', email: 'hospital@alertlife.com', role: 'hospital',  phone: '9876500111', isVerified: true,  isActive: true },
    { name: 'Apollo Care Centre',  email: 'apollo@alertlife.com',   role: 'hospital',  phone: '9876500112', isVerified: true,  isActive: true },
    { name: 'Kasturba Hospital',   email: 'manipal@alertlife.com',  role: 'hospital',  phone: '9876500113', isVerified: true,  isActive: true },
    { name: 'Adarsha Hospital',    email: 'adarsha@alertlife.com',  role: 'hospital',  phone: '9876500114', isVerified: true,  isActive: true },

    // ── Doctors ──
    { name: 'Dr. Neha Gupta',     email: 'doctor@alertlife.com',   role: 'doctor',    phone: '9876500222', isVerified: true,  isActive: true },
    { name: 'Dr. Ramesh Nair',    email: 'ramesh@alertlife.com',   role: 'doctor',    phone: '9876500223', isVerified: true,  isActive: true },
    { name: 'Dr. Priya Rao',      email: 'priyarao@alertlife.com', role: 'doctor',    phone: '9876500224', isVerified: true,  isActive: true },
    { name: 'Dr. Rajesh Kumar',   email: 'rajesh@alertlife.com',   role: 'doctor',    phone: '9876500225', isVerified: true,  isActive: true },
    { name: 'Dr. Suresh Chandra',  email: 'suresh@alertlife.com',   role: 'doctor',    phone: '9876500226', isVerified: true,  isActive: true },
  ];

  const users = await User.insertMany(usersData.map(u => ({ ...u, password: pw })));
  console.log(`✅ Created ${users.length} users`);

  const findUser = (email) => users.find(u => u.email === email);
  const admin     = findUser('admin@alertlife.com');
  const citizen1  = findUser('citizen@alertlife.com');
  const citizen2  = findUser('priya@alertlife.com');
  const citizen3  = findUser('rahul@alertlife.com');
  const citizen4  = findUser('sneha@alertlife.com');
  const vol1      = findUser('volunteer@alertlife.com');
  const vol2      = findUser('arun@alertlife.com');
  const vol3      = findUser('divya@alertlife.com');
  const vol4      = findUser('kumar@alertlife.com');
  const vol5      = findUser('karthik@alertlife.com');
  const vol6      = findUser('sandeep@alertlife.com');
  const vol7      = findUser('swathi@alertlife.com');
  const vol8      = findUser('aditi@alertlife.com');
  const vol9      = findUser('vikram@alertlife.com');
  const vol10     = findUser('pooja@alertlife.com');
  const vol11     = findUser('ananya@alertlife.com');
  const vol12     = findUser('manoj@alertlife.com');
  const vol13     = findUser('shwetha@alertlife.com');
  const vol14     = findUser('deepak@alertlife.com');
  const hosp1     = findUser('hospital@alertlife.com');
  const hosp2     = findUser('apollo@alertlife.com');
  const hosp3     = findUser('manipal@alertlife.com');
  const hosp4     = findUser('adarsha@alertlife.com');
  const doc1      = findUser('doctor@alertlife.com');
  const doc2      = findUser('ramesh@alertlife.com');
  const doc3      = findUser('priyarao@alertlife.com');
  const doc4      = findUser('rajesh@alertlife.com');
  const doc5      = findUser('suresh@alertlife.com');

  // ════════════════════════════════════════════════════════════════════
  // 2. CITIZEN PROFILES
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🙍 Creating citizen profiles...');
  await Citizen.insertMany([
    { userId: citizen1._id, bloodGroup: 'O+',  dateOfBirth: new Date('1995-05-15'), gender: 'Male',   address: { street: 'Main Road', city: 'Udupi',   state: 'Karnataka', pincode: '576101' }, currentLocation: { latitude: 13.3409, longitude: 74.7421 } },
    { userId: citizen2._id, bloodGroup: 'B+',  dateOfBirth: new Date('1998-11-22'), gender: 'Female', address: { street: 'Tiger Circle',   city: 'Manipal',   state: 'Karnataka', pincode: '576104' }, currentLocation: { latitude: 13.3524, longitude: 74.7865 } },
    { userId: citizen3._id, bloodGroup: 'A+',  dateOfBirth: new Date('1990-03-08'), gender: 'Male',   address: { street: 'Hampankatta', city: 'Mangalore',   state: 'Karnataka', pincode: '575001' }, currentLocation: { latitude: 12.9141, longitude: 74.8560 } },
    { userId: citizen4._id, bloodGroup: 'AB-', dateOfBirth: new Date('2000-07-30'), gender: 'Female', address: { street: 'End Point Road', city: 'Manipal', state: 'Karnataka', pincode: '576104' }, currentLocation: { latitude: 13.3480, longitude: 74.7920 } },
  ]);
  console.log('✅ Citizen profiles created');

  // ════════════════════════════════════════════════════════════════════
  // 3. VOLUNTEER PROFILES
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🙋 Creating volunteer profiles...');
  await Volunteer.insertMany([
    { userId: vol1._id, certificationNumber: 'VOL-CERT-8872', skills: ['CPR', 'First Aid', 'Choking Relief'],  availabilityStatus: 'available', serviceRadius: 5,  currentLocation: { latitude: 13.3420, longitude: 74.7460 }, isVerified: true,  totalEmergenciesHandled: 24, rating: 4.8, experience: 3 },
    { userId: vol2._id, certificationNumber: 'VOL-CERT-9901', skills: ['CPR', 'Trauma Care', 'AED'],          availabilityStatus: 'available', serviceRadius: 7,  currentLocation: { latitude: 13.3530, longitude: 74.7870 }, isVerified: true,  totalEmergenciesHandled: 38, rating: 4.9, experience: 5 },
    { userId: vol3._id, certificationNumber: 'VOL-CERT-1123', skills: ['First Aid', 'CPR'],                    availabilityStatus: 'offline',   serviceRadius: 3,  currentLocation: { latitude: 12.9150, longitude: 74.8580 }, isVerified: true,  totalEmergenciesHandled: 12, rating: 4.6, experience: 2 },
    { userId: vol4._id, certificationNumber: 'VOL-CERT-3344', skills: ['First Aid'],                           availabilityStatus: 'offline',   serviceRadius: 4,  currentLocation: { latitude: 13.3510, longitude: 74.7810 }, isVerified: false, totalEmergenciesHandled: 0,  rating: 0,   experience: 0 },
    { userId: vol5._id, certificationNumber: 'VOL-CERT-5566', skills: ['CPR', 'First Aid'],                    availabilityStatus: 'available', serviceRadius: 5,  currentLocation: { latitude: 13.3430, longitude: 74.7440 }, isVerified: true,  totalEmergenciesHandled: 10, rating: 4.5, experience: 1 },
    { userId: vol6._id, certificationNumber: 'VOL-CERT-6677', skills: ['AED', 'CPR'],                          availabilityStatus: 'available', serviceRadius: 6,  currentLocation: { latitude: 13.3540, longitude: 74.7880 }, isVerified: true,  totalEmergenciesHandled: 15, rating: 4.7, experience: 2 },
    { userId: vol7._id, certificationNumber: 'VOL-CERT-7788', skills: ['Trauma Care', 'First Aid'],             availabilityStatus: 'available', serviceRadius: 5,  currentLocation: { latitude: 12.9160, longitude: 74.8590 }, isVerified: true,  totalEmergenciesHandled: 8,  rating: 4.4, experience: 1 },
    { userId: vol8._id, certificationNumber: 'VOL-CERT-8899', skills: ['CPR', 'Choking Relief'],               availabilityStatus: 'available', serviceRadius: 4,  currentLocation: { latitude: 13.3390, longitude: 74.7430 }, isVerified: true,  totalEmergenciesHandled: 12, rating: 4.6, experience: 2 },
    { userId: vol9._id, certificationNumber: 'VOL-CERT-9910', skills: ['First Aid', 'AED'],                    availabilityStatus: 'available', serviceRadius: 5,  currentLocation: { latitude: 13.3500, longitude: 74.7820 }, isVerified: true,  totalEmergenciesHandled: 20, rating: 4.8, experience: 3 },
    { userId: vol10._id, certificationNumber: 'VOL-CERT-1011', skills: ['CPR', 'Trauma Care'],                 availabilityStatus: 'available', serviceRadius: 5,  currentLocation: { latitude: 12.9120, longitude: 74.8540 }, isVerified: true,  totalEmergenciesHandled: 5,  rating: 4.2, experience: 1 },
    { userId: vol11._id, certificationNumber: 'VOL-CERT-1112', skills: ['First Aid'],                           availabilityStatus: 'available', serviceRadius: 4,  currentLocation: { latitude: 13.3450, longitude: 74.7480 }, isVerified: true,  totalEmergenciesHandled: 7,  rating: 4.5, experience: 1 },
    { userId: vol12._id, certificationNumber: 'VOL-CERT-1213', skills: ['CPR', 'AED', 'First Aid'],            availabilityStatus: 'available', serviceRadius: 6,  currentLocation: { latitude: 13.3560, longitude: 74.7900 }, isVerified: true,  totalEmergenciesHandled: 18, rating: 4.7, experience: 2 },
    { userId: vol13._id, certificationNumber: 'VOL-CERT-1314', skills: ['Choking Relief', 'CPR'],              availabilityStatus: 'available', serviceRadius: 5,  currentLocation: { latitude: 12.9180, longitude: 74.8600 }, isVerified: true,  totalEmergenciesHandled: 9,  rating: 4.6, experience: 1 },
    { userId: vol14._id, certificationNumber: 'VOL-CERT-1415', skills: ['Trauma Care', 'CPR'],                 availabilityStatus: 'available', serviceRadius: 5,  currentLocation: { latitude: 13.3490, longitude: 74.7830 }, isVerified: true,  totalEmergenciesHandled: 22, rating: 4.9, experience: 4 },
  ]);
  console.log('✅ Volunteer profiles created');

  // ════════════════════════════════════════════════════════════════════
  // 4. HOSPITAL PROFILES
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🏥 Creating hospital profiles...');
  const createdHospitals = await Hospital.insertMany([
    {
      userId: hosp1._id,
      hospitalName: 'Metro City General Hospital',
      registrationNumber: 'HOSP-METRO-99',
      address: { street: '456 Medical Avenue', city: 'Chennai', state: 'Tamil Nadu', pincode: '600003' },
      location: { latitude: 13.0950, longitude: 80.2650 },
      contactNumber: '044-23456789',
      totalBeds: 120,
      availableBeds: 45,
      ambulances: [
        { vehicleNumber: 'TN-01-AM-9999', driverName: 'Suresh Kumar',  driverPhone: '9840123456', status: 'available', currentLocation: { latitude: 13.0950, longitude: 80.2650 } },
        { vehicleNumber: 'TN-01-AM-8888', driverName: 'Manish Singh',  driverPhone: '9840987654', status: 'available', currentLocation: { latitude: 13.0900, longitude: 80.2700 } }
      ],
      specialties: ['Cardiology', 'Emergency Care', 'Trauma Surgery', 'Pediatrics'],
      isVerified: true,
    },
    {
      userId: hosp2._id,
      hospitalName: 'Apollo Speciality Hospital',
      registrationNumber: 'HOSP-APOLLO-10',
      address: { street: 'Greams Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600006' },
      location: { latitude: 13.0600, longitude: 80.2500 },
      contactNumber: '044-12345678',
      totalBeds: 250,
      availableBeds: 80,
      ambulances: [
        { vehicleNumber: 'TN-01-AM-7777', driverName: 'Ravi Shankar',  driverPhone: '9840555123', status: 'available', currentLocation: { latitude: 13.0600, longitude: 80.2500 } }
      ],
      specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
      isVerified: true,
    },
    {
      userId: hosp3._id,
      hospitalName: 'Kasturba Hospital Manipal',
      registrationNumber: 'HOSP-MANIPAL-42',
      address: { street: 'Madhav Nagar', city: 'Manipal', state: 'Karnataka', pincode: '576104' },
      location: { latitude: 13.3520, longitude: 74.7890 },
      contactNumber: '0820-2922761',
      totalBeds: 220,
      availableBeds: 52,
      ambulances: [
        { vehicleNumber: 'KA-20-M-1111', driverName: 'Deepak Raj', driverPhone: '9841000100', status: 'available', currentLocation: { latitude: 13.3520, longitude: 74.7890 } },
        { vehicleNumber: 'KA-20-M-2222', driverName: 'Arjun Das',  driverPhone: '9841000200', status: 'available', currentLocation: { latitude: 13.3530, longitude: 74.7850 } }
      ],
      specialties: ['Orthopedics', 'Emergency Care', 'ICU', 'Cardiology', 'Neurology'],
      isVerified: true,
    },
    {
      userId: hosp4._id,
      hospitalName: 'Adarsha Hospital Udupi',
      registrationNumber: 'HOSP-ADARSHA-99',
      address: { street: 'Court Road', city: 'Udupi', state: 'Karnataka', pincode: '576101' },
      location: { latitude: 13.3385, longitude: 74.7485 },
      contactNumber: '0820-2521234',
      totalBeds: 350,
      availableBeds: 87,
      ambulances: [
        { vehicleNumber: 'KA-20-M-9999', driverName: 'Suresh Kumar',  driverPhone: '9840123456', status: 'available', currentLocation: { latitude: 13.3385, longitude: 74.7485 } }
      ],
      specialties: ['Cardiology', 'Emergency Care', 'Trauma Surgery', 'Pediatrics', 'Neurology'],
      isVerified: true,
    }
  ]);
  console.log('✅ Hospital profiles created');

  // ════════════════════════════════════════════════════════════════════
  // 5. DOCTOR PROFILES
  // ════════════════════════════════════════════════════════════════════
  console.log('\n👨‍⚕️ Creating doctor profiles...');
  await Doctor.insertMany([
    { userId: doc1._id, hospitalId: createdHospitals[0]._id, specialization: 'Emergency Care & Cardiology', licenseNumber: 'MCI-REG-5563', experience: 8,  availability: 'available', consultationTypes: ['audio', 'video', 'chat'], isVerified: true },
    { userId: doc2._id, hospitalId: createdHospitals[0]._id, specialization: 'Pediatrics',                  licenseNumber: 'MCI-REG-7712', experience: 12, availability: 'available', consultationTypes: ['audio', 'video'],         isVerified: true },
    { userId: doc3._id, hospitalId: createdHospitals[2]._id, specialization: 'Cardiology & Neurology',        licenseNumber: 'MCI-REG-9911', experience: 15, availability: 'available', consultationTypes: ['audio', 'video', 'chat'], isVerified: true },
    { userId: doc4._id, hospitalId: createdHospitals[3]._id, specialization: 'Emergency Care',                licenseNumber: 'MCI-REG-4433', experience: 6,  availability: 'available', consultationTypes: ['audio', 'video'],         isVerified: true },
    { userId: doc5._id, hospitalId: createdHospitals[1]._id, specialization: 'Neurology',                         licenseNumber: 'MCI-REG-5522', experience: 10, availability: 'available', consultationTypes: ['audio', 'video', 'chat'], isVerified: true },
  ]);
  console.log('✅ Doctor profiles created');

  // ════════════════════════════════════════════════════════════════════
  // 6. EMERGENCY REQUESTS (realistic history)
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🚨 Creating emergency requests...');
  const emergencies = await EmergencyRequest.insertMany([
    {
      citizenId: citizen1._id,
      location: { latitude: 13.3409, longitude: 74.7421, address: 'Udupi Main Road, Udupi' },
      emergencyType: 'cardiac_arrest', severity: 'critical',
      description: 'Person collapsed, unresponsive, no pulse.',
      status: 'resolved', resolvedAt: hoursAgo(2),
      createdAt: hoursAgo(3),
    },
    {
      citizenId: citizen2._id,
      location: { latitude: 13.3524, longitude: 74.7865, address: 'Tiger Circle, Manipal' },
      emergencyType: 'accident', severity: 'high',
      description: 'Road accident, multiple injuries.',
      status: 'resolved', resolvedAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    {
      citizenId: citizen3._id,
      location: { latitude: 12.9141, longitude: 74.8560, address: 'Hampankatta, Mangalore' },
      emergencyType: 'stroke', severity: 'critical',
      description: 'Sudden loss of speech and arm weakness.',
      status: 'in_progress',
      createdAt: hoursAgo(1),
    },
    {
      citizenId: citizen4._id,
      location: { latitude: 13.3480, longitude: 74.7920, address: 'Manipal Lake, Manipal' },
      emergencyType: 'breathing', severity: 'high',
      description: 'Severe asthma attack, struggling to breathe.',
      status: 'assigned',
      createdAt: hoursAgo(0.5),
    },
    {
      citizenId: citizen1._id,
      location: { latitude: 13.3450, longitude: 74.7550, address: 'Kadiyali, Udupi' },
      emergencyType: 'seizure', severity: 'critical',
      description: 'Grand mal seizure lasting 5 minutes.',
      status: 'pending',
      createdAt: new Date(),
    },
    {
      citizenId: citizen2._id,
      location: { latitude: 13.3480, longitude: 74.7040, address: 'Malpe Beach, Udupi' },
      emergencyType: 'other', severity: 'medium',
      description: 'High fever with severe dehydration.',
      status: 'resolved', resolvedAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
    {
      citizenId: citizen3._id,
      location: { latitude: 13.0080, longitude: 74.7960, address: 'Surathkal, Mangalore' },
      emergencyType: 'cardiac_arrest', severity: 'critical',
      description: 'Chest pain and loss of consciousness.',
      status: 'resolved', resolvedAt: daysAgo(5),
      createdAt: daysAgo(5),
    },
    {
      citizenId: citizen4._id,
      location: { latitude: 13.3600, longitude: 74.7880, address: 'End Point, Manipal' },
      emergencyType: 'accident', severity: 'high',
      description: 'Bicycle accident, head injury suspected.',
      status: 'resolved', resolvedAt: daysAgo(7),
      createdAt: daysAgo(7),
    },
  ]);
  console.log(`✅ Created ${emergencies.length} emergency requests`);

  // ════════════════════════════════════════════════════════════════════
  // 7. VOLUNTEER ASSIGNMENTS
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🙋 Creating volunteer assignments...');
  const assignments = await VolunteerAssignment.insertMany([
    { volunteerId: vol1._id, emergencyId: emergencies[0]._id, status: 'completed', distanceKm: 1.2, respondedAt: hoursAgo(2.8), completedAt: hoursAgo(2), createdAt: hoursAgo(3) },
    { volunteerId: vol2._id, emergencyId: emergencies[1]._id, status: 'completed', distanceKm: 2.5, respondedAt: daysAgo(1),    completedAt: daysAgo(1),    createdAt: daysAgo(1)   },
    { volunteerId: vol1._id, emergencyId: emergencies[2]._id, status: 'accepted',  distanceKm: 0.9, respondedAt: hoursAgo(0.9),                                createdAt: hoursAgo(1)  },
    { volunteerId: vol2._id, emergencyId: emergencies[3]._id, status: 'accepted',  distanceKm: 3.1, respondedAt: hoursAgo(0.4),                                createdAt: hoursAgo(0.5)},
    { volunteerId: vol3._id, emergencyId: emergencies[5]._id, status: 'completed', distanceKm: 1.8, respondedAt: daysAgo(3),    completedAt: daysAgo(3),    createdAt: daysAgo(3)   },
  ]);
  console.log(`✅ Created ${assignments.length} volunteer assignments`);

  // Link assignments to emergencies
  await EmergencyRequest.findByIdAndUpdate(emergencies[0]._id, { assignedVolunteers: [assignments[0]._id], status: 'resolved' });
  await EmergencyRequest.findByIdAndUpdate(emergencies[1]._id, { assignedVolunteers: [assignments[1]._id], status: 'resolved' });
  await EmergencyRequest.findByIdAndUpdate(emergencies[2]._id, { assignedVolunteers: [assignments[2]._id] });
  await EmergencyRequest.findByIdAndUpdate(emergencies[3]._id, { assignedVolunteers: [assignments[3]._id] });

  // ════════════════════════════════════════════════════════════════════
  // 8. AMBULANCE REQUESTS
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🚑 Creating ambulance requests...');
  await AmbulanceRequest.insertMany([
    {
      requestedBy: citizen1._id,
      emergencyId: emergencies[0]._id,
      pickupLocation: { latitude: 13.3409, longitude: 74.7421, address: 'Udupi Main Road, Udupi' },
      hospitalId: hosp1._id,
      ambulanceDetails: { vehicleNumber: 'KA-20-M-9999', driverName: 'Suresh Kumar', driverPhone: '9840123456' },
      status: 'completed',
      dispatchedAt: hoursAgo(2.5),
      arrivedAt: hoursAgo(2.1),
      createdAt: hoursAgo(3),
    },
    {
      requestedBy: citizen2._id,
      emergencyId: emergencies[1]._id,
      pickupLocation: { latitude: 13.3524, longitude: 74.7865, address: 'Tiger Circle, Manipal' },
      hospitalId: hosp1._id,
      ambulanceDetails: { vehicleNumber: 'KA-20-M-8888', driverName: 'Manish Singh', driverPhone: '9840987654' },
      status: 'completed',
      dispatchedAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    {
      requestedBy: citizen3._id,
      emergencyId: emergencies[2]._id,
      pickupLocation: { latitude: 12.9141, longitude: 74.8560, address: 'Hampankatta, Mangalore' },
      hospitalId: hosp2._id,
      status: 'dispatched',
      dispatchedAt: hoursAgo(0.8),
      createdAt: hoursAgo(1),
    },
    {
      requestedBy: citizen4._id,
      emergencyId: emergencies[4]._id,
      pickupLocation: { latitude: 13.3480, longitude: 74.7920, address: 'Manipal Lake, Manipal' },
      hospitalId: hosp1._id,
      status: 'pending',
      createdAt: new Date(),
    },
  ]);
  console.log('✅ Ambulance requests created');

  // ════════════════════════════════════════════════════════════════════
  // 9. DOCTOR CONSULTATIONS
  // ════════════════════════════════════════════════════════════════════
  console.log('\n📞 Creating doctor consultations...');
  await DoctorConsultation.insertMany([
    {
      doctorId: doc1._id,
      volunteerId: vol1._id,
      emergencyId: emergencies[0]._id,
      callType: 'video',
      status: 'completed',
      durationMinutes: 14,
      medicalNotes: 'Guided volunteer through CPR. Patient stabilized.',
      startedAt: hoursAgo(2.8),
      endedAt: hoursAgo(2.6),
      createdAt: hoursAgo(3),
    },
    {
      doctorId: doc2._id,
      volunteerId: vol2._id,
      emergencyId: emergencies[1]._id,
      callType: 'audio',
      status: 'completed',
      durationMinutes: 8,
      medicalNotes: 'Advised on wound management until ambulance arrived.',
      startedAt: daysAgo(1),
      endedAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    {
      doctorId: doc1._id,
      volunteerId: vol1._id,
      emergencyId: emergencies[2]._id,
      callType: 'video',
      status: 'active',
      createdAt: hoursAgo(0.9),
    },
  ]);
  console.log('✅ Doctor consultations created');

  // ════════════════════════════════════════════════════════════════════
  // 10. EDUCATIONAL CONTENT
  // ════════════════════════════════════════════════════════════════════
  console.log('\n📚 Creating educational content...');
  await EducationalContent.insertMany([
    {
      title: 'How to Perform CPR: Step-by-Step Guide',
      description: 'Learn the life-saving cardiopulmonary resuscitation (CPR) technique for adults in 6 simple steps. Covers hand placement, compression depth, rescue breaths and AED usage.',
      category: 'cpr',
      contentType: 'article',
      difficulty: 'beginner',
      tags: ['CPR', 'Cardiac Arrest', 'Basic Life Support', 'AED'],
      author: admin._id,
      isPublished: true,
      views: 1240,
      likes: 580,
    },
    {
      title: 'First Aid for Severe Bleeding',
      description: 'Essential steps to control severe external bleeding using pressure bandages, wound packing, and tourniquets. Know when and how to apply each technique.',
      category: 'first_aid',
      contentType: 'article',
      difficulty: 'intermediate',
      tags: ['First Aid', 'Bleeding', 'Trauma', 'Tourniquet'],
      author: doc1._id,
      isPublished: true,
      views: 890,
      likes: 320,
    },
    {
      title: 'Choking First Aid (Heimlich Maneuver)',
      description: 'Detailed instructions on assisting a choking adult, child, or infant using abdominal thrusts. Includes back blows technique for infants.',
      category: 'first_aid',
      contentType: 'article',
      difficulty: 'beginner',
      tags: ['Choking', 'Heimlich Maneuver', 'Emergency', 'Infant'],
      author: admin._id,
      isPublished: true,
      views: 2310,
      likes: 950,
    },
    {
      title: 'Recognizing Signs of a Stroke (FAST Method)',
      description: 'Use the FAST method — Face, Arms, Speech, Time — to quickly identify stroke symptoms and take immediate action. Every minute counts.',
      category: 'awareness',
      contentType: 'article',
      difficulty: 'beginner',
      tags: ['Stroke', 'FAST Method', 'Brain', 'Awareness'],
      author: doc2._id,
      isPublished: true,
      views: 1870,
      likes: 740,
    },
    {
      title: 'Using an AED (Automated External Defibrillator)',
      description: 'Step-by-step video guide on how to locate, power on, and use an AED device during cardiac arrest. Covers pad placement and shock delivery.',
      category: 'cpr',
      contentType: 'video',
      difficulty: 'intermediate',
      tags: ['AED', 'Defibrillator', 'Cardiac Arrest', 'Device'],
      author: doc1._id,
      isPublished: true,
      views: 3020,
      likes: 1280,
    },
    {
      title: 'Disaster Preparedness: Home Emergency Kit',
      description: 'What to include in your home emergency kit for natural disasters, power outages, and medical emergencies. Checklist for families and individuals.',
      category: 'awareness',
      contentType: 'article',
      difficulty: 'beginner',
      tags: ['Disaster', 'Emergency Kit', 'Preparedness', 'Family'],
      author: admin._id,
      isPublished: true,
      views: 1560,
      likes: 620,
    },
  ]);
  console.log('✅ Educational content created');

  // ════════════════════════════════════════════════════════════════════
  // 11. AWARENESS EVENTS
  // ════════════════════════════════════════════════════════════════════
  console.log('\n📅 Creating awareness events...');
  const inDays = (n) => new Date(Date.now() + n * 86_400_000);
  await AwarenessEvent.insertMany([
    {
      title: 'Community CPR & BLS Hands-on Training',
      description: 'Free live workshop on Basic Life Support and CPR certified by local medical experts. Practice on mannequins with real AED devices.',
      eventType: 'workshop',
      date: inDays(7),
      time: '10:00 AM',
      duration: '3 Hours',
      venue: 'Metro City Hospital Auditorium',
      isOnline: false,
      organizer: admin._id,
      maxParticipants: 50,
      status: 'upcoming',
    },
    {
      title: 'Cardiac Health & Emergency Preparedness',
      description: 'Webinar on recognizing early warning signs of heart attacks and managing home emergencies before help arrives.',
      eventType: 'webinar',
      date: inDays(3),
      time: '4:00 PM',
      duration: '1.5 Hours',
      isOnline: true,
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      organizer: doc1._id,
      maxParticipants: 200,
      status: 'upcoming',
    },
    {
      title: 'First Aid Certification Drive – Chennai South',
      description: 'Get certified in Basic First Aid in one day. Open to all community members above 16 years. Certificate issued upon completion.',
      eventType: 'seminar',
      date: inDays(14),
      time: '9:00 AM',
      duration: '6 Hours',
      venue: 'Apollo Care Centre Conference Hall',
      isOnline: false,
      organizer: hosp2._id,
      maxParticipants: 80,
      status: 'upcoming',
    },
    {
      title: 'Volunteer Recruitment Drive',
      description: 'Are you ready to save lives? Join Alert Life as a certified volunteer. Learn about training, responsibilities, and the application process.',
      eventType: 'seminar',
      date: inDays(10),
      time: '11:00 AM',
      duration: '2 Hours',
      isOnline: true,
      meetingLink: 'https://zoom.us/j/987654321',
      organizer: admin._id,
      maxParticipants: 500,
      status: 'upcoming',
    },
    {
      title: 'Stroke Awareness Walk – Chennai',
      description: 'Join thousands of Chennaikars in the annual Stroke Awareness Walk. Raise awareness and funds for emergency healthcare.',
      eventType: 'seminar',
      date: daysAgo(10),
      time: '6:00 AM',
      duration: '2 Hours',
      venue: 'Marina Beach, Chennai',
      isOnline: false,
      organizer: admin._id,
      maxParticipants: 1000,
      status: 'completed',
    },
  ]);
  console.log('✅ Awareness events created');

  // ════════════════════════════════════════════════════════════════════
  // 12. NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════
  console.log('\n🔔 Creating notifications...');
  const allUsers = [citizen1, citizen2, citizen3, citizen4, vol1, vol2, vol3, vol4, doc1, doc2];
  const notifData = [];
  for (const u of allUsers) {
    notifData.push({
      userId: u._id,
      title: 'Welcome to Alert Life!',
      message: `Welcome ${u.name}! Your account is active. Stay safe and help others.`,
      type: 'system', isRead: false, createdAt: daysAgo(7),
    });
  }
  // Emergency notifications
  notifData.push(
    { userId: citizen1._id, title: 'Emergency Update', message: 'Your SOS (Cardiac Arrest) has been resolved. Volunteer reached on time.', type: 'emergency', isRead: true, createdAt: hoursAgo(2) },
    { userId: vol1._id,     title: '🚨 Emergency Alert',  message: 'New SOS nearby: Cardiac Arrest at Park Street. Accept to respond.',          type: 'emergency', isRead: true, createdAt: hoursAgo(3) },
    { userId: vol2._id,     title: '🚨 Emergency Alert',  message: 'New SOS nearby: Stroke at T. Nagar. Accept to respond.',                    type: 'emergency', isRead: false, createdAt: hoursAgo(1) },
    { userId: doc1._id,     title: 'Consultation Request', message: 'Volunteer Rohan Sharma needs medical guidance. Emergency: Stroke.',           type: 'system',    isRead: false, createdAt: hoursAgo(1) },
    { userId: admin._id,    title: 'New Volunteer Registered', message: 'Kumar Rajesh has registered as a volunteer. Pending verification.',       type: 'system',    isRead: false, createdAt: daysAgo(1) },
  );
  await Notification.insertMany(notifData);
  console.log(`✅ Created ${notifData.length} notifications`);

  // ════════════════════════════════════════════════════════════════════
  // DONE
  // ════════════════════════════════════════════════════════════════════
  console.log('\n');
  console.log('═'.repeat(55));
  console.log('🎉  AlertLink Atlas Seed Complete!');
  console.log('═'.repeat(55));
  console.log('\n📋  Demo Credentials (password: password123)');
  console.log('  👑 Admin     → admin@alertlife.com');
  console.log('  👤 Citizen   → citizen@alertlife.com');
  console.log('  🙋 Volunteer → volunteer@alertlife.com');
  console.log('  🏥 Hospital  → hospital@alertlife.com');
  console.log('  👨‍⚕️ Doctor    → doctor@alertlife.com');
  console.log('\n📊  Data Summary');
  console.log(`  Users: ${users.length}`);
  console.log(`  Emergencies: ${emergencies.length}`);
  console.log(`  Assignments: ${assignments.length}`);
  console.log('═'.repeat(55));

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected. Atlas is fully seeded!\n');
}

seed().catch(err => {
  console.error('\n❌ Seeder failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
