/**
 * seedAdmin.js
 * Run once to create the superadmin user in the new database.
 * Usage: node src/scripts/seedAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ADMIN = {
  title: 'Dr',
  firstName: 'Super',
  lastName: 'Admin',
  gender: 'Other',
  organization: 'KMSF',
  profession: 'Administrator',
  email: 'admin@kmsf-uk.org',
  password: 'Admin@KMSF2025!',
  speciality: 'Administration',
  telephone: '+441234567890',
  addressLine1: 'KMSF HQ',
  city: 'London',
  country: 'United Kingdom',
  postCode: 'SW1A 1AA',
  role: 'admin',
  membershipStatus: 'active',
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log('ℹ️  Admin user already exists:', ADMIN.email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(ADMIN.password, 12);

    const admin = new User({
      ...ADMIN,
      email: ADMIN.email.toLowerCase(),
      password: hashedPassword,
    });

    await admin.save();
    console.log('🎉 Superadmin created successfully!');
    console.log('   Email   :', ADMIN.email);
    console.log('   Password:', ADMIN.password);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
})();
