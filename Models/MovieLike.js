const mongoose = require('mongoose')

const movieLikeSchema = new mongoose.Schema({

  movie: String,
  user: String

});

module.exports = mongoose.model('MovieLike',movieLikeSchema)
