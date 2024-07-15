const jwt = require('jsonwebtoken');
const Investor = require('../../models/investorModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

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
const signInInvestor = catchAsync(async (req, res, next) => {
  //   check if email and password already exist
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email or password', 400));
  }

  // check if the user exists and password is correct

  const investor = await Investor.findOne({ email }).select('+password');
  // .populate({
  //   path: 'investments',
  //   select: '-investor',
  // });

  if (
    !investor ||
    !(await investor.correctPassword(password, investor.password))
  ) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // if everything is ok, send the token to the client

  createSendToken(investor, 200, res);
});

// forgot password
// reset password
// protect

module.exports = {
  createInvestor,
  signInInvestor,
};
