const express = require('express');
const {
  createInvestor,
  signInInvestor,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
} = require('../controllers/investor/authController');
const {
  getLatestCryptoData,
} = require('../controllers/investor/investorController');

const router = express.Router();

router.route('/').post(createInvestor);

router.route('/login').post(signInInvestor);

router.route('/forgot-password').post(forgotPassword);

router.route('/reset-password/:token').post(resetPassword);

router.route('/updateMyPassword').patch(protect, updatePassword);

router.route('/get-crypto-data').get(getLatestCryptoData);

module.exports = router;
