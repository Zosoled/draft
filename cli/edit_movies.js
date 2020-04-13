const Datastore = require("nedb");
const prompts = require("prompts");

const path = require("path");
const helpers = require(path.win32.resolve(__dirname, "../modules/helpers.js"));

var db = new Datastore({
	filename: path.win32.resolve(__dirname, "../data/movie.nedb"),
	autoload: true
});
var draftDb = new Datastore({
	filename: path.win32.resolve(__dirname, "../data/draft.nedb"),
	autoload: true
});

// this governs the user prompts and valid responses
var draft_schema = [
	{
		type: "select",
		name: "season",
		message: "Pick a season",
		choices: [
			{
				title: "Summer",
				value: "summer"
			},
			{
				title: "Winter",
				value: "winter"
			}
		]
	},
	{
		type: "number",
		name: "year",
		message: "Enter a year",
		initial: 2020,
		min: 0,
		max: 9999
	}
];

// first we need to get an validate the draft selection
(async () => {
	var draft = await prompts(draft_schema);
	if (!draft) { console.log("Unable to get responses"); process.exit(1); }

	// look up the draft document
	draftDb.count(draft).exec(function (err, count) {
		if (err) { console.log("Unable to get search database", err); process.exit(1); }

		// if there are no docs the error out
		if (count !== 1) { console.log("Unable to find appropriate draft. Please use the create_draft script first. Docs found: " + count); process.exit(1); }

		db.find(draft).sort({
			release_date: 1
		}).exec((err, movie_docs) => {
			if (movie_docs.length == 0) { console.log("Did not find any movie documents. ",err); process.exit(1); }
			var edited_movies = [];
			(async function editMovies(movie_docs) {
				var movie = movie_docs.shift();
				var movie_schema = [
					{
						type: "text",
						name: "name",
						message: "Movie Name",
						initial: movie.name,
						validate: name => name.length < 1 ? "Please enter a name." : true
					},
					{
						type: "date",
						name: "release_date",
						message: "US Release Date",
						initial: movie.release_date,
						mask: "YYYY-MM-DD"
					},
					{
						type: "text",
						name: "bom_id",
						message: "Box Office Mojo ID",
						initial: movie.bom_id
					},
					{
						type: "text",
						name: "imdb_id",
						message: "IMDb ID",
						initial: movie.imdb_id
					},
					{
						type: "text",
						name: "poster_url",
						message: "Poster URL",
						initial: movie.poster_url
					},
					{
						type: "text",
						name: "yt_id",
						message: "YouTube trailer ID",
						initial: movie.yt_id
					}
				];

				// first we need to get and validate the draft selection
				(async () => {
					var movie = await prompts(movie_schema);
					if (!movie) { console.log("Unable to get responses"); process.exit(1); }
					movie.season = draft.season;
					movie.year = draft.year;
					movie._id = helpers.makeID([draft.season, draft.year, movie.name]);
					edited_movies.push(movie);

					if (movie_docs.length > 0) {
						editMovies(movie_docs);
					} else {
						// delete the old records in case IDs have changed
						db.remove(draft, {multi: true}, function (err, count) {
							if (err) { console.log("Unable to remove old movies", err); process.exit(1); }
							edited_movies = helpers.addRandomOrderElement(edited_movies);
							db.insert(edited_movies, function (err) {
								if (err) { console.log("Unable to insert edited movies into draft database. ", err); process.exit(1); }
								console.log("Movies successfully edited.");
							});
						});
					}
				})();
			})(movie_docs);
		});
	});
})();
