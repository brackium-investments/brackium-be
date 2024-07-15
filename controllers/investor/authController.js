const jwt = require('jsonwebtoken');
const { promisify } = require('util');
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
// middleware to protect tours route
const protect = catchAsync(async (req, res, next) => {
  // 1) get the token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 401- unauthorized
  if (!token) {
    return next(
      new AppError(`You are not logged in! Please login to get access.`, 401),
    );
  }
  // 2) validate (verify) the token
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET,
    () => {},
  );

  // 3) check if the user still exists
  const currentUser = await Investor.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(`The user belonging to this token no longer exists`, 401),
    );
  }

  // 4) check if user changed password after the JWT (token) was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(`User recently changed password! Please login again`, 401),
    );
  }

  // Grant access to protected route
  req.investor = currentUser;
  next();
});

module.exports = {
  createInvestor,
  signInInvestor,
};
