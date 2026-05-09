const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/placementTracker', { serverSelectionTimeoutMS: 2000 });
    console.log('Connected to DB');

    await User.deleteMany({ email: 'test@test.com' });
    
    // Signup
    const user = await User.create({ name: 'Test', email: 'test@test.com', password: 'password123' });
    console.log('User created:', user.email);

    // Login
    const foundUser = await User.findOne({ email: 'test@test.com' }).select('+password');
    if (!foundUser) throw new Error("User not found!");
    
    console.log('Password in DB:', foundUser.password);

    const isMatch = await foundUser.matchPassword('password123');
    console.log('Password match:', isMatch);
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    mongoose.disconnect();
  }
}
run();
