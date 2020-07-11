const mongoose = require('mongoose')

const tvShowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    min: 1,
    max: 255
  },
  startyear: {
    type: Number,
    min: 1800,
    max: 2100
  },
  endyear: {
    type: Number,
    min: 1800,
    max: 2100
  },
  ongoing: {
    type: Boolean,
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

module.exports = mongoose.model('TVShow',tvShowSchema)
