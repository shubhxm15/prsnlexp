const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const expenseSchema = new Schema({
  user_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  category_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  transaction_type: { 
    type: String, 
    required: true,
    enum: ['credit', 'debit'] 
  },
  payment_mode: { type: String, required: true },
  date: { type: Date, required: true },
  due_date: { type: Date },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);