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

  db.movie.find(selectionDraft).sort({ release_date: 1 }).exec(function (err, movieDocs) {
    if (err) { console.error('Unable to get movie documents', err); process.exit(1) };
    console.log(selectionDraft)
    console.log(movieDocs)

    // get the draft details as well
    db.draft.findOne(selectionDraft, function (err, draftDoc) {
      if (err) { console.error('Unable to get movie documents', err); process.exit(1) }
      if (!draftDoc) { console.error('No draft docs found'); process.exit(1) }

      var currentDraft = {}
      currentDraft.season = selectionDraft.season
      currentDraft.year = selectionDraft.year
      currentDraft.draft_start = draftDoc.draft_start
      currentDraft.draft_end = draftDoc.draft_end
      currentDraft.season_start = draftDoc.season_start
      currentDraft.season_end = draftDoc.season_end

      db.team.find(selectionDraft).exec(function (err, teamDocs) {
        if (err) { console.error('Unable to get team documents', err); process.exit(1) }
        res.render('index', { title: 'IDX Movie Draft', movies: movieDocs, current_draft: currentDraft, teams: teamDocs })
      })
    })
  })
})

// team addtions page
router.get('/team/' + ':id', function (req, res, next) {
  var selectionDraft = helpers.currentDraft()
  var teamId = req.params.id

  db.draft.findOne(selectionDraft, function (err, draftDoc) {
    if (err) { console.error('Unable to get movie documents', err); process.exit(1) }
    if (draftDoc === null) {
      res.render('team', { title: 'Team not found', found: false })
    } else {
      db.movie.find(selectionDraft).sort({ release_date: 1 }).exec(function (err, movieDocs) {
        if (err) { console.error('Unable to get movie documents', err); process.exit(1) }
        db.team.findOne({ _id: teamId }, function (err, teamDoc) {
          if (err) { console.error('Unable to get team', err); process.exit(1) }
          var found = false
          var title = 'Team not found'
          var ownerList = {}
          teamDoc.sort({ release_date: 1 }).exec(function (err, teamDoc) {
            if (err) { console.error('Unable to sort teams', err); process.exit(1) }
            if (teamDoc !== null) {
              found = true
              title = teamDoc.team_name

              for (var i = 0; i < teamDoc.member.length; i++) {
                // compute total gross for each person in the team
                teamDoc.member[i].total_gross = 0

                if (teamDoc.member[i].movies) {
                  for (var j = 0; j < teamDoc.member[i].movies.length; j++) {
                    console.log(teamDoc.member[i].movies)
                    for (var k = 0; k < movieDocs.length; k++) {
                      if (movieDocs[k]._id === teamDoc.member[i].movies[j].movie_id) {
                        if (movieDocs[k].last_gross) {
                          teamDoc.member[i].total_gross += (movieDocs[k].last_gross * (teamDoc.member[i].movies[j].percent / 100))
                        }
                      }
                    }

                    ownerList[teamDoc.member[i].movies[j].movie_id] = {
                      member_name: teamDoc.member[i].name,
                      bid: teamDoc.member[i].movies[j].bid,
                      percent: teamDoc.member[i].movies[j].percent
                    }
                  }
                }
              }
            }
          })
          res.render('team', { title: title, found: found, draft: draftDoc, team: teamDoc, movies: movieDocs, winner_info: ownerList, show_gross: true })
        })
      })
    }
  })
})

