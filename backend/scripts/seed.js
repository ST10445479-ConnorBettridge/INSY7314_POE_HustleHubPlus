require('dotenv').config({ quiet: true });
const fs = require('fs');
const { connectDB, disconnectDB, URI_FILE } = require('../src/config/db');
const User = require('../src/models/user');
const Gig = require('../src/models/gig');
const Booking = require('../src/models/booking');
const Transaction = require('../src/models/transaction');
const crypto = require('crypto');

const run = async () => {
  // If a server is already running (its URI is recorded), seed THAT live
  // instance so the demo data appears immediately in the app.
  let liveUri;
  if (fs.existsSync(URI_FILE)) {
    liveUri = fs.readFileSync(URI_FILE, 'utf8').trim();
    console.log('Seeding the running server instance...');
  }
  await connectDB(process.env.MONGODB_URI || liveUri || undefined);

  if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding is for development only');
  const ensureUser = async data => {
    const existing = await User.findByEmail(data.email);
    if (existing) return existing.toSafeObject();
    return User.createUser(data);
  };

  const freelancer = await ensureUser({
    name: 'Zane Designer',
    email: 'zane@hustlehub.demo',
    password: 'DemoPass1!',
    role: 'freelancer',
  });
  const freelancer2 = await ensureUser({
    name: 'Mia Developer',
    email: 'mia@hustlehub.demo',
    password: 'DemoPass1!',
    role: 'freelancer',
  });
  const client = await ensureUser({
    name: 'Alex Client',
    email: 'alex@hustlehub.demo',
    password: 'DemoPass1!',
    role: 'client',
  });

  const gigsData = [
    {
      title: 'Professional Logo Design',
      description: 'I will design a modern, professional logo for your brand with unlimited revisions and all source files.',
      category: 'Design',
      price: 150,
      deliveryDays: 3,
    },
    {
      title: 'Full-Stack Web Application',
      description: 'End-to-end web application development using React, Node.js and MongoDB with secure authentication built in.',
      category: 'Web Development',
      price: 800,
      deliveryDays: 14,
    },
    {
      title: 'SEO Audit & Content Strategy',
      description: 'A complete SEO audit of your website with keyword research, on-page fixes and a 90-day content plan.',
      category: 'Marketing',
      price: 320,
      deliveryDays: 5,
    },
  ];

  const gigs = [];
  for (const d of gigsData) {
    const gig = await Gig.findOneAndUpdate({ title: d.title, owner: freelancer.id }, { $setOnInsert: { ...d, owner: freelancer.id } }, { upsert: true, returnDocument: 'after' });
    gigs.push(gig);
  }

  const extraGig = await Gig.findOneAndUpdate({ title: 'Mobile App UI Design', owner: freelancer2.id }, { $setOnInsert: {
    title: 'Mobile App UI Design',
    description: 'High-fidelity mobile app interfaces in Figma, including design system and clickable prototype.',
    category: 'Design',
    price: 450,
    deliveryDays: 7,
    owner: freelancer2.id,
  } }, { upsert: true, returnDocument: 'after' });

  const mongoose = require('mongoose');
  await mongoose.connection.transaction(async session => {
    const existing = await Booking.findOne({ gig: gigs[0]._id, client: client.id }).session(session);
    if (existing) return;
    const [booking] = await Booking.create([{
      gig: gigs[0]._id, client: client.id, freelancer: freelancer.id,
      note: 'Need a logo for my coffee brand.', amount: gigs[0].price, status: 'confirmed',
    }], { session });
    await Transaction.create([{
      reference: `TXN-${crypto.randomBytes(12).toString('hex').toUpperCase()}`,
      booking: booking._id, gig: gigs[0]._id, client: client.id,
      freelancer: freelancer.id, amount: gigs[0].price, type: 'booking', status: 'completed',
    }], { session });
  });

  console.log('==================================================');
  console.log(' HustleHub+ demo data seeded');
  console.log('==================================================');
  console.log('Freelancer (owner of gigs):  zane@hustlehub.demo');
  console.log('Freelancer (extra gig):      mia@hustlehub.demo');
  console.log('Client:                     alex@hustlehub.demo');
  console.log('Password for all:           DemoPass1!');
  console.log('--------------------------------------------------');
  console.log('Demo accounts and gigs are ready. Existing application data was preserved.');

  await disconnectDB();
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await disconnectDB();
  process.exit(1);
});