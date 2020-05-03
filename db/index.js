/* First version of movie-draft app used NeDB for data storage */
const Datastore = require('nedb')
exports.draft = new Datastore({ filename: 'data/draft.nedb', autoload: true })
exports.movie = new Datastore({ filename: 'data/movie.nedb', autoload: true })
exports.team = new Datastore({ filename: 'data/team.nedb', autoload: true })
exports.value = new Datastore({ filename: 'data/value.nedb', autoload: true })

/* Initialize Postgres database */
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.PGURI,
  ssl: { rejectUnauthorized: false }
})

/* Build table creation query strings */
const pgSchema = [{
  name: 'Draft',
  create: 'CREATE TABLE Draft(' +
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
  create: 'CREATE TABLE Movie(' +
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
  create: 'CREATE TABLE Player(' +
    'Id char(16) primary key,' +
    'Name text,' +
    'Movies Movie[]' +
  ');'
},
{
  name: 'Team',
  create: 'CREATE TABLE Team(' +
    'Id char(16) primary key,' +
    'DraftId char(16) references Draft(Id),' +
    'Name text,' +
    'Players Player[],' +
    'DraftPosition int,' +
    'DraftComplete bool' +
  ');'
}
]
construct(pgSchema)

async function construct (pgSchema) {
  const tables = await getTables()
  for (let i = 0; i < pgSchema.length; i++) {
    let found = false
    for (let i = 0; i < tables.length && !found; i++) {
      if (tables[i].table_name === pgSchema[i].name) {
        found = true
      }
    }
    if (!found) {
      insertTable(pgSchema[i].create)
    }
  }
}

async function insertTable (table) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(table)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
  } finally {
    client.release()
  }
}

async function getTables () {
  const client = await pool.connect()
  let results = []
  try {
    const query = {
      text: 'SELECT * FROM information_schema.tables WHERE table_schema = $1',
      values: ['public']
    }
    const reply = await client.query(query)
    results = (reply) ? reply.rows : results
  } catch (e) {
    console.error(e)
  } finally {
    client.release()
  }
  return results
}
