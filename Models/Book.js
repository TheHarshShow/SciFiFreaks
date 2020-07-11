const mongoose = require('mongoose')

const bookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    min: 1,
    max: 255
  },
  year: {
    type: Number,
    min: 1000,
    max: 2100
  },
  author: {
    type: String,
    required: true,
    min: 1,
    max: 255
  },
  description: {
    type: String,
    required: true,
    min: 10,
    max: 1000
  },
  imageUrl: {
    type: String,
    required: true,
    max: 1024
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Book',bookSchema)
