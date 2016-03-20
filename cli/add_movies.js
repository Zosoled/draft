var Datastore = require('nedb')
  , db = new Datastore({ filename: '../data/draft.nedb', autoload: true });
var prompt = require('prompt');
var async = require("async");

// this governs the user prompts and valid responses
var draft_schema = {
    properties: {
        season: {
            description: "Season (Summer/Winter)",
            pattern: /^(summer|winter)$/i,
            message: '"summer" or "winter"',
            required: true,
            before: function (input) {
                return input.toLowerCase();
            }
        },
        year: {
            description: "Year (YYYY)",
            pattern: /^20\d{2}$/,
            message: "Four digit year only",
            required: true
        }
    }
}

var movie_schema = {
    properties: {
        name: {
            description: "Movie Name",
            required: true
        },
        release_date: {
            description: "US Release Date",
            pattern: /^20\d{6}$/,
            message: "YYYYMMDD format",
            required: true
        },
        bom_id: {
            description: "BoxOfficeMojo ID",
            pattern: /.+\.htm$/,
            message: "BOM IDs end in .htm",
            required: true
        },
        trailer_url: {
            description: "URL for Trailer",
            pattern: /^http.+$/,
            message: "Full URL please",
            required: true
        },
        poster_url: {
            description: "Poster URL",
            pattern: /^http.+$/,
            message: "Full URL please",
        },
        done: {
            description: "Finished (y/N)",
        }
    }
}

prompt.start();

console.log("This will add the movies to an existing draft.");
console.log("This will overwrite any existing movie list on thedraft.");

// an array to hold all the movies as we loop though prompts
var movies = [];

// this (when true) will end the movie addition loop
var entry_done = false;

// first we need to get an validate the draft selection
prompt.get(draft_schema, function(err,draft) {
    if (err) { console.log("Unable to get prompt response",err); process.exit(1); };

    // look up the draft document
    db.find({ season: draft.season, year: draft.year }, function (err, docs) {
        if (err) { console.log("Unable to get search database",err); process.exit(1); };
        
        // if there are no docs the error out
        if (docs.length !== 1) {
            console.log("Unable to find appropriate draft. Please use the create_draft script first");
            process.exit(1);
        }

        // loop until we're have our done criteria
        // then run the callback to write the info to the movie doc
        async.until(
            function() {
                return entry_done;
            }, function(callback) {
                prompt.get(movie_schema, function (err,movie) {
                    if (err) { callback("Unable to get search database - "+err,null); };
       
                    if (movie.done == 'y' || movie.done == 'Y')
                        entry_done = true;

                    delete movie.done;
                    movies.push(movie);

                    // a little formatting and output
                    console.log("    -Movies so far: "+movies.length+"\n");

                    callback(null,movies);
                });
            }, function(err,res) {
                console.log("callback called")
                // add the movies to the existing doc
                docs[0].movies = movies;
                console.log(docs[0]);

                //db.insert(doc)
            }
        );
    });
});
