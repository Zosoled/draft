const db = require('../db')
const prompts = require('prompts')

const schema = [
  {
    type: 'select',
    name: 'Season',
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
    name: 'Year',
    message: 'Enter a year',
    initial: new Date().getUTCFullYear(),
    min: 0,
    max: 9999
  },
  {
    type: 'date',
    name: 'DraftStart',
    message: 'Drafting Start Date',
    initial: new Date(),
    mask: 'YYYY-MM-DD'
  },
  {
    type: 'date',
    name: 'DraftEnd',
    message: 'Drafting End Date',
    initial: prev => new Date(prev),
    mask: 'YYYY-MM-DD'
  },
  {
    type: 'date',
    name: 'SeasonStart',
    message: 'Season Start Date',
    initial: prev => new Date(prev),
    mask: 'YYYY-MM-DD'
  },
  {
    type: 'date',
    name: 'SeasonEnd',
    message: 'Season End Date',
    initial: prev => new Date(prev),
    mask: 'YYYY-MM-DD'
  }
]

console.log("Hello and welcome to new draft setup. We'll just need to answer a few questions.");

(async () => {
  const result = await prompts(schema)
  if (!result) {
    console.error('Unable to get prompt response')
    process.exit(1)
  }

  // lets see if the specified draft exists
  db.draft.find({
    season: result.season,
    year: result.year
  }, function (err, docs) {
    if (err || !docs) {
      console.log('Unable to search database', err || '')
      process.exit(1)
    }

    // check to see if there's aleady a draft for this season and year
    if (docs.length !== 0) {
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

        // if we got a yes prompt then add the ID we found so the DB knows to replace instead of add new
        if (overwrite.confirmed) {
          db.draft.remove({
            season: result.season,
            year: result.year
          }, {
            multi: true
          }, function (err, numRemoved) {
            if (err || !numRemoved) {
              console.log('Unable to remove old draft', err || '')
              process.exit(1)
            }
            db.draft.persistence.compactDatafile()
            db.draft.insert(result, function (err, resp) {
              if (err) {
                console.log('Unable to get insert new draft', err)
                process.exit(1)
              }
            })
          })
          console.log("Draft replaced. God speed. You'll need it.")
        } else {
          // if we got something other than a yes response then we stop insertion
          console.log('Draft creation halted.')
        }
      })()
    } else {
      db.draft.insert(result, function (err, resp) {
        if (err) {
          console.log('Unable to get insert new draft', err)
          process.exit(1)
        }
        console.log('Draft created. All hail George Lucas, king of the pizza buffet.')
      })
    }
  })
})()
