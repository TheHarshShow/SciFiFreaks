const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcryptjs')

function initialise(passport, getUserByName, getUserById){
  const authenticateUser = async (name, password, done) => {
    console.log(name);
    const user = await getUserByName(name)
    if(user==null){
      return done(null, false, { message: 'no user with that username' });
    }
    try {
      if(await bcrypt.compare(password, user.password)){
        // console.log(user);
        return done(null, user)
      } else {
        return done(null, false, { message: 'incorrect password' });
      }

    } catch (err){
      return done(err);
    }

  }

  passport.use(new LocalStrategy({ usernameField:'name' }, authenticateUser))
  passport.serializeUser((user, done) => {
    return done(null,user._id)
  });
  passport.deserializeUser((id, done) => done(null, getUserById(id)));

}

module.exports = initialise;
