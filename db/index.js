/* First version of movie-draft app used NeDB for data storage */
const Datastore = require('nedb')

/* Initialize Postgres database */
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.PGURI,
  ssl: { rejectUnauthorized: false }
})

/* Build table creation query strings */
const pgSchema = [{
  name: 'Draft',
  create: 'CREATE TABLE IF NOT EXISTS Draft(' +
    'Id char(16) primary key,' +
    'Season text,' +
    'Year int,' +
    'DraftStart date,' +
    'DraftEnd date,' +
    'SeasonStart date,' +
    'SeasonEnd date' +
  ');'
},
{
  name: 'Movie',
  create: 'CREATE TABLE IF NOT EXISTS Movie(' +
    'Id char(16) primary key,' +
    'DraftId char(16) references Draft(Id),' +
    'Name text,' +
    'ReleaseDate date,' +
    'ImdbId text,' +
    'PosterUrl text,' +
    'YoutubeId text' +
  ');'
},
{
  name: 'Player',
  create: 'CREATE TABLE IF NOT EXISTS Player(' +
    'Id char(16) primary key,' +
    'Name text,' +
    'Movies Movie[]' +
  ');'
},
{
  name: 'Team',
  create: 'CREATE TABLE IF NOT EXISTS Team(' +
    'Id char(16) primary key,' +
    'DraftId char(16) references Draft(Id),' +
    'Name text,' +
    'Players Player[],' +
    'DraftPosition int,' +
    'DraftComplete bool' +
  ');'
}
]

/* Construct the PostgreSQL schema */
let transaction = 'BEGIN;'
for (let i = 0; i < pgSchema.length; i++) {
  transaction += pgSchema[i].create
}
transaction += 'COMMIT;'
console.log(transaction)
pool.query(transaction)
  .catch(e => {
    console.error('PostgreSQL schema initialization failed.' + e)
    pool.query('ROLLBACK;')
  })

/* Wrap db statements */
module.exports = {
  pg: {
    query: (q, p) => { return pool.query(q, p) }
  },
  draft: new Datastore({ filename: 'data/draft.nedb', autoload: true }),
  movie: new Datastore({ filename: 'data/movie.nedb', autoload: true }),
  team: new Datastore({ filename: 'data/team.nedb', autoload: true }),
  value: new Datastore({ filename: 'data/value.nedb', autoload: true })
}
