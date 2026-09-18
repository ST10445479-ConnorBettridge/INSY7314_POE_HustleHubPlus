const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');

const getTestUri = () =>
  fs.readFileSync(path.join(__dirname, '.test-mongodb-uri'), 'utf8').trim();

const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB(getTestUri());
  }
};

const cleanDB = async () => {
  await mongoose.connection.db.dropDatabase();
  // Rebuild indexes after the drop so unique constraints are enforced.
  await Promise.all([
    mongoose.model('User').init(),
    mongoose.model('Gig').init(),
    mongoose.model('Booking').init(),
    mongoose.model('Transaction').init(),
  ]);
};

const disconnectTestDB = async () => {
  await disconnectDB();
};

module.exports = { connectTestDB, cleanDB, disconnectTestDB, getTestUri };