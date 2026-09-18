require('dotenv').config();
const fs = require('fs');
const { connectDB, disconnectDB, URI_FILE } = require('../src/config/db');
const User = require('../src/models/user');
const Gig = require('../src/models/gig');
const Booking = require('../src/models/booking');
const Transaction = require('../src/models/transaction');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h', issuer: 'hustlehub-plus', audience: 'hustlehub-plus-api' }
  );

const run = async () => {
  // If a server is already running (its URI is recorded), seed THAT live
  // instance so the demo data appears immediately in the app.
  let liveUri;
  if (fs.existsSync(URI_FILE)) {
    liveUri = fs.readFileSync(URI_FILE, 'utf8').trim();
    console.log('Seeding the running server instance...');
  }
  await connectDB(liveUri || undefined);

  await Promise.all([
    User.deleteMany({}),
    Gig.deleteMany({}),
    Booking.deleteMany({}),
    Transaction.deleteMany({}),
  ]);

  const freelancer = await User.createUser({
    name: 'Zane Designer',
    email: 'zane@hustlehub.demo',
    password: 'DemoPass1!',
    role: 'freelancer',
  });
  const freelancer2 = await User.createUser({
    name: 'Mia Developer',
    email: 'mia@hustlehub.demo',
    password: 'DemoPass1!',
    role: 'freelancer',
  });
  const client = await User.createUser({
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
    const gig = await Gig.create({ ...d, owner: freelancer.id });
    gigs.push(gig);
  }

  const extraGig = await Gig.create({
    title: 'Mobile App UI Design',
    description: 'High-fidelity mobile app interfaces in Figma, including design system and clickable prototype.',
    category: 'Design',
    price: 450,
    deliveryDays: 7,
    owner: freelancer2.id,
  });

  const booking = await Booking.create({
    gig: gigs[0]._id,
    client: client.id,
    freelancer: freelancer.id,
    note: 'Need a logo for my coffee brand.',
    amount: gigs[0].price,
    status: 'confirmed',
  });

  const ref = `TXN-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  await Transaction.create({
    reference: ref,
    booking: booking._id,
    gig: gigs[0]._id,
    client: client.id,
    freelancer: freelancer.id,
    amount: gigs[0].price,
    type: 'booking',
    status: 'completed',
  });

  const summary = {
    freelancer: freelancer,
    freelancer2: freelancer2,
    client: client,
    gigs: gigs.map((g) => ({ id: g._id.toString(), title: g.title, price: g.price })),
    extraGig: { id: extraGig._id.toString(), title: extraGig.title, price: extraGig.price },
    booking: { id: booking._id.toString(), reference: ref, amount: gigs[0].price },
  };

  console.log('==================================================');
  console.log(' HustleHub+ demo data seeded');
  console.log('==================================================');
  console.log('Freelancer (owner of gigs):  zane@hustlehub.demo');
  console.log('Freelancer (extra gig):      mia@hustlehub.demo');
  console.log('Client:                     alex@hustlehub.demo');
  console.log('Password for all:           DemoPass1!');
  console.log('--------------------------------------------------');
  console.log('Client token (env var CLIENT_TOKEN):');
  console.log(generateToken(client));
  console.log('--------------------------------------------------');
  console.log('Freelancer token (env var FREELANCER_TOKEN):');
  console.log(generateToken(freelancer));
  console.log('--------------------------------------------------');
  console.log(`Seeded ${gigs.length + 1} gigs, 1 booking, 1 transaction.`);

  await disconnectDB();
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});