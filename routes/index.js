/**
 * Route parameters are named URL segments indicated by colon prefixes.
 * https://expressjs.com/en/guide/routing.html#route-parameters
 */
const async = require('async')
const Datastore = require('nedb')
const express = require('express')
const path = require('path')
const router = express.Router()
const helpers = require(path.win32.resolve(__dirname, '../modules/helpers.js'))
var db = {}
db.draft = new Datastore({ filename: 'data/draft.nedb', autoload: true })
db.movie = new Datastore({ filename: 'data/movie.nedb', autoload: true })
db.team = new Datastore({ filename: 'data/team.nedb', autoload: true })
db.value = new Datastore({ filename: 'data/value.nedb', autoload: true })

/* GET home page. */
router.get('/', function (req, res, next) {
  var selectionDraft = helpers.currentDraft()

  db.movie.find(selectionDraft).sort({ releaseDate: 1 }).exec(function (err, movieDocs) {
    if (err) { console.error('Unable to get movie documents', err); process.exit(1) };

    // get the draft details as well
    db.draft.findOne(selectionDraft, function (err, draftDoc) {
      if (err) { console.error('Unable to get movie documents', err); process.exit(1) }
      if (!draftDoc) { console.error('No draft docs found'); process.exit(1) }

      var currentDraft = {}
      currentDraft.season = selectionDraft.season
      currentDraft.year = selectionDraft.year
      currentDraft.draftStart = draftDoc.draftStart
      currentDraft.draftEnd = draftDoc.draftEnd
      currentDraft.seasonStart = draftDoc.seasonStart
      currentDraft.seasonEnd = draftDoc.seasonEnd

      db.team.find(selectionDraft).exec(function (err, teamDocs) {
        if (err) { console.error('Unable to get team documents', err); process.exit(1) }
        res.render('index', { title: 'IDX Movie Draft', movies: movieDocs, currentDraft: currentDraft, teams: teamDocs })
      })
    })
  })
})

// team additions page
router.get('/team/:id', function (req, res, next) {
  var selectionDraft = helpers.currentDraft()
  var teamId = req.params.id

  db.draft.findOne(selectionDraft, function (err, draftDoc) {
    if (err) { console.error('Unable to get movie documents', err); process.exit(1) }
    if (draftDoc === null) {
      res.render('team', { title: 'Team not found', found: false })
    } else {
      db.movie.find(selectionDraft).sort({ releaseDate: 1 }).exec(function (err, movieDocs) {
        if (err) { console.error('Unable to get movie documents', err); process.exit(1) }
        db.team.findOne({ id: teamId }).sort({ releaseDate: 1 }).exec(function (err, teamDoc) {
          if (err) {
            console.error('Unable to get team', err)
            process.exit(1)
          }
          var found = false
          var title = 'Team not found'
          var ownerList = {}

          if (teamDoc !== null) {
            found = true
            title = teamDoc.teamName

            for (var i = 0; i < teamDoc.member.length; i++) {
              // compute total gross for each person in the team
              teamDoc.member[i].totalGross = 0

              if (teamDoc.member[i].movies) {
                for (var j = 0; j < teamDoc.member[i].movies.length; j++) {
                  for (var k = 0; k < movieDocs.length; k++) {
                    if (movieDocs[k].id === teamDoc.member[i].movies[j].movieId) {
                      if (movieDocs[k].lastGross) {
                        teamDoc.member[i].totalGross += (movieDocs[k].lastGross * (teamDoc.member[i].movies[j].percent / 100))
                      }
                    }
                  }

                  ownerList[teamDoc.member[i].movies[j].movieId] = {
                    memberName: teamDoc.member[i].name,
                    bid: teamDoc.member[i].movies[j].bid,
                    percent: teamDoc.member[i].movies[j].percent
                  }
                }
              }
            }
          }
          res.render('team', { title: title, found: found, draft: draftDoc, team: teamDoc, movies: movieDocs, winnerInfo: ownerList, showGross: true })
        })
      })
    }
  })
})

// process form submit from the draft page
router.post('/draft', function (req, res, next) {
  var teamId = req.body.teamId
  var info = teamId.split('-')
  var draftSeason = info[0]
  var draftYear = parseInt(info[1], 10)

  // lets double check that we're in a valid draft
  db.draft.findOne({ season: draftSeason, year: draftYear }, function (err, draftDoc) {
    if (err) { console.error('Unable to get draft', err); process.exit(1) }
    if (draftDoc == null) {
      res.statusCode = 400
      res.send({})
    } else {
      // draft valid, get team from the information
      db.team.findOne({ id: teamId }, function (err, teamDoc) {
        if (err) { console.error('Unable to get team', err); process.exit(1) }
        if (!teamDoc) {
          res.statusCode = 400
          res.send({})
        } else {
          teamDoc.draftPosition = parseInt(teamDoc.draftPosition) + 1

          // make sure we have a valid percentage
          var percent = (req.body.percent) ? req.body.percent : 100

          // find the winning member
          var winnerFound = false
          var hasBux = false
          for (var i = 0; i < teamDoc.member.length; i++) {
            if (teamDoc.member[i].id === req.body.winner) {
              winnerFound = true

              // total the existing bids for this member make sure it's greater than or equal to the bid
              var totalBux = 100
              for (var m = 0; m < teamDoc.member[i].movies.length; m++) {
                totalBux -= parseInt(teamDoc.member[i].movies[m].bid)
              }

              if (totalBux >= parseInt(req.body.bid)) {
                teamDoc.member[i].movies.push({ movieId: req.body.movieId, bid: req.body.bid, percent: percent })
                hasBux = true
              }
            }
          }

          // if final movie then set the team doc value
          if (parseInt(req.body.finalMovie) === 1) {
            teamDoc.draftComplete = true
          }

          // no winner found or winner doesn't have enough money
          if (!winnerFound) {
            res.statusCode = 404
            res.send({})
          } else if (!hasBux) {
            res.statusCode = 402
            res.send({})
          } else {
            // winner found
            db.team.update({ id: teamDoc.id }, teamDoc, {}, function (err) {
              if (err) {
                console.log(err)
                res.statusCode = 400
                res.send({})
              } else {
                res.statusCode = 200
                res.send({})
              }
            })
          }
        }
      })
    }
  })
})

