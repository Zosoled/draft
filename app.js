'use strict'
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const favicon = require('serve-favicon')
const logger = require('morgan')
const path = require('path')
const routes = require('./routes/index')
const express = require('express')
var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(cookieParser())
app.use('/public', express.static(path.join(__dirname, 'public')))
app.use('/', routes)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err
    })
  })
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

/**
 * Converts a date to a human-friendly version.
 * @param {Date} dateToConvert
 */
app.locals.prettyDate = function (dateToConvert) {
  if (!dateToConvert || !(dateToConvert instanceof Date)) {
    throw new TypeError('Expected Date, received ' + typeof dateToConvert)
  }
  return dateToConvert.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/** Returns sum of bid amounts by a member. */
app.locals.totalMemberMovies = movies => {
  var total = 0
  for (var i = 0; i < movies.length; i++) {
    total += parseInt(movies[i].bid)
  }
  return total
}

app.locals.addCommasToNumber = number => {
  number = Math.round(Number(number))
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

module.exports = app
