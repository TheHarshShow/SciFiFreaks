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
const MovieRule = require('./Models/MovieRule')
const Admin = require('./Models/Admin')
const method_override = require('method-override');
const path = require('path');
var bodyParser = require('body-parser')

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

app.use(bodyParser.json())
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

  await Movie.find({}, async (err, movies) => {

    if(err){
      console.log("There was an error", err)
    } else {
      mvs=movies;
    }

    if (await req.isAuthenticated()){
      const u=await req.user;
      console.log('movies '+mvs);
      await res.render('index.ejs', {name: u.name, f: 1, movies: mvs});
    } else {
      console.log('movies '+mvs);
      res.render('index.ejs', {f: 0, movies: mvs});
    }

  })

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
          await MovieBookmark.exists({user:user._id, movie:movie._id}, async function(err, result){
            if(err!=null){
              errFlag=1;
              return res.status(400).send('Bad Request')
            }

            if(result==true){
              bookmarked=1;
            }
            MovieComment.find({movie:movie._id}).sort('-date').exec(async function(err,docs){

              let iterations = docs.length;
              let commens = [];

              if(docs.length==0){
                return res.render('moviePage.ejs', {movie: movie, f:f, imdb: imdb, RT: RT, Metascore: Metascore, liked:liked, bookmarked: bookmarked, comments: []})
              }

              for (const doc of docs){

                console.log(doc.comment)
                await CommentMovieComment.exists({parent_comment:doc._id}, async function(err, result){
                  if(err!=null){
                    return res.status(400).send('')
                  }
                  if(result==true){
                    await CommentMovieComment.find({parent_comment:doc._id}, function(err, results){
                      if(err!=null){
                        return res.status(400).send('there was an error');
                      }
                      commen = {
                        commenn: doc,
                        replies: results
                      }
                      commens.push(commen);
                      console.log(commen)
                      if (!--iterations){
                        return res.render('moviePage.ejs', {movie: movie, f:f, imdb: imdb, RT: RT, Metascore: Metascore, liked:liked, bookmarked: bookmarked, comments: commens.sort((a, b) => b.commenn.date - a.commenn.date)})
                      }
                    })
                  } else {
                    commen = {
                      commenn: doc,
                      replies: []
                    }
                    commens.push(commen);
                    console.log(commen)

                    if (!--iterations){
                      return res.render('moviePage.ejs', {movie: movie, f:f, imdb: imdb, RT: RT, Metascore: Metascore, liked:liked, bookmarked: bookmarked, comments: commens})
                    }
                  }
                })

              }

            })

          })
        })
      } else {
        MovieComment.find({movie:movie._id}).sort('-date').exec(async function(err,docs){

          let iterations = docs.length;
          let commens = [];

          if(docs.length==0){
            return res.render('moviePage.ejs', {movie: movie, f:f, imdb: imdb, RT: RT, Metascore: Metascore, liked:liked, bookmarked: bookmarked, comments: []})
          }

          for (const doc of docs){

            console.log(doc.comment)
            await CommentMovieComment.exists({parent_comment:doc._id}, async function(err, result){
              if(err!=null){
                return res.status(400).send('')
              }
              if(result==true){
                await CommentMovieComment.find({parent_comment:doc._id}, function(err, results){
                  if(err!=null){
                    return res.status(400).send('there was an error');
                  }
                  commen = {
                    commenn: doc,
                    replies: results
                  }
                  commens.push(commen);
                  console.log(commen)
                  if (!--iterations){
                    return res.render('moviePage.ejs', {movie: movie, f:f, imdb: imdb, RT: RT, Metascore: Metascore, liked:liked, bookmarked: bookmarked, comments: commens.sort((a, b) => b.commenn.date - a.commenn.date)})
                  }
                })
              } else {
                commen = {
                  commenn: doc,
                  replies: []
                }
                commens.push(commen);
                console.log(commen)

                if (!--iterations){
                  return res.render('moviePage.ejs', {movie: movie, f:f, imdb: imdb, RT: RT, Metascore: Metascore, liked:liked, bookmarked: bookmarked, comments: commens})
                }
              }
            })

          }

        })
      }
    })

  })
})

