/* Initialize Postgres database */
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.PGURI,
  ssl: { rejectUnauthorized: false }
})

/* Build table creation query strings */
const pgSchema = [{
  name: 'draft',
  create: 'CREATE TABLE draft(' +
    'id char(16) primary key,' +
    'season text,' +
    'year int,' +
    'draftStart date,' +
    'draftEnd date,' +
    'seasonStart date,' +
    'seasonEnd date' +
  ');'
},
{
  name: 'movie',
  create: 'CREATE TABLE movie(' +
    'id char(16) primary key,' +
    'draftId char(16) references Draft(id),' +
    'name text,' +
    'releaseDate date,' +
    'imdbId text,' +
    'posterUrl text,' +
    'youtubeId text,' +
    'done bool' +
  ');'
},
{
  name: 'player',
  create: 'CREATE TABLE player(' +
    'id char(16) primary key,' +
    'movies movie[],' +
    'name text' +
  ');'
},
{
  name: 'team',
  create: 'CREATE TABLE team(' +
    'id char(16) primary key,' +
    'draftId char(16) references Draft(id),' +
    'players player[],' +
    'name text,' +
    'draftPosition int,' +
    'draftComplete bool' +
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
  console.log(results)
  return results
}

module.exports = {}
