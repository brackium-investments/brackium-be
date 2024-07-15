const express = require('express');
const { createInvestor } = require('../controllers/investor/authController');

const router = express.Router();

router.route('/').post(createInvestor);

module.exports = router;
