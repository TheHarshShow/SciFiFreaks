const mongoose = require('mongoose')

const commentMovieCommentSchema = new mongoose.Schema({

  parent_comment: String,
  user: String,
  comment: String,
  date: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model('CommentMovieComment',commentMovieCommentSchema)
