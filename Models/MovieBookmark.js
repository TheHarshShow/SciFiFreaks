const mongoose = require('mongoose')

const movieBookmarkSchema = new mongoose.Schema({

  movie: String,
  user: String

});

module.exports = mongoose.model('MovieBookmark',movieBookmarkSchema)
