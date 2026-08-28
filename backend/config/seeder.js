const mongoose = require('mongoose');
const User = require('../models/User');
const Citizen = require('../models/Citizen');
const Volunteer = require('../models/Volunteer');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const EducationalContent = require('../models/EducationalContent');
const AwarenessEvent = require('../models/AwarenessEvent');

const demoUsers = [
  {
    name: 'System Admin',
    email: 'admin@alertlife.com',
    password: 'password123',
    phone: '9999999999',
    role: 'admin',
    isVerified: true
  },
  {
    name: 'Amit Patel',
    email: 'citizen@alertlife.com',
    password: 'password123',
    phone: '9876543210',
    role: 'citizen',
    isVerified: true
  },
  {
    name: 'Rohan Sharma',
    email: 'volunteer@alertlife.com',
    password: 'password123',
    phone: '9876500000',
    role: 'volunteer',
    isVerified: true
  },
  {
    name: 'Metro City Hospital',
    email: 'hospital@alertlife.com',
    password: 'password123',
    phone: '9876500111',
    role: 'hospital',
    isVerified: true
  },
  {
    name: 'Dr. Neha Gupta',
    email: 'doctor@alertlife.com',
    password: 'password123',
    phone: '9876500222',
    role: 'doctor',
    isVerified: true
  }
];

const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('ℹ️ Database already has users. Skipping seeder...');
      return;
    }

    console.log('🌱 Seeding default database...');

    // Clear collections just in case
    await User.deleteMany({});
    await Citizen.deleteMany({});
    await Volunteer.deleteMany({});
    await Hospital.deleteMany({});
    await Doctor.deleteMany({});
    await EducationalContent.deleteMany({});
    await AwarenessEvent.deleteMany({});

    // Create users
    const createdUsers = [];
    for (const u of demoUsers) {
      const user = await User.create(u);
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.email} (${user.role})`);
    }

    const adminUser = createdUsers.find(u => u.role === 'admin');
    const citizenUser = createdUsers.find(u => u.role === 'citizen');
    const volunteerUser = createdUsers.find(u => u.role === 'volunteer');
    const hospitalUser = createdUsers.find(u => u.role === 'hospital');
    const doctorUser = createdUsers.find(u => u.role === 'doctor');

    // Create Citizen Profile
    await Citizen.create({
      userId: citizenUser._id,
      bloodGroup: 'O+',
      dateOfBirth: new Date('1995-05-15'),
      gender: 'Male',
      address: {
        street: '123 Park Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001'
      },
      currentLocation: {
        latitude: 13.0827,
        longitude: 80.2707
      }
    });
    console.log('✨ Created Citizen Profile');

    // Create Volunteer Profile
    await Volunteer.create({
      userId: volunteerUser._id,
      certificationNumber: 'VOL-CERT-8872',
      skills: ['CPR', 'First Aid', 'Choking Relief'],
      availabilityStatus: 'available',
      serviceRadius: 5,
      currentLocation: {
        latitude: 13.0897,
        longitude: 80.2600
      },
      isVerified: true,
      totalEmergenciesHandled: 4,
      rating: 4.8,
      experience: 2
    });
    console.log('✨ Created Volunteer Profile');

    // Create Hospital Profile
    await Hospital.create({
      userId: hospitalUser._id,
      hospitalName: 'Metro City General Hospital',
      registrationNumber: 'HOSP-METRO-99',
      address: {
        street: '456 Medical Avenue',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600003'
      },
      location: {
        latitude: 13.0950,
        longitude: 80.2650
      },
      contactNumber: '044-23456789',
      totalBeds: 120,
      availableBeds: 45,
      ambulances: [
        {
          vehicleNumber: 'TN-01-AM-9999',
          driverName: 'Suresh Kumar',
          driverPhone: '9840123456',
          status: 'available',
          currentLocation: { latitude: 13.0950, longitude: 80.2650 }
        },
        {
          vehicleNumber: 'TN-01-AM-8888',
          driverName: 'Manish Singh',
          driverPhone: '9840987654',
          status: 'available',
          currentLocation: { latitude: 13.0900, longitude: 80.2700 }
        }
      ],
      specialties: ['Cardiology', 'Emergency Care', 'Trauma Surgery', 'Pediatrics'],
      isVerified: true
    });
    console.log('✨ Created Hospital Profile');

    // Create Doctor Profile
    await Doctor.create({
      userId: doctorUser._id,
      specialization: 'Emergency Medicine & Cardiology',
      licenseNumber: 'MCI-REG-5563',
      experience: 8,
      availability: 'available',
      consultationTypes: ['audio', 'video', 'chat'],
      isVerified: true
    });
    console.log('✨ Created Doctor Profile');

    // Seed Educational Content
    await EducationalContent.create([
      {
        title: 'How to Perform CPR: Step-by-Step Guide',
        description: 'Learn the life-saving cardiopulmonary resuscitation (CPR) technique for adults in 6 simple steps.',
        category: 'cpr',
        contentType: 'article',
        difficulty: 'beginner',
        tags: ['CPR', 'Cardiac Arrest', 'Basic Life Support'],
        author: adminUser._id,
        isPublished: true,
        views: 124,
        likes: 58
      },
      {
        title: 'First Aid for Severe Bleeding',
        description: 'Essential steps to control severe external bleeding using pressure bandages and tourniquets.',
        category: 'first_aid',
        contentType: 'article',
        difficulty: 'intermediate',
        tags: ['First Aid', 'Bleeding', 'Trauma'],
        author: adminUser._id,
        isPublished: true,
        views: 89,
        likes: 32
      },
      {
        title: 'Choking First Aid (Heimlich Maneuver)',
        description: 'Detailed instructions on how to assist a choking adult, child, or infant using abdominal thrusts.',
        category: 'first_aid',
        contentType: 'article',
        difficulty: 'beginner',
        tags: ['Choking', 'Heimlich Maneuver', 'Emergency'],
        author: adminUser._id,
        isPublished: true,
        views: 231,
        likes: 95
      }
    ]);
    console.log('✨ Seeded Educational Content');

    // Seed Awareness Events
    await AwarenessEvent.create([
      {
        title: 'Community CPR & BLS Hands-on Training',
        description: 'Join us for a free live workshop on Basic Life Support and CPR certified by local medical experts.',
        eventType: 'workshop',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        time: '10:00 AM',
        duration: '2 Hours',
        venue: 'Metro City Hospital Auditorium',
        isOnline: false,
        organizer: adminUser._id,
        maxParticipants: 50,
        status: 'upcoming'
      },
      {
        title: 'Cardiac Health & Emergency Preparedness',
        description: 'Webinar on recognizing early warning signs of heart attacks and managing home emergencies.',
        eventType: 'webinar',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        time: '4:00 PM',
        duration: '1.5 Hours',
        isOnline: true,
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        organizer: doctorUser._id,
        maxParticipants: 200,
        status: 'upcoming'
      }
    ]);
    console.log('✨ Seeded Awareness Events');
    console.log('✅ Database Seeded Successfully');

  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
  }
};

module.exports = seedDatabase;
