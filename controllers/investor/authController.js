const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
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
const forgotPassword = catchAsync(async (req, res, next) => {
  // 1 get user based on posted email
  const investor = await Investor.findOne({ email: req.body.email });

  if (!investor) {
    return next(new AppError(`There is no user with the email`, 404));
  }

  // 2 generate the random token
  const resetToken = investor.createPasswordResetToken();
  await investor.save({ validateBeforeSave: false });

  const hostLink =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/auth/reset-password'
      : process.env.INVESTOR_PROD_RESET_PASSWORD_PATH;

  const resetURL = `${hostLink}/${resetToken}`;

  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}. \nIf you didn't forget your password, please ignore this email.`;

  try {
    // await new Email(
    //   investor,
    //   resetURL,
    //   process.env.EMAIL_SUPPORT,
    // ).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
      url: resetURL,
    });
  } catch (err) {
    investor.passwordResetToken = undefined;
    investor.passwordResetExpires = undefined;
    await investor.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Please try again',
        500,
      ),
    );
  }
});

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

// reset password
const resetPassword = catchAsync(async (req, res, next) => {
  // 1 Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const investor = await Investor.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2 if the token has not expired and there is a user, set the password
  if (!investor) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  investor.password = req.body.password;
  investor.passwordConfirm = req.body.passwordConfirm;
  investor.passwordResetToken = undefined;
  investor.passwordResetExpires = undefined;
  await investor.save();

  // 3 update changePasswordAt property for the Investor
  // This is updated on every save

  // 4 login the Investor in, send JWT
  createSendToken(investor, 200, res);
});

// update password
const updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, newPassword, confirmNewPassword } = req.body;

  // 1 get the user from the collection
  const investor = await Investor.findById(req.investor.id).select('+password');

  // 2 check if the posted password is correct
  if (
    !investor &&
    !(await investor.correctPassword(passwordCurrent, investor.password))
  ) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // 3 if the password is correct, update the password
  investor.password = newPassword;
  investor.passwordConfirm = confirmNewPassword;
  await investor.save();

  // 4 login Investor and send JWt
  //   createSendToken(investor, 200, res);
  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully',
  });
});

module.exports = {
  createInvestor,
  signInInvestor,
  protect,
  forgotPassword,
  resetPassword,
  updatePassword,
};
