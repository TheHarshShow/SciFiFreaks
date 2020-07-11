if(process.env.NODE_ENV !== 'production'){
  require('dotenv').config();
}

const express = require('express')
const app = express();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const User = require('./Models/Watcher');
const Movie = require('./Models/Movie')
const Book = require('./Models/Book')
const TVShow = require('./Models/TVShow')
const MovieLike = require('./Models/MovieLike')
const MovieBookmark = require('./Models/MovieBookmark')
const MovieComment = require('./Models/MovieComment')
const CommentMovieComment = require('./Models/CommentMovieComment')
const method_override = require('method-override');
const path = require('path');

const authRoute = require('./Routes/auth')
const initialisePassport = require('./passport-config')

initialisePassport(
  passport,
  async (name) => {

    return await User.findOne({name: name}, function(err, user){
      if(user == null){
        return null;
      }

      return user;
    })

  }, async id => {

    return await User.findOne({_id:id}, function(err, user){
      if(user==null){
        return null;
      }

      return user;
    });

  }
)

app.set('view-engine', 'ejs')
app.use(method_override('_method'))
app.use(express.urlencoded({ extended : false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')))

mongoose.connect(process.env.DB_CONNECT,
{ useNewUrlParser: true, useUnifiedTopology: true },
() => {
  console.log('connected to db');
});

app.get('/', async (req, res) => {
  // console.log('haha '+ await req.user);

  let mvs;

  await Movie.find({}, (err, movies) => {

    if(err){
      console.log("There was an error", err)
    } else {
      mvs=movies;
    }

  })

  if (req.isAuthenticated()){
    const u=await req.user;
    console.log('movies '+mvs);
    await res.render('index.ejs', {name: u.name, f: 1, movies: mvs});
  } else {
    console.log('movies '+mvs);
    res.render('index.ejs', {f: 0, movies: mvs});
  }

})

app.get('/login', checkNotAuthenticated, (req,res) => {
    res.render('login.ejs')
})

app.post('/login',passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));


app.get('/register', (req,res) => {
  if(req.isAuthenticated()){
    return res.redirect('/');
  }
  res.render('register.ejs')
})

app.get('/add', checkAuthenticated ,(req, res) => {

  return res.render('add_post_page.ejs', {f:1});
})

app.get('/post_movie', checkAuthenticated ,(req, res) => {

  return res.render('add_movie_page.ejs', {f:1});
})

app.post('/post_movie', checkAuthenticated, async (req, res) => {

  if(req.body.movieName==null || req.body.year==null || req.body.description == null || req.body.imageUrl==null){
    return res.redirect('/post_movie');
  }

  const movieExists = await Movie.findOne({name:req.body.movieName, year:req.body.year})

  if(movieExists){
    return res.status(400).send('Movie already exists on site');
  }

  const movie = new Movie({
    name: req.body.movieName,
    description: req.body.description,
    imageUrl: req.body.imageUrl,
    year: req.body.year
  })
  try {
    const savedMovie = await movie.save();
    console.log('movie saved! '+savedMovie);
    return res.redirect('/')
  } catch (err){
    return res.status(504).send('There was an error. Sorry!')
  }

})

app.get('/m/:movie_id', (req,res) => {

  Movie.findOne({_id: req.params.movie_id}, async function(err,movie){
    if(err!=null){
      return res.status(400).send('There was an error')
    }

    var request = require('request');
    await request('http://www.omdbapi.com/?t='+movie.name+'&y='+movie.year+'&apikey=3a7bb883', async function (error, response, body) {
      let imdb="N/A";
      let RT="N/A";
      let Metascore="N/A";
      if (!error && response.statusCode == 200) {

        imdb = JSON.parse(body).imdbRating;
        console.log(JSON.parse(body))
        console.log("IMDB: "+imdb)
        Metascore=JSON.parse(body).Metascore;
        JSON.parse(body).Ratings.forEach(function(rat){
          if(rat.Source=="Rotten Tomatoes"){
            RT=rat.Value
          }
        })

      }
      let f=0;
      let liked=0;
      let errFlag=0;
      let bookmarked=0;
      if(req.isAuthenticated()){
        f=1;
        let user = await req.user;
        await MovieLike.exists({user:user._id, movie:movie._id}, async function(err, result){
          if(err!=null){
            errFlag=1;
            return res.status(400).send('Bad Request')
          }

          if(result==true){
            liked=1;
          }
          await MovieBookmark.exists({user:user._id, movie:movie._id}, await function(err, result){
            if(err!=null){
              errFlag=1;
              return res.status(400).send('Bad Request')
            }

            if(result==true){
              bookmarked=1;
            }
            MovieComment.find({movie:movie._id}).sort('-date').exec(function(err,docs){

              return res.render('moviePage.ejs', {movie: movie, f:f, imdb: imdb, RT: RT, Metascore: Metascore, liked:liked, bookmarked: bookmarked, comments: docs})
            })

          })
        })
      } else {
        MovieComment.find({movie:movie._id}).sort('-date').exec(function(err,docs){

          return res.render('moviePage.ejs', {movie: movie, f:f, imdb: imdb, RT: RT, Metascore: Metascore, liked:liked, bookmarked: bookmarked, comments: docs})
        })
      }
    })

  })
})

app.get('/post_comment_on_movie_comment/:comment_id', checkAuthenticated, async (req, res) => {

  if(req.body.comment == null || req.body.comment == ""){
    res.redirect(req.get('referer'));
  }
  let user = await req.user;
  let cmc = await new CommentMovieComment({
    parent_comment: comment_id,
    comment: req.body.comment,
    user: user._id
  })
  let saved_comment = cmc.save();
  console.log(saved_comment);
  res.redirect(req.get('referer'));

})

app.get('/ml/:movie_id', checkAuthenticated, (req,res) => {

  Movie.findOne({_id:req.params.movie_id}, async (err, movie) => {
    if(err!=null){
      res.status(400).send('Bad Request');
    }
    let user = await req.user;
    let un=user._id;

    MovieLike.exists({user:un, movie:movie._id}, async function(err, result){
      if(err!=null){
        return res.status(400).send('There was an error')
      }
      if(result==true){
        MovieLike.findOneAndDelete({user:un, movie:movie._id}, function(err) {
          if(err!=null){
            return res.status(400).send('There was an errorrrr')
          }
          return res.redirect('/m/'+req.params.movie_id)
        })
      } else {

        let ml = await new MovieLike({
          user: un,
          movie: movie._id
        })

        let savedLike = await ml.save();
        console.log('like saved '+savedLike);
        res.redirect('/m/'+req.params.movie_id)
      }
    })
  })

})

app.get('/mb/:movie_id', checkAuthenticated, (req,res) => {

  Movie.findOne({_id:req.params.movie_id}, async (err, movie) => {
    if(err!=null){
      res.status(400).send('Bad Request');
    }
    let user = await req.user;
    let un=user._id;

    await MovieBookmark.exists({user:un, movie:movie._id}, async function(err, result){
      if(err!=null){
        return res.status(400).send('There was an error')
      }
      if(result==true){
        MovieBookmark.findOneAndDelete({user:un, movie:movie._id}, function(err) {
          if(err!=null){
            return res.status(400).send('There was an errorrrr')
          }
          return res.redirect('/m/'+req.params.movie_id)
        })
      } else {

        let ml = await new MovieBookmark({
          user: un,
          movie: movie._id
        })

        let savedLike = await ml.save();
        console.log('bookmark saved '+savedLike);
        res.redirect('/m/'+req.params.movie_id)
      }
    })
  })

})

app.post('/post_movie_comment/:movie_id', checkAuthenticated, async (req, res) => {

  if(req.body.comment == null || req.body.comment==""){
    return res.redirect('/m/'+req.params.movie_id)
  }
  let user = await req.user;
  let mc = await new MovieComment({
    comment: req.body.comment,
    user: user.name,
    movie: req.params.movie_id
  })

  let savedComment = await mc.save();
  console.log(savedComment);
  return res.redirect('/m/'+req.params.movie_id)

})

app.get('/printPython/:use', (req, res) => {

  const { spawn } = require("child_process");
  const pyProg = spawn('python', ['./temporary.py', req.params.use]);

  pyProg.stdout.on('data', function(data) {

        console.log(data.toString());
        res.write(data);
        res.end('end');
    });

})

app.post('/post_tv_show', checkAuthenticated, async (req, res) => {

  // console.log(req.body);

  if(req.body.showName==null || req.body.startyear==null || (req.body.ongoing == null && req.body.endyear == null) || req.body.description == null || req.body.imageUrl==null){
    return res.redirect('/post_movie');
  }

  const showExists = await TVShow.findOne({name:req.body.movieName})
  if(showExists){
    return res.status(400).send('Show already exists on site');
  }

  if(req.body.ongoing != null){
    const show = new TVShow({
      name: req.body.showName,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      startyear: req.body.startyear,
      ongoing: true
    })
    try {
      const savedShow = await show.save();
      console.log('Show saved! '+savedShow);
      return res.redirect('/')
    } catch (err){
      return res.status(504).send('There was an error. Sorry!')
    }
  } else {
    const show = new TVShow({
      name: req.body.showName,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      startyear: req.body.startyear,
      ongoing: false,
      endyear: req.body.endyear
    })
    try {
      const savedShow = await show.save();
      console.log('Show saved! '+savedShow);
      return res.redirect('/')
    } catch (err){
      return res.status(504).send('There was an error. Sorry!')
    }
  }

})

app.get('/post_tv_show', checkAuthenticated ,(req, res) => {

  return res.render('add_tv_show_page.ejs', {f:1});
})
app.get('/post_book', checkAuthenticated ,(req, res) => {

  return res.render('add_book_page.ejs', {f:1});
})

app.post('/post_book', checkAuthenticated , async (req, res) => {

  if(req.body.bookName==null || req.body.author==null || req.body.year==null || req.body.description == null || req.body.imageUrl==null){
    return res.redirect('/postBook');
  }

  const bookExists = await Book.findOne({name:req.body.movieName})
  if(bookExists){
    return res.status(400).send('Book already exists on site');
  }

  const book = new Book({
    name: req.body.bookName,
    author: req.body.author,
    description: req.body.description,
    imageUrl: req.body.imageUrl,
    year: req.body.year
  })
  try {
    const savedBook = await book.save();
    console.log('Book saved! '+savedBook);
    return res.redirect('/')
  } catch (err){
    return res.status(504).send('There was an error. Sorry!')
  }
})

app.get('/post_piece', checkAuthenticated ,(req, res) => {

  return res.render('enter_diary_page.ejs', {f:1});
})

app.delete('/exit', function(req, res){
  req.logOut();
  res.redirect('/')
})

app.use('/api/user', authRoute);

app.listen(8000, () => console.log('server is listening on port 8000'));

function checkAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next()
  }
  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return res.redirect('/')
  }
  next();
}
