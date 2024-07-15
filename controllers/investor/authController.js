const jwt = require('jsonwebtoken');
const Investor = require('../../models/investorModel');
const catchAsync = require('../../utils/catchAsync');

// sign in user using jwt
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRESIN,
  });

//   send the created token to the investor
const createSendToken = (investor, statusCode, res) => {
  const token = signToken(investor._id);

  investor.password = undefined;

  return res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      investor,
    },
  });
};

// create account
const createInvestor = catchAsync(async (req, res, next) => {
  const newInvestor = await Investor.create({
    name: req.body.name,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    address: req.body.address,
    proofOfIdentity: req.body.proofOfIdentity,
    proofOfAddress: req.body.proofOfAddress,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  //   await new Email(
  //     newInvestor,
  //     '',
  //     process.env.EMAIL_TEAM,
  //   ).sendWelcomeInvestor();

  createSendToken(newInvestor, 201, res);
});

// login to acc
// forgot password
// reset password
// protect

module.exports = {
  createInvestor,
};
