const path = require("path");
const cwd = path.win32.resolve(__dirname);
const prompts = require("prompts");
const helpers = require(path.win32.normalize(cwd+"/../modules/helpers"));

var Datastore = require("nedb"),
	db = new Datastore({
		filename: path.win32.normalize(cwd+"/../data/movie.nedb"),
		autoload: true
	}),
	draftDb = new Datastore({
		filename: path.win32.normalize(cwd+"/../data/draft.nedb"),
		autoload: true
	});

// this governs the user prompts and valid responses
var draft_schema = [{
		type: "select",
		name: "season",
		message: "Pick a season",
		choices: [{
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
		message: "Enter a year (YYYY)",
		initial: 2020,
		min: 0,
		max: 9999
	}
];

var movie_schema = [{
		type: "text",
		name: "name",
		message: "Movie Name",
		validate: name => name.length < 1 ? 'Please enter a name.' : true
	},
	{
		type: "date",
		name: "release_date",
		message: "US Release Date",
		initial: new Date(2020, 1, 1),
		mask: "YYYY-MM-DD"
	},
	{
		type: "text",
		name: "bom_id",
		message: "Box Office Mojo ID"
	},
	{
		type: "text",
		name: "imdb_id",
		message: "IMDb ID"
	},
	{
		type: "text",
		name: "poster_url",
		message: "Poster URL"
	},
	{
		type: "text",
		name: "yt_id",
		message: "YouTube trailer ID"
	},
	{
		type: "toggle",
		name: "done",
		message: "Finished with draft?",
		active: "Yes",
		inactive: "No"
	}
];

console.log("This will add the movies to an existing draft.");
console.log("This will overwrite any existing movie list on the draft.");

// first we need to get and validate the draft selection
(async () => {
	var draft = await prompts(draft_schema);
	if (!draft) {
		console.error("Unable to get draft prompts");
		process.exit(1);
	}

	// look up and validate the draft document
	draftDb.count(draft, function (err, count) {
		if (err) {
			console.error("Unable to search database", err);
			process.exit(1);
		} else if (count < 1) {
			console.error("Unable to find matching draft. Please use the create_draft script first.");
			process.exit(1);
		} else if (count > 1) {
			console.error("Found " + count + " matching drafts when only 1 should exist. Try using create_draft script to overwrite existing drafts.");
			process.exit(1);
		} else {
			/*
			 * If a draft exists, it may have a movie list. Although we're not
			 * currently checking for existing movies, we may want to in the 
			 * future. In either case, for a consistent experience, the user
			 * should confirm that they want to overwrite any existing data.
			 */
			(async () => {
				var overwrite = await prompts({
					type: "confirm",
					name: "confirmed",
					message: "Movie list exists for this draft. Overwrite?"
				});
				if (!overwrite) {
					console.error("Unable to get response");
					process.exit(1);
				}
				if (overwrite.confirmed == false) {
					console.log("Movie list creation halted.");
					process.exit(1);
				} else {
					db.remove(draft, {
						multi: true
					}, function (err, count) {
						if (err) {
							console.error("Unable to remove old movies", err);
							process.exit(1);
						}
					});

					/*
					 * Loop until user indicates movie entry is done, then write the info to the
					 * movie doc.
					 */
					var movies = [];

					(async function getMovie() {
						var movie = await prompts(movie_schema);
						if (!movie) {
							console.error("Unable to get movie prompts");
							process.exit(1);
						}

						var finished = movie.done;
						delete movie.done;
						movie.season = draft.season;
						movie.year = draft.year;
						movie._id = helpers.makeID([draft.season, draft.year, movie.name]);
						movies.push(movie);
						console.log("    Movies so far: " + movies.length + "\n");

						if (finished) {
							// add order to movies array
							movies = helpers.addRandomOrderElement(movies);
							console.log(movies);
							db.insert(movies, function (err) {
								if (err) {
									console.log("Unable to insert movies into draft database: ", err);
									process.exit(1);
								}
								console.log("Movies added to draft.");
							});
						} else {
							getMovie();
						}
					})();
				}
			})();
		}
	});
})();