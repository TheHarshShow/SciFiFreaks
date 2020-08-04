const router = require('express').Router();
const User = require('../Models/Watcher');
const bcrypt = require('bcryptjs');
const {registerValidation, loginValidation} = require('../validation')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const bodyParser = require('body-parser')

router.use(bodyParser.urlencoded({ extended: false }))
//Register
router.post('/register', async (req, res) => {
  //VALIDATE
  // console.log(req)
  console.log('Register')
  console.log('Register ' + req.body.name)

  const { error } = registerValidation(req.body);

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
