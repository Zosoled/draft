const db = require('../db')
const prompts = require('prompts')
const path = require('path')
const helpers = require(path.win32.resolve(__dirname, '../modules/helpers.js'))

// this governs the user prompts and valid responses
const draftSchema = [
  {
    type: 'select',
    name: 'season',
    message: 'Pick a season',
    choices: [
      {
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
    message: 'Enter a year (YYYY)',
    initial: 2020,
    min: 0,
    max: 9999
  }
]

const movieSchema = [
  {
    type: 'text',
    name: 'name',
    message: 'Movie Title',
    validate: value => value.length < 1 ? 'Please enter a name.' : true
  },
  {
    type: 'date',
    name: 'release_date',
    message: 'US Release Date',
    initial: new Date(),
    mask: 'YYYY-MM-DD',
    validate: value => value instanceof Date ? true : 'Please enter a date.'
  },
  {
    type: 'text',
    name: 'imdb_id',
    message: 'IMDb ID',
    initial: 'tt0000001',
    validate: value => {
      if (value.length < 1) return 'Please enter a value.'
      else if (RegExp(/^tt\d{7,8}$/).test(value) === false) return 'Please enter a valid IMDb ID.'
      else return true
    }
  },
  {
    type: 'text',
    name: 'poster_url',
    message: 'Poster URL',
    initial: 'https://www.imdb.com/title/tt0000001/mediaviewer/rm2384026624',
    validate: value => value.length < 1 ? 'Please enter a URL.' : true
  },
  {
    type: 'text',
    name: 'youtube_id',
    message: 'YouTube trailer ID',
    initial: 'dQw4w9WgXcQ',
    validate: value => value.length < 1 ? 'Please enter a value.' : true
  },
  {
    type: 'toggle',
    name: 'done',
    message: 'Finished with draft?',
    active: 'Yes, finished',
    inactive: 'No, add more'
  }
]

const onCancel = (prompt, answers) => {
  console.log('Cancelled movie entry.')
  process.exit(1)
}

console.log('\tAdd movies to an existing draft and overwrite any existing movie list on the draft.');

// first we need to get and validate the draft selection
(async () => {
  let draft = await prompts(draftSchema)
  if (!draft) {
    console.error('Unable to get draft prompts.')
    process.exit(1)
  }

  // look up and validate the draft document
  db.pg
    .query('SELECT id FROM draft WHERE season = $1 AND year = $2', [draft.season, draft.year])
    .then(res => {
      if (res.rows.length < 1) {
        console.error('Unable to find matching draft. Please use the createDraft script first.')
        process.exit(1)
      } else if (res.rows.length > 1) {
        console.error('Found ' + res.rows.length + ' matching drafts when only 1 should exist. Try using createDraft script to overwrite existing drafts.')
        process.exit(1)
      } else {
        draft = res.rows[0];
        /*
         * If a draft exists, it may have a movie list. Although we're not
         * currently checking for existing movies, we may want to in the
         * future. In either case, for a consistent experience, the user
         * should confirm that they want to overwrite any existing data.
         */
        (async () => {
          const overwrite = await prompts({
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
            console.error('Unable to get response.')
            process.exit(1)
          }
          if (overwrite.confirmed) {
            db.pg
              .query('DELETE FROM movie WHERE draft_id = $1', [res.rows[0].id])
              .catch(err => {
                console.error('Unable to remove old movies.', err)
                process.exit(1)
              })

            /*
             * Loop until user indicates movie entry is done, then write
             * the info to the movie doc.
             */
            const movies = [];

            (async function getMovie () {
              const movie = await prompts(movieSchema, { onCancel })
              if (!movie) {
                console.error('Unable to get movie prompts.')
                process.exit(1)
              }

              const finished = movie.done
              delete movie.done
              movie.draft_id = draft.id
              movies.push(movie)
              console.log('\tMovies so far: ' + movies.length)

              if (finished) {
                helpers.shuffle(movies)
                console.log(movies)
                db.pg
                  .query('INSERT INTO movie() VALUES($1)', [movies])
                  .then(res => {
                    console.log('Movies added to draft.')
                  })
                  .catch(err => {
                    console.log('Unable to insert movies into draft database.' + err)
                    process.exit(1)
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
    .catch(err => {
      console.error('Unable to search database.', err)
      process.exit(1)
    })
})()
