const db = require('../db')
const helpers = require('../modules/helpers.js')
const prompts = require('prompts')

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
    message: 'Enter a year',
    initial: new Date().getUTCFullYear(),
    min: 0,
    max: 9999
  }
];

// first we need to get an validate the draft selection
(async () => {
  const draft = await prompts(draftSchema)
  if (!draft) {
    console.log('Unable to get responses')
    process.exit(1)
  }

  // look up the draft document
  db.pg
    .query('SELECT id FROM draft WHERE season = $1 AND year = $2', [draft.season, draft.year])
    .then(res => {
      // if there are no docs, log and exit
      if (res.rows.length < 1) {
        console.error('Unable to find matching draft. Use the createDraft script first.')
        process.exit(1)
      } else if (res.rows.length > 1) {
        console.error(`Found ${res.rows.length} matching drafts when only 1 should exist. Try using createDraft script to overwrite existing drafts.`)
        process.exit(1)
      }

      const draft = res.rows[0]
      db.pg
        .query('SELECT * FROM movie WHERE draft_id = $1 ORDER BY release_date ASC', [draft.id])
        .then(res => {
          if (res.rows.length === 0) {
            console.log('Draft has no movies yet.')
            process.exit(1)
          }
          (async () => {
            // prompt for movie edits
            const editedMovies = []
            for (let i = 0; i < res.rows.length; i++) {
              const movie = res.rows[i]
              const movieSchema = [
                {
                  type: 'text',
                  name: 'name',
                  message: 'Movie Name',
                  initial: movie.name,
                  validate: name => name.length < 1 ? 'Please enter a name.' : true
                },
                {
                  type: 'date',
                  name: 'release_date',
                  message: 'US Release Date',
                  initial: movie.release_date,
                  mask: 'YYYY-MM-DD'
                },
                {
                  type: 'text',
                  name: 'imdb_id',
                  message: 'IMDb ID',
                  initial: movie.imdb_id
                },
                {
                  type: 'text',
                  name: 'poster_url',
                  message: 'Poster URL',
                  initial: movie.poster_url
                },
                {
                  type: 'text',
                  name: 'youtube_id',
                  message: 'YouTube trailer ID',
                  initial: movie.youtube_id
                }
              ]
              const newMovie = await prompts(movieSchema)
              if (!newMovie) {
                console.log('Unable to get responses.')
                process.exit(1)
              }
              newMovie.draft_id = movie.draft_id
              editedMovies.push(newMovie)
            }

            // delete the old movie records, then insert the new ones
            db.pg
              .query('DELETE FROM movie WHERE draft_id = $1', [draft.id])
              .then(res => {
                helpers.shuffle(editedMovies)
                db.pg
                  .insertJson('movie', { name: 'text', release_date: 'date', imdb_id: 'text', poster_url: 'text', youtube_id: 'text', draft_id: 'int' }, editedMovies)
                  .then(res => {
                    console.log(res.rows)
                    console.log('Movies successfully edited.')
                  })
                  .catch(err => {
                    console.log('Error inserting edited movies into draft database.\n', err)
                    process.exit(1)
                  })
              })
              .catch(err => {
                console.log('Unable to remove old movies.\n', err)
                process.exit(1)
              })
          })()
        })
        .catch(err => {
          console.log('Error getting movies.\n', err)
          process.exit(1)
        })
    })
    .catch(err => {
      console.log('Error getting draft.\n', err)
      process.exit(1)
    })
})()
