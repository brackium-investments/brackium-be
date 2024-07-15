const express = require('express');
const {
  createInvestor,
  signInInvestor,
} = require('../controllers/investor/authController');

const router = express.Router();

router.route('/').post(createInvestor);

router.route('/login').post(signInInvestor);

module.exports = router;