app.get('/create_random_users', async (req, res) => {
  var request = require('request');

  const { spawn } = require('child_process')
  const pyProg = spawn('python', ['./generateUsers.py'])
  var dat=''

  pyProg.stdout.on('data', async function(data){
    dat+=data.toString();
    if(dat[dat.length-2]=='$' && dat[dat.length-3]=='$'){
      dat=dat.substring(0,dat.length-5)
      res.redirect('/')
      const users = (dat.toString()).split('||');
      // console.log(users);
      var t=users.length
      User.deleteMany({}, function(){
        users.forEach(function(user){
          var use = user.split('|');
          var myJSONObject = { email: use[1], name: use[0], password:use[2] } ;
          console.log(myJSONObject);
          request({
            url: "http://localhost:8000/api/user/register",
            method: "POST",
            json: true,
            body: myJSONObject
          }, function (error, response, body) {
              t--;
              console.log(t)

          });
        })
      })
    }
  })

})

app.get('/generate', async (req, res) => {

  var mov = [];
  var use = [];
  Movie.find({}, async function(err, docs){
    if(err!= null){
      return res.status(400).send('there was an error '+err);
    }
    mov = docs.map(a => a._id);
    await User.find({}, async function(err, dox){
      if(err!=null){
        return res.status(400).send('there was an error '+err);
      }
      use = dox.map(a => a._id);

      var s1=mov.join('|');
      var s2=use.join('|');
      s1=s1+"||"+s2;

      const { spawn } = require("child_process");
      const pyProg = spawn('python', ['./generate.py', s1]);

      var dat = '';

      pyProg.stdout.on('data', async function(data) {
          dat+=data.toString()
          // console.log(dat.substr(-3))
          // console.log(data.toString())
          if(dat[dat.length-2]=='$' && dat[dat.length-3]=='$'){
            console.log("hahaha")
            res.write(dat.toString());
            res.end('');
            dat=dat.substring(0,dat.length-5)
            // console.log(dat)
            var clusters = (dat.toString().substring(0,dat.toString().length-1)).split('||');
            var t=0;
            for (var i=0;i<clusters.length; i++){
              clusters[i]=clusters[i].split('|');
              t+=clusters[i].length-1;

            }
            // console.log(clusters.length);
            // console.log(t)
            await MovieLike.deleteMany({}, async function(){
              for(var j=0;j<clusters.length;j++){
                var cluster=clusters[j];
                for(var i=1;i<cluster.length;i++){
                  let ml = new MovieLike({
                    movie: cluster[i],
                    user: cluster[0]
                  })
                  await ml.save().then(function(){
                    t = t-1;
                    console.log("SI "+t)

                  });
                }
              }
            })
          }
        });
    })
  })

})

