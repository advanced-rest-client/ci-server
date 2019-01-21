'use strict';
// if (process.env.NODE_ENV === 'production') {
//   require('@google-cloud/trace-agent').start();
//   require('@google-cloud/debug-agent').start();
// }
// const errors = require('@google-cloud/error-reporting')();
const express = require('express');
const logger = require('morgan');
const logging = require('./lib/logging');
const bodyParser = require('body-parser');
const app = express();
app.enable('trust proxy');
app.disable('etag');
app.use(logger('dev'));
app.use(bodyParser.json());

// Our application will need to respond to health checks when running on
// Compute Engine with Managed Instance Groups.
app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});
app.use(logging.errorLogger);
app.set('x-powered-by', false);
app.use(logging.requestLogger);

/* API routes */
app.use('/build', require('./routes/github-webhook'));
app.use('/travis-build', require('./routes/travis-build'));
app.use('/status-change', require('./routes/status-change'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res) => {
  // errors.report(err);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
