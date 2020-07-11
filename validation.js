//validation
const Joi = require('@hapi/joi');

const registerValidation = (data) => {

  const schema = Joi.object({
    name: Joi.string().min(6).max(255).required(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(10).max(1024).required()
  }).options({ allowUnknown: true });
  return schema.validate(data);

}

const loginValidation = (data) => {

  const schema = Joi.object({
    name: Joi.string().min(6).max(255).required(),
    password: Joi.string().min(10).max(1024).required()
  }).options({ allowUnknown: true });
  return schema.validate(data);

}


module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