app.get('/train', async (req, res) => {

  let user = await req.user;

    await MovieRule.deleteMany({}, async function(){
      await MovieLike.find({}).sort('user').exec(async function(err,docs){

          if(docs.length==1){
            return res.send('training complete')
          }

          l1 = [];
          l2 = [];
          l1.push(docs[0]);
          for(var i=1;i<docs.length;i++){
            if(docs[i].user == docs[i-1].user){
              l1.push(docs[i]);
            } else {
              l2.push(l1);
              l1=[docs[i]];
            }
          }

          l3 = []
          l1=[]
          for(var i=0;i<l2.length;i++){
            for(var j=0;j<l2[i].length;j++){
              l1.push(l2[i][j].movie);
            }
            l3.push(l1.join('||'));
            l1=[]
          }

          l3 = l3.join('//')
          console.log(l3)
          const { spawn } = require("child_process");
          const pyProg = spawn('python', ['./temporary.py', l3]);

          var dat=''

          pyProg.stdout.on('data', function(data) {
              dat+=data.toString();
              console.log(data.toString())
              if(dat[dat.length-2]==']'){
                dat=dat.substring(0,dat.length-1)
                var rules_string = (dat.substring(2))
                res.write(rules_string);
                res.end('end');
                rules_string = rules_string.substring(0,rules_string.length-3)



                var rules = rules_string.split("), (");

                if(rules.length==1){ return }
                detail_rules = [];
                rules.forEach(function(rule){
                  var temp=rule.split(", ");
                  temp[0]=temp[0].substring(1, temp[0].length-1);
                  temp[1]=temp[1].substring(1, temp[1].length-1);
                  temp[2]=Number(temp[2]);
                  temp[3]=Number(temp[3]);
                  temp[4]=Number(temp[4]);
                  detail_rules.push(temp);
                })
                console.log(detail_rules)
                // rules_string = rules_string.replace(/\(|\)/gi, '');
                detail_rules.sort(function(a,b){return a[4]-b[4]});
                detail_rules.forEach(async function(rule){
                  let mr = new MovieRule({
                    movie1: rule[0],
                    movie2: rule[1],
                    support: rule[2],
                    confidence: rule[3],
                    lift: rule[4]
                  })
                  let smr = await mr.save();
                })
              }
            });
        })
      }
    )
})

app.get('/similar/:movie_id', async (req,res) => {

  let f=0;
  if(req.isAuthenticated()){ f=1; }

  Movie.findOne({'_id':req.params.movie_id}, async (err,doc)=>{
    if(err){
      return res.status(400).send('There was an error')
    }

    MovieRule.find({movie1:req.params.movie_id}, (err,docs) => {
      if(err){
        return res.status(400).send('There was an error')
      }
      docs = docs.map(a => a.movie2)

      console.log(docs)
      var len=docs.length;

      Movie.find({'_id':{$in:docs}}, (err,docxs) => {
        if(err){
          return res.status(400).send('There was an error')
        }
        return res.render('similarMovies.ejs', {f:f, movie:doc, movies:docxs})
      })

    })

  })
})

app.post('/post_comment_on_movie_comment/:comment_id', checkAuthenticated, async (req, res) => {

  if(req.body.comment == null || req.body.comment == ""){
    console.log(':/')
    return res.redirect(req.get('referer'));
  }
  let user = await req.user;
  let cmc = await new CommentMovieComment({
    parent_comment: req.params.comment_id,
    comment: req.body.comment,
    user: user.name
  })
  let saved_comment = await cmc.save();
  console.log(await saved_comment);
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

app.get('/recommended', checkAuthenticated, async (req,res) => {
  let user = await req.user;

  MovieLike.find({user:user._id}, function(err, docs){

    if(err!=null){
      return res.status(401).send('Unknown error');
    }

    if(docs.length==0){ return res.render('recommendedForYou.ejs', {f:1, movies:[]}) }

    let temp = docs.map(a => a.movie);

    console.log(temp);
    var tot = docs.length;
    var arr = [];
    docs.forEach(function(doc){
      MovieRule.find({movie1:doc.movie}, 'movie2', function(err,dox){
        tot--;
        let result = dox.map(a => a.movie2);
        // console.log(result)
        arr.push.apply(arr,result);
        if(tot==0){
          arr = arr.filter( function( el ) {
            return temp.indexOf( el ) < 0;
          } );
          arr = arr.filter(function(item, pos, self) {
              return self.indexOf(item) == pos;
          })
          // arr.forEach(function(item){
          //   item=mongoose.Types.ObjectId(item);
          // })
          console.log(arr);
          Movie.find().where('_id').in(arr).exec((err, records) => {
            if(err!=null){
              return res.status(400).send('Unknown Error '+err);
            }
            return res.render('recommendedForYou.ejs', {f:1, movies:records})
          });
        }
      })
    })


  })


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
