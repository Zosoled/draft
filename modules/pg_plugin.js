/* Initialize Postgres database */
let pg_user = 'jcfdytkfjfekdz';
let pg_pw = 'dd9e14615e59b7153495f9d4aee8e1e512d0855d15610f5e67c7d003c2d6c41d';
let pg_host = 'ec2-54-225-242-183.compute-1.amazonaws.com';
let pg_port = '5432';
let pg_db = 'dftp19h0fcneq7';
let pg_uri = 'postgres://' + pg_user + ':' + pg_pw + '@' + pg_host + ':' + pg_port + '/' + pg_db;
const { Pool, Client } = require('pg');
const pool = new Pool({
	connectionString: process.env.DATABASE_URL || pg_uri,
	ssl: true
});

/* Build table creation query strings */
let pg_schema = new Array();
pg_schema.push(
	{
		name: 'draft',
		create: 'CREATE TABLE draft(' +
			'id				char(16)	primary key,' +
			'season			text,' +
			'year			int,' +
			'draft_start	date,' +
			'draft_end		date,' +
			'season_start	date,' +
			'season_end		date' +
		');'
	},
	{
		name: 'movie',
		create: 'CREATE TABLE movie(' +
			'id				char(16)	primary key,' +
			'draft_id		char(16)	references Draft(id),' +
			'name			text,' +
			'release_date	date,' +
			'bom_id 		text,' +
			'imdb_id 		text,' +
			'poster_url		text,' +
			'yt_id			text,' +
			'done			bool' +
		');'
	},
	{
		name: 'player',
		create: 'CREATE TABLE player(' +
			'id			char(16)	primary key,' +
			'movies		movie[],' +
			'name		text' +
		');'
	},
	{
		name: 'team',
		create: 'CREATE TABLE team(' +
			'id					char(16)	primary key,' +
			'draft_id			char(16)	references Draft(id),' +
			'players			player[],' +
			'name				text,' +
			'draft_position		int,' +
			'draft_complete		bool' +
		');'
	}
);
insertTables(pg_schema);


async function insertTables(pg_schema) {
	let currentTables = await getCurrentTables();
	for (let i=0; i<pg_schema.length; i++) {
		let found = false;
		for (let i=0; i<currentTables.length; i++) {
			if (currentTables[i].tablename == pg_schema[i].name) {
				found = true;
			}
		}
		if ( ! found ) {
			insertTable(pg_schema[i].create);
		}
	}
}

async function insertTable(tableSchema) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		await client.query(tableSchema);
		await client.query('COMMIT');
	} catch (e) {
		await client.query('ROLLBACK');
		console.log(e);
		throw e;
	} finally {
		client.release()
	}
}

async function getCurrentTables() {
	let client = await pool.connect();
	let results = new Array();
	try {
		let query = {
			text: 'SELECT * FROM pg_catalog.pg_tables WHERE tableowner != $1',
			values: ['postgres']
		}
		let reply = await client.query(query);
		results = (reply) ? reply.rows : results;
	} catch (e) {
		console.log(e);
		throw e;
	} finally {
		client.release()
	}
	console.log(results);
	return results;
}
