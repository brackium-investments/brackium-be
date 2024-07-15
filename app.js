const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const investorRouter = require('./routes/investorRoutes');

const app = express();

app.set('trust proxy', 300);
app.get('/x-forwarded-for', (request, response) =>
  response.send(request.headers['x-forwarded-for']),
);

// set security http headers
app.use(helmet());
app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Data sanitization against no-sql query inject and cross site attacks
// prevents query injections
app.use(mongoSanitize());

// limit requests from api
const limiter = rateLimit({
  max: 300,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.',
});

app.use('/api', limiter);

// limit to body parser, reading data from body in req.body
app.use(express.json({ limit: '10kb' }));

// prevents xss attacks
app.use(xss());

// prevents parameter pollution
// try getting the field names from the model
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/api/v1/investors', investorRouter);

app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} at the moment`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
