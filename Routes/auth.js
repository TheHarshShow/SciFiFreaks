const router = require('express').Router();
const User = require('../Models/Watcher');
const bcrypt = require('bcryptjs');
const {registerValidation, loginValidation} = require('../validation')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')

//Register
router.post('/register', async (req, res) => {
  //VALIDATE
  const { error } = registerValidation(req.body);

  console.log('Register ' + req.body)

  if(error != null){
    return res.send(error.details[0].message);
  }
  //check if user in database
  const emailExists = await User.findOne({email:req.body.email});

  if(emailExists != null)return res.status(400).send('Email already taken.');
  const usernameExists = await User.findOne({name:req.body.name});
  if(usernameExists != null)return res.status(400).send('Username already taken.');
  //password hash
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);
  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword
  });
  try{
    const savedUser = await user.save();
    return res.redirect('/login')
  }catch(err) {
    return res.redirect('/register')
  }
});

module.exports = router
