/* Initialize Postgres database */
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.PGURI,
  ssl: { rejectUnauthorized: false }
})

/* Build table creation query strings */
const pgSchema = [
  {
    name: 'Draft',
    create: 'CREATE TABLE IF NOT EXISTS draft(' +
      'id serial primary key,' +
      'season text,' +
      'year int,' +
      'draft_start date,' +
      'draft_end date,' +
      'season_start date,' +
      'season_end date' +
    ');'
  },
  {
    name: 'Movie',
    create: 'CREATE TABLE IF NOT EXISTS movie(' +
      'id serial primary key,' +
      'draft_id int references Draft(Id),' +
      'name text,' +
      'release_date date,' +
      'imdb_id text,' +
      'poster_url text,' +
      'youtube_id text' +
    ');'
  },
  {
    name: 'Player',
    create: 'CREATE TABLE IF NOT EXISTS player(' +
      'id serial primary key,' +
      'name text,' +
      'movies Movie[]' +
    ');'
  },
  {
    name: 'Team',
    create: 'CREATE TABLE IF NOT EXISTS team(' +
      'id serial primary key,' +
      'draft_id int references Draft(Id),' +
      'name text,' +
      'players Player[],' +
      'draft_position int,' +
      'draft_complete bool' +
    ');'
  }
]

/* Construct the PostgreSQL schema */
let transaction = 'BEGIN;'
for (let i = 0; i < pgSchema.length; i++) {
  transaction += pgSchema[i].create
}
transaction += 'COMMIT;'

pool.query(transaction)
  .catch(e => {
    console.error('PostgreSQL schema initialization failed.' + e)
    pool.query('ROLLBACK;')
  })

/* Wrap db statements */
module.exports = {
  pg: {
    query: (text, values) => { return pool.query(text, values) }
  }
}
