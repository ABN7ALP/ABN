//src/models/counter.model.js

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // اسم العداد، سيكون 'orderId'
    seq: { type: Number, default: 1000 }  // الرقم الذي سيبدأ منه العد
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
