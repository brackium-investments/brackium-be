/* eslint-disable import/no-extraneous-dependencies */
const axios = require('axios');
const catchAsync = require('../../utils/catchAsync');

// get crypto data
const getLatestCryptoData = catchAsync(async (req, res, next) => {
  const response = await axios.get(
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
    {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COIN_MARKET_CAP_API_KEY,
      },
    },
  );

  const cryptoData = response.data.data;

  res.status(200).json({
    status: 'success',
    data: {
      cryptoData,
    },
  });
});

module.exports = { getLatestCryptoData };
