const mongoose = require('mongoose')

const movieRuleSchema = new mongoose.Schema({

  movie1: String,
  movie2: String,
  support: Number,
  confidence: Number,
  lift: Number
});

module.exports = mongoose.model('MovieRule',movieRuleSchema)
