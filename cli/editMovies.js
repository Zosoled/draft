const Datastore = require('nedb')
const prompts = require('prompts')
const path = require('path')
const helpers = require(path.win32.resolve(__dirname, '../modules/helpers.js'))
var db = new Datastore({
  filename: path.win32.resolve(__dirname, '../data/movie.nedb'),
  autoload: true
})
var draftDb = new Datastore({
  filename: path.win32.resolve(__dirname, '../data/draft.nedb'),
  autoload: true
})

// this governs the user prompts and valid responses
const draftSchema = [{
  type: 'select',
  name: 'season',
  message: 'Pick a season',
  choices: [{
    title: 'Summer',
    value: 'Summer'
  },
  {
    title: 'Winter',
    value: 'Winter'
  }
  ]
},
{
  type: 'number',
  name: 'year',
  message: 'Enter a year',
  initial: 2020,
  min: 0,
  max: 9999
}
];

// first we need to get an validate the draft selection
(async () => {
  var draft = await prompts(draftSchema)
  if (!draft) {
    console.log('Unable to get responses')
    process.exit(1)
  }

  // look up the draft document
  draftDb.count(draft).exec(function (err, count) {
    if (err) {
      console.log('Unable to get search database', err)
      process.exit(1)
    }

    // if there are no docs the error out
    if (count !== 1) {
      console.log('Unable to find appropriate draft. Please use the createDraft script first. Docs found: ' + count)
      process.exit(1)
    }

    db.find(draft).sort({
      releaseDate: 1
    }).exec((err, movieDocs) => {
      if (movieDocs.length === 0) {
        console.log('Did not find any movie documents. ', err)
        process.exit(1)
      }
      var editedMovies = [];
      (async function editMovies (movieDocs) {
        var movie = movieDocs.shift()
        var movieSchema = [{
          type: 'text',
          name: 'name',
          message: 'Movie Name',
          initial: movie.name,
          validate: name => name.length < 1 ? 'Please enter a name.' : true
        },
        {
          type: 'date',
          name: 'releaseDate',
          message: 'US Release Date',
          initial: movie.releaseDate,
          mask: 'YYYY-MM-DD'
        },
        {
          type: 'text',
          name: 'bomId',
          message: 'Box Office Mojo ID',
          initial: movie.bomId
        },
        {
          type: 'text',
          name: 'imdbId',
          message: 'IMDb ID',
          initial: movie.imdbId
        },
        {
          type: 'text',
          name: 'posterUrl',
          message: 'Poster URL',
          initial: movie.posterUrl
        },
        {
          type: 'text',
          name: 'youtubeId',
          message: 'YouTube trailer ID',
          initial: movie.youtubeId
        }
        ];

        // first we need to get and validate the draft selection
        (async () => {
          var movie = await prompts(movieSchema)
          if (!movie) {
            console.log('Unable to get responses')
            process.exit(1)
          }
          movie.season = draft.season
          movie.year = draft.year
          movie.id = helpers.makeId([draft.season, draft.year, movie.name])
          editedMovies.push(movie)

          if (movieDocs.length > 0) {
            editMovies(movieDocs)
          } else {
            // delete the old records in case IDs have changed
            db.remove(draft, {
              multi: true
            }, function (err, count) {
              if (err) {
                console.log('Unable to remove old movies', err)
                process.exit(1)
              }
              helpers.shuffle(editedMovies)
              db.insert(editedMovies, function (err) {
                if (err) {
                  console.log('Unable to insert edited movies into draft database. ', err)
                  process.exit(1)
                }
                console.log('Movies successfully edited.')
              })
            })
          }
        })()
      })(movieDocs)
    })
  })
})()
