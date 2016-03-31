var async = require('async');
var express = require('express');
var router = express.Router();
var helpers = require(global.appRoot + '/modules/helpers.js');
var Datastore = require('nedb');
var db = new Object;
db.draft = new Datastore({ filename: 'data/draft.nedb', autoload: true });
db.movie = new Datastore({ filename: 'data/movie.nedb', autoload: true });

/* GET home page. */
router.get('/', function(req, res, next) {
    var current_draft = helpers.currentDraft();
    if (typeof current_draft == 'object') {
        var selection_draft = current_draft;
    }

    db['movie'].find( selection_draft ).sort({ release_date: 1 }).exec( function(err, movie_docs) {
        if (err) { console.log("Unable to get movie documents",err); process.exit(1); };

        // get the draft details as well
        db['draft'].findOne( selection_draft ).exec(function(err, draft_doc) {
            if (err) { console.log("Unable to get movie documents",err); process.exit(1); };
            selection_draft.draft_start = draft_doc.draft_start;
            selection_draft.draft_end = draft_doc.draft_end;
            selection_draft.season_start = draft_doc.season_start;
            selection_draft.season_end = draft_doc.season_end;

            res.render('index', { title: 'IDX Movie Draft', movies: movie_docs, current_draft: selection_draft });
        });
    });
});

// team addtions page
router.get('/add_team', function(req, res, next) {
    var current_draft = helpers.currentDraft();
    if (typeof current_draft == 'object') {
        var selection_draft = current_draft;
    }

    // create a bool to decide if required fields should be highlighted
    if (req.query.hasOwnProperty("required")) {
        var highlight_required = true;
    } else {
        var highlight_required = false;
    }

    res.render('add_team', {title: 'Add a drafting team', current_draft: selection_draft, highlight_required: highlight_required});
});

// add_team processor
router.post('/add_team', function(req, res, next) {
    var required = [
        req.body.team_name,
        req.body.member[0],
        req.body.member[1],
        req.body.member[2]
    ].forEach(function (elm) {
        if (typeof elm != "string" || elm.length == 0) {
            res.status(200).redirect("/add_team?required");
        }
    });

    // there's a number of steps we want to do in series
    async.waterfall([
        async.apply(checkName,req.body),
        makeID,
        translateMembers,
        insertTeam
    ],
    function (errs,final_res) {
        if (errs) { console.log("An error has occured ",errs); process.exit(1); } 

        if (typeof final_res == "object") {
            res.status(200).redirect("/");
        }
    });


    // check to see if the name is taken
    function checkName (body, callback) {
        callback(null,body);
    }

    // add the body
    function makeID (body, callback) {
        body._id = helpers.makeID([ body.season, body.year, body.team_name ]);

        if (typeof body._id != "string") {
            callback("Did not get string from makeID",null);
        }
        else {
            callback(null,body);
        }
    }

    // turn the members array into an object
    function translateMembers (body, callback) {
        // make the members into objects
        for (var i = 0; i < 8; i++) {
            body.member[i] = { name: body.member[i] };
        }

        callback(null,body);
    }

    // insert into the database
    function insertTeam(body, callback) {
        callback(null,body);
    }

    /*db.team = new Datastore({ filename: 'data/team.nedb', autoload: true });
    db['team'].insert(req.body, function(err) {
        if (err) { console.log("Unable to insert into team db.",err); process.exit(1); }

        res.status(200).redirect("/");
    });*/

});

module.exports = router;
