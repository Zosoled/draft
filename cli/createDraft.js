const db = require('../db')
const prompts = require('prompts')

const schema = [
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
  },
  {
    type: 'date',
    name: 'draft_start',
    message: 'Drafting Start Date',
    initial: new Date(),
    mask: 'YYYY-MM-DD'
  },
  {
    type: 'date',
    name: 'draft_end',
    message: 'Drafting End Date',
    initial: prev => new Date(prev),
    mask: 'YYYY-MM-DD'
  },
  {
    type: 'date',
    name: 'season_start',
    message: 'Season Start Date',
    initial: prev => new Date(prev),
    mask: 'YYYY-MM-DD'
  },
  {
    type: 'date',
    name: 'season_end',
    message: 'Season End Date',
    initial: prev => new Date(prev),
    mask: 'YYYY-MM-DD'
  }
]

console.log("Hello and welcome to new draft setup. We'll just need to answer a few questions.");

(async () => {
  const draft = await prompts(schema)
  if (!draft) {
    console.error('Unable to get prompt response')
    process.exit(1)
  }

  // lets see if the specified draft exists
  db.pg
    .query('SELECT id FROM draft WHERE season = $1 AND year = $2', [draft.season, draft.year])
    .then(res => {
      console.log('draftQuery results')
      console.log(res)
      console.log(res.rows)
      // if there's aleady a draft for this season and year
      if (res.rows.length !== 0) {
        (async () => {
          // prompt to see if we should overwrite the existing season information
          var overwrite = await prompts({
            type: 'toggle',
            name: 'confirmed',
            message: () => {
              console.log('A draft exists for this season and year.\nIf you continue, you will overwrite the existing movie list.')
              return 'Stop now, or continue with overwrite?'
            },
            active: 'Continue (Overwrite)',
            inactive: 'Stop'
          })

          if (!overwrite) {
            console.error('Unable to get response')
            process.exit(1)
          }

          // if overwrite draft accepted, then add the ID found so the DB knows to replace instead of add new
          if (overwrite.confirmed) {
            db.pg
              .query('DELETE FROM draft WHERE id = $1', [res.rows[0].id])
              .then(res => {
                console.log(res)
                db.pg
                  .insertJson('draft', { season: 'text', year: 'int', draft_start: 'date', draft_end: 'date', season_start: 'date', season_end: 'date' }, draft)
                  .then(res => {
                    console.log("Draft replaced. God speed. You'll need it.")
                  })
                  .catch(err => {
                    console.log('Unable to get insert new draft.', err)
                    process.exit(1)
                  })
              })
              .catch(err => {
                console.log('Unable to remove old draft.', err || '')
                process.exit(1)
              })
          } else {
            // if overwrite rejected, then stop insertion
            console.log('Draft creation halted.')
          }
        })()
      } else {
        // draft does not already exist, so insert it
        db.pg
          .insertJson('draft', { season: 'text', year: 'int', draft_start: 'date', draft_end: 'date', season_start: 'date', season_end: 'date' }, draft)
          .then(res => {
            console.log('Draft created!')
          })
          .catch(err => {
            console.log('Unable to get insert new draft.', err)
            process.exit(1)
          })
      }
    })
    .catch(err => {
      console.log('Unable to search database.', err || '')
      process.exit(1)
    })
})()
