const db = require('../db')
const https = require('https')
const helpers = require('../modules/helpers.js')

const currentDraft = helpers.currentDraft()
const now = new Date()

db.pg
  .query('SELECT m.* FROM movie AS m INNER JOIN draft AS d ON(m.draft_id = d.id) WHERE d.season = $1 and d.year = $2', [currentDraft.season, currentDraft.year])
  .then(res => {
    // filter out movies not yet released
    const openMovies = []
    res.rows.forEach(m => {
      if (m.release_date <= now) {
        openMovies.push(m)
      }
    })
    console.log(`Found ${openMovies.length} movies to scrape.`)

    // begin scraping released movies
    console.log('Initiating scrape sequence…')
    for (let i = 0; i < openMovies.length; i++) {
      scrape(openMovies[i])
    }
  })
  .catch(err => {
    console.error('Error getting movies from draft.\n', err)
  })

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getRandom (min, max) {
  min = Math.floor(min)
  max = Math.floor(max)
  const value = Math.random() * (max - min) + min
  return Math.floor(value)
}

async function scrape (movie) {
  const delay = getRandom(0, 30000)
  sleep(delay).then(() => {
    console.log(`Scraping ${movie.name} after ${delay}ms delay`)
    // set the unique path for this movie
    const moviePath = '/title/' + movie.imdb_id + '/'

    // set the options for the get request
    const options = {
      host: 'www.imdb.com',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
      },
      path: moviePath
    }

    https
      .get(options, res => {
        res.setEncoding('utf8')
        res.on('data', function (body) {
          const lines = body.split(/\r?\n/)
          for (let k = 0; k < lines.length; k++) {
            if (typeof lines[k] === 'string' && lines[k].match(/.*Gross USA.*/)) {
              const gross = lines[k].replace(/^.*Gross USA.+?\$([0-9,]+).+$/i, '$1').replace(/\D/g, '')
              console.log(`${movie.name}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(gross)}`)
              db.pg
                .query('UPDATE movie SET gross = $1 WHERE id = $2 RETURNING id', [gross, movie.id])
                .then(res => {
                  console.log(res.rows)
                })
                .catch(err => {
                  console.error('Error updating movie gross.\n', err)
                  process.exit(1)
                })
            }
          }
        })
      })
      .on('error', err => {
        console.error('Error requesting IMDb page.\n', err)
      })
  })
}
