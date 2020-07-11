const mongoose = require('mongoose')

const movieCommentSchema = new mongoose.Schema({

  movie: String,
  user: String,
  comment: String,
  date: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model('MovieComment',movieCommentSchema)