router.get('/draft/:teamId/:movieIndex', function (req, res, next) {
  var info = req.params.teamId.split('-')
  var draftSeason = info[0]
  var draftYear = parseInt(info[1], 10)
  var teamId = req.params.teamId
  var movieIndex = parseInt(req.params.movieIndex, 10)

  // get the draft doc and make sure it's drafting time
  db.draft.findOne({ season: draftSeason, year: draftYear }, function (err, draftDoc) {
    if (err) { console.log('Unable to get draft', err) }
    if (draftDoc === null) {
      res.render('draft', { title: 'Drafting: Draft Not Found', notFound: 'draft' })
    } else {
      // if we have a valid draft
      // find the requested team
      db.team.findOne({ id: teamId }, function (err, teamDoc) {
        if (err) { console.log('Unable to get team', err) }
        if (teamDoc === null) {
          res.render('draft', { title: 'Drafting: Team Not Found', notFound: 'team' })
        } else {
          // if we have a valid team
          // count the total movies this draft
          db.movie.count({ season: draftSeason, year: draftYear }, function (err, count) {
            if (err) { res.render('draft', { title: 'Drafting: Movie Not Found', notFound: 'movie' }) }

            var lastMovie = count - 1
            var finalMovie = 1
            if (movieIndex !== lastMovie) {
              finalMovie = 0
            }

            // get the requested movie
            db.movie.findOne({ season: draftSeason, year: draftYear })
              .skip(movieIndex)
              .exec(function (err, movieDoc) {
                if (err) { console.log('Unable to get movie', err) }
                if (movieDoc === null) {
                  res.render('draft', { title: 'Drafting: Movie Not Found', notFound: 'movie' })
                } else {
                  // if we have a valid movie render the full page content
                  res.render('draft', {
                    title: 'Drafting: ' + movieDoc.name,
                    draft: draftDoc,
                    movie: movieDoc,
                    team: teamDoc,
                    notFound: null,
                    movieIndex: movieIndex,
                    finalMovie: finalMovie,
                    showGross: false
                  })
                }
              })
          })
        }
      })
    }
  })
})

// team addtions page
router.get('/add_team', function (req, res, next) {
  var selectionDraft = helpers.currentDraft()
  var highlightRequired = req.query.required

  res.render('add_team', { title: 'Add a drafting team', currentDraft: selectionDraft, highlightRequired: highlightRequired })
})

// add_team processor
router.post('/add_team', function (req, res, next) {
  var required = [
    req.body.teamName,
    req.body.member[0],
    req.body.member[1],
    req.body.member[2]
  ]
  required.forEach(element => {
    if (typeof element !== 'string' || element.length === 0) {
      res.status(400).send('Minimum team size is 3 players.')
    }
  })

  // there's a number of steps we want to do in series
  async.waterfall([
    async.apply(makeId, req.body),
    checkName,
    translateMembers,
    insertTeam
  ],
  function (err, finalRes) {
    if (err) { console.log('An error has occured ', err); process.exit(1) }

    if (typeof finalRes === 'object') {
      res.statusCode = 200
      res.send({})
    }
  })

  // make the teams ID and add it to the body
  function makeId (body, callback) {
    body.id = helpers.makeId([body.season, body.year, body.teamName])

    if (typeof body.id !== 'string') {
      callback(new Error('Did not get string from makeId'), null)
    } else {
      callback(null, body)
    }
  }

  // check to see if the name is taken
  function checkName (body, callback) {
    db.team.count({ id: body.id }).exec(function (err, count) {
      if (err) {
        callback(err, null)
      } else if (count !== 0) {
        callback(new Error('Team name already exists.'), null)
      } else {
        callback(null, body)
      }
    })
  }

  // turn the members array into an object
  function translateMembers (body, callback) {
    // make the members into objects
    var members = []
    for (var i = 0; i < 8; i++) {
      // remove empty elements
      if (typeof body.member[i] === 'string' && body.member[i].length !== 0) {
        members.push({ id: helpers.makeId(body.member[i]), name: body.member[i], movies: [] })
      }
    }
    body.member = members
    callback(null, body)
  }

  // insert into the database
  function insertTeam (body, callback) {
    // one last set, adding draft tracking
    body.draftPosition = 0
    body.draftComplete = false
    body.year = parseInt(body.year, 10)

    db.team.insert(body, err => {
      if (err) {
        callback(new Error('Unable to insert team into database. ' + err), null)
      }
    })
    callback(null, body)
  }
})

module.exports = router
