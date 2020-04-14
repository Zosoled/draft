const async = require('async')
const Datastore = require('nedb')
const fs = require('fs')
const https = require('https')
const path = require('path')
const helpers = require(path.win32.resolve(__dirname, '../modules/helpers.js'))
var db = {
  draft: new Datastore({
    filename: path.win32.resolve(__dirname, '../data/draft.nedb'),
    autoload: true
  }),
  movie: new Datastore({
    filename: path.win32.resolve(__dirname, '../data/movie.nedb'),
    autoload: true
  }),
  value: new Datastore({
    filename: path.win32.resolve(__dirname, '../data/value.nedb'),
    autoload: true
  })
}

var currentDraft = helpers.currentDraft()
var now = new Date()

db.movie.find(currentDraft, function (err, movies) {
  if (err) {
    console.log('db find error: ', err)
  }
  // decide which movies to scrape then scrape in a waterfall
  async.waterfall([
    async.apply(determineOpenMovies, movies),
    scrape
  ], function (err, result) {
    if (err) {
      console.log('waterfall error: ', err)
    }

    db.draft.update(currentDraft, {
      $set: {
        last_scrape: now
      }
    }, {}, function (err, numUpdated) {
      if (err) {
        console.log('Unable to update the last scrape date', err)
        process.exit(1)
      }

      console.log('Updated ' + numUpdated + ' draft documents')
    })
  })

  function determineOpenMovies (movies, callback) {
    // these are the movies that are open
    var openMovies = []

    for (var i = 0; i < movies.length; i++) {
      if (now >= movies[i].release_date) {
        openMovies.push(movies[i])
      }
    }

    console.log('Found ' + openMovies.length + ' movies to scrape')
    callback(null, openMovies)
  }

  function scrape (openMovies, callback) {
    for (var j = 0; j < openMovies.length; j++) {
      console.log('Scraping ' + openMovies[j].name)
      var scrapeDelayer = function (movie) {
        var min = 7
        var max = 34
        var seconds = Math.floor((Math.random() * (max - min + 1) + min) * 1000)
        console.log('\t' + seconds + 'ms delay')

        setTimeout(function () {
          // set the unique path for this movie
          var moviePath = '/title/' + movie.imdb_id + '/'

          // set the options for the get request
          var options = {
            host: 'www.imdb.com',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
            },
            path: moviePath
          }

          https.get(options, function (res) {
            res.setEncoding('utf8')
            res.on('data', function (body) {
              var lines = body.split(/\r?\n/)

              for (var k = 0; k < lines.length; k++) {
                (function (movie) {
                  if (typeof lines[k] === 'string' && lines[k].match(/.*Gross USA.*/)) {
                    var gross = lines[k].replace(/^.*Gross USA.+?\$([0-9,]+).+$/i, '$1')
                    gross = gross.replace(/\D/g, '')
                    console.log(movie.name + ' gross: ' + gross)

                    var movieDoc = {
                      _id: now + '-' + movie._id,
                      movie_id: movie._id,
                      scrape_date: now,
                      gross: gross
                    }

                    db.value.count({
                      _id: movieDoc._id
                    }, function (err, count) {
                      if (err) {
                        console.log('Unable to insert value doc', err)
                        process.exit(1)
                      }

                      if (count > 0) {
                        db.value.update({
                          _id: movieDoc._id
                        }, {
                          $set: {
                            gross: gross
                          }
                        }, {}, function (err, numUpdated) {
                          if (err) {
                            console.log('Unable to update the last scrape date', err)
                            process.exit(1)
                          }
                          console.log('Updated the gross for ' + numUpdated + ' value documents')
                        })
                      } else {
                        db.value.insert(movieDoc, function (err, newDoc) {
                          if (err) {
                            console.log('Unable to insert value doc', err)
                            process.exit(1)
                          }
                          console.log('Value document inserted')
                        })
                      }
                    })

                    db.movie.update({
                      _id: movie._id
                    }, {
                      $set: {
                        last_gross: gross
                      }
                    }, {}, function (err, numUpdated) {
                      if (err) {
                        console.log('Unable to update the last scrape date', err)
                        process.exit(1)
                      }

                      console.log('Updated ' + numUpdated + ' movie documents')

                      // we write a tracking file. This will automatically cause the server to restart if using nodemon - this is desired behavior
                      fs.writeFile(path.win32.resolve(__dirname, '../modules/scrape_track.js'), 'var scrape_track = {}; scrape_track.last_scrape = ' + now + '; module.exports = scrape_track;', function (err) {
                        if (err) {
                          console.log(err)
                        } else {
                          console.log('tracking file updated')
                        }
                      })
                    })
                  }
                })(movie)
              }
            })
          }).on('error', function (err) {
            console.log('error: ', err)
          })
        }, seconds)
      }
      scrapeDelayer(openMovies[j])
    }

    callback(null, null)
  }
})
