const mongoose = require('mongoose');
const Category = require('./models/Category');
const connectDB = require('./config/db');

// Connect to database
connectDB();

const seedCategories = async () => {
  try {
    const categories = [
      { name: 'shopping', type: 'personal' },
      { name: 'food', type: 'personal' },
      { name: 'transport', type: 'personal' },
      { name: 'other', type: 'personal' },
      { name: 'shop', type: 'business' },
      { name: 'property', type: 'business' },
      { name: 'personal loan', type: 'loan' },
      { name: 'business loan', type: 'loan' }
    ];

    await Category.deleteMany(); // Clear existing categories
    await Category.insertMany(categories);
    console.log('Categories seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();