const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    required: true,
    enum: ['personal', 'business', 'loan']
  }
});

module.exports = mongoose.model('Category', categorySchema);