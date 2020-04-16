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
    value: 'summer'
  },
  {
    title: 'Winter',
    value: 'winter'
  }
  ]
},
{
  type: 'number',
  name: 'year',
  message: 'Enter a year (YYYY)',
  initial: 2020,
  min: 0,
  max: 9999
}
]

const movieSchema = [{
  type: 'text',
  name: 'name',
  message: 'Movie Name',
  validate: name => name.length < 1 ? 'Please enter a name.' : true
},
{
  type: 'date',
  name: 'releaseDate',
  message: 'US Release Date',
  initial: new Date(),
  mask: 'YYYY-MM-DD'
},
{
  type: 'text',
  name: 'imdbId',
  message: 'IMDb ID'
},
{
  type: 'text',
  name: 'posterUrl',
  message: 'Poster URL'
},
{
  type: 'text',
  name: 'youtubeId',
  message: 'YouTube trailer ID'
},
{
  type: 'toggle',
  name: 'done',
  message: 'Finished with draft?',
  active: 'Yes, finished',
  inactive: 'No, add more'
}
]

console.log('\tAdd movies to an existing draft and overwrite any existing movie list on the draft.');

// first we need to get and validate the draft selection
(async () => {
  var draft = await prompts(draftSchema)
  if (!draft) {
    console.error('Unable to get draft prompts')
    process.exit(1)
  }

  // look up and validate the draft document
  draftDb.count(draft, function (err, count) {
    if (err) {
      console.error('Unable to search database', err)
      process.exit(1)
    } else if (count < 1) {
      console.error('Unable to find matching draft. Please use the createDraft script first.')
      process.exit(1)
    } else if (count > 1) {
      console.error('Found ' + count + ' matching drafts when only 1 should exist. Try using createDraft script to overwrite existing drafts.')
      process.exit(1)
    } else {
      /*
       * If a draft exists, it may have a movie list. Although we're not
       * currently checking for existing movies, we may want to in the
       * future. In either case, for a consistent experience, the user
       * should confirm that they want to overwrite any existing data.
       */
      (async () => {
        var overwrite = await prompts({
          type: 'toggle',
          name: 'confirmed',
          message: () => {
            console.log('Draft found. It may already have an existing movie list. You can edit the list using the editMovies script.\nIf you continue, you will overwrite the existing list.')
            return 'Stop now, or continue with overwrite?'
          },
          active: 'Continue (Overwrite)',
          inactive: 'Stop'
        })
        if (!overwrite) {
          console.error('Unable to get response')
          process.exit(1)
        }
        if (overwrite.confirmed) {
          db.remove(draft, {
            multi: true
          }, function (err, count) {
            if (err) {
              console.error('Unable to remove old movies', err)
              process.exit(1)
            }
          })

          /*
           * Loop until user indicates movie entry is done, then write
           * the info to the movie doc.
           */
          var movies = [];

          (async function getMovie () {
            var movie = await prompts(movieSchema)
            if (!movie) {
              console.error('Unable to get movie prompts')
              process.exit(1)
            }

            var finished = movie.done
            delete movie.done
            movie.season = draft.season
            movie.year = draft.year
            movie._id = helpers.makeId([draft.season, draft.year, movie.name])
            movies.push(movie)
            console.log('\tMovies so far: ' + movies.length)

            if (finished) {
              // add order to movies array
              helpers.shuffle(movies)
              console.log(movies)
              db.insert(movies, function (err) {
                if (err) {
                  console.log('Unable to insert movies into draft database: ' + err)
                  process.exit(1)
                }
                console.log('Movies added to draft.')
              })
            } else {
              getMovie()
            }
          })()
        } else {
          /* User opted not to overwrite movie list */
          console.log('Movie list creation halted.')
          process.exit(1)
        }
      })()
    }
  })
})()
