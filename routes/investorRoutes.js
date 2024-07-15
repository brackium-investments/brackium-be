const express = require('express');
const {
  createInvestor,
  signInInvestor,
  forgotPassword,
} = require('../controllers/investor/authController');

const router = express.Router();

router.route('/').post(createInvestor);

router.route('/login').post(signInInvestor);

router.route('/forgot-password').post(forgotPassword);

module.exports = router;
