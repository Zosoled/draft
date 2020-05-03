/* Initialize Postgres database */
const pgUser = 'jcfdytkfjfekdz'
const pgPassword = 'dd9e14615e59b7153495f9d4aee8e1e512d0855d15610f5e67c7d003c2d6c41d'
const pgHost = 'ec2-54-225-242-183.compute-1.amazonaws.com'
const pgPort = '5432'
const pgDatabase = 'dftp19h0fcneq7'
const pgUri = 'postgres://' + pgUser + ':' + pgPassword + '@' + pgHost + ':' + pgPort + '/' + pgDatabase
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || pgUri,
  ssl: true
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
insertTables(pgSchema)

async function insertTables (pgSchema) {
  const currentTables = await getCurrentTables()
  for (let i = 0; i < pgSchema.length; i++) {
    let found = false
    for (let i = 0; i < currentTables.length && !found; i++) {
      if (currentTables[i].tablename === pgSchema[i].name) {
        found = true
      }
    }
    if (!found) {
      insertTable(pgSchema[i].create)
    }
  }
}

async function insertTable (tableSchema) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(tableSchema)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    console.log(e)
    throw e
  } finally {
    client.release()
  }
}

async function getCurrentTables () {
  const client = await pool.connect()
  let results = []
  try {
    const query = {
      text: 'SELECT * FROM pg_catalog.pg_tables WHERE tableowner != $1',
      values: ['postgres']
    }
    const reply = await client.query(query)
    results = (reply) ? reply.rows : results
  } catch (e) {
    console.log(e)
    throw e
  } finally {
    client.release()
  }
  console.log(results)
  return results
}