// process form submit from the draft page
router.post('/draft', function (req, res, next) {
  var teamId = req.body.team_id
  var info = teamId.split('-')
  var draftSeason = info[0]
  var draftYear = info[1]

  // lets double check that we're in a valid draft
  db.draft.findOne({ season: draftSeason, year: draftYear }, function (err, draftDoc) {
    if (err) { console.error('Unable to get draft', err); process.exit(1) }
    if (draftDoc == null) {
      res.statusCode = 400
      res.send({})
    } else {
      // draft valid, get team from the information
      db.team.findOne({ _id: teamId }, function (err, teamDoc) {
        if (err) { console.error('Unable to get team', err); process.exit(1) }
        if (teamDoc == null) {
          res.statusCode = 400
          res.send({})
        } else {
          teamDoc.draft_position = parseInt(teamDoc.draft_position) + 1

          // make sure we have a valid percentage
          var percent = (req.body.percent) ? req.body.percent : 100

          // find the winning member
          var winnerFound = false
          var hasBux = false
          for (var i = 0; i < teamDoc.member.length; i++) {
            if (teamDoc.member[i]._id === req.body.winner) {
              winnerFound = true

              // total the existing bids for this member make sure it's greater than or equal to the bid
              var totalBux = 100
              for (var m = 0; m < teamDoc.member[i].movies.length; m++) {
                totalBux -= parseInt(teamDoc.member[i].movies[m].bid)
              }

              if (totalBux >= parseInt(req.body.bid)) {
                teamDoc.member[i].movies.push({ movie_id: req.body.movie_id, bid: req.body.bid, percent: percent })
                hasBux = true
              }
            }
          }

          // if final movie then set the team doc value
          if (parseInt(req.body.final_movie) === 1) {
            teamDoc.draft_complete = true
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
            db.team.update({ _id: teamDoc._id }, teamDoc, null, function (err) {
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

// this is a sequential route used for drafting
router.get('/draft/' + ':team_id' + '/' + ':movie_number', function (req, res, next) {
  var info = req.params.team_id.split('-')
  var draftSeason = info[0]
  var draftYear = info[1]
  var teamId = req.params.team_id
  var movieNumber = parseInt(req.params.movie_number)

  // get the draft doc and make sure it's drafting time
  db.draft.findOne({ season: draftSeason, year: draftYear }, function (err, draftDoc) {
    if (err) { console.log('Unable to get draft', err) }
    if (draftDoc === null) {
      res.render('draft', { title: 'Drafting: Draft Not Found', not_found: 'draft' })
    } else {
      // if we have a valid draft
      // find the requested team
      db.team.findOne({ _id: teamId }, function (err, teamDoc) {
        if (err) { console.log('Unable to get team', err) }
        if (teamDoc === null) {
          res.render('draft', { title: 'Drafting: Team Not Found', not_found: 'team' })
        } else {
          // if we have a valid team
          // count the total movies this draft
          db.movie.count({ season: draftSeason, year: draftYear }, function (err, count) {
            if (err) { res.render('draft', { title: 'Drafting: Movie Not Found', not_found: 'movie' }) }

            var lastMovie = count - 1
            var finalMovie = 1
            if (movieNumber !== lastMovie) {
              finalMovie = 0
            }

            // get the requested movie
            db.movie.findOne({ season: draftSeason, year: draftYear, order: movieNumber }, function (err, movieDoc) {
              if (err) { console.log('Unable to get movie', err) }
              if (movieDoc === null) {
                res.render('draft', { title: 'Drafting: Movie Not Found', not_found: 'movie' })
                // if we have a valid movie
                // render the full page content
              } else {
                res.render('draft', { title: 'Drafting: ' + movieDoc.name, draft: draftDoc, movie: movieDoc, team: teamDoc, not_found: null, movie_number: movieNumber, final_movie: finalMovie, show_gross: false })
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

  // create a bool to decide if required fields should be highlighted
  var highlightRequired = false
  if (req.query.required) {
    highlightRequired = true
  }

  res.render('add_team', { title: 'Add a drafting team', current_draft: selectionDraft, highlight_required: highlightRequired })
})

// add_team processor
router.post('/add_team', function (req, res, next) {
  var required = [
    req.body.team_name,
    req.body.member[0],
    req.body.member[1],
    req.body.member[2]
  ]
  required.forEach(function (elm) {
    if (typeof elm !== 'string' || elm.length === 0) {
      res.statusCode = 400
      res.send({})
    }
  })

  // there's a number of steps we want to do in series
  async.waterfall([
    async.apply(makeID, req.body),
    checkName,
    translateMembers,
    insertTeam
  ],
  function (errs, finalRes) {
    if (errs) { console.log('An error has occured ', errs); process.exit(1) }

    if (typeof finalRes === 'object') {
      res.statusCode = 200
      res.send({})
    }
  })

  // make the teams ID and add it to the body
  function makeID (body, callback) {
    body._id = helpers.makeID([body.season, body.year, body.team_name])

    if (typeof body._id !== 'string') {
      callback(new Error('Did not get string from makeID'), null)
    } else {
      callback(null, body)
    }
  }

  // check to see if the name is taken
  function checkName (body, callback) {
    db.team.count({ _id: body._id }).exec(function (err, count) {
      if (err) {
        callback(err, null)
      } else if (count !== 0) {
        callback(new Error('Team name already exists'), null)
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
        members.push({ _id: helpers.makeID(body.member[i]), name: body.member[i], movies: [] })
      }
    }
    body.member = members
    callback(null, body)
  }

  // insert into the database
  function insertTeam (body, callback) {
    // one last set, adding draft tracking
    body.draft_position = 0
    body.draft_complete = false

    db.team.insert(body, function (err) {
      if (err) { callback(new Error('Unable to insert team into database.' + err), null); process.exit(1) }
    })

    callback(null, body)
  }
})

module.exports = router
