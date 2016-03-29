var express = require('express');
var router = express.Router();
var helper = require(global.appRoot + '/modules/helpers.js');
var Datastore = require('nedb');
var db = new Object;
db.draft = new Datastore({ filename: 'data/draft.nedb', autoload: true });
db.movie = new Datastore({ filename: 'data/movie.nedb', autoload: true });

/* GET home page. */
router.get('/', function(req, res, next) {
    var current_draft = helper.currentDraft();
    if (typeof current_draft == 'object') {
        var selection_draft = current_draft;
    }
console.log(selection_draft);

    db['movie'].find( selection_draft ).sort({ release_date: 1 }).exec( function(err, docs) {
        if (err) { console.log("Unable to get movie documents",err); process.exit(1); };

        res.render('index', { title: 'IDX Movie Draft', movies: docs });
    });
});

/* team addtions page */
router.get('/add_team', function(req, res, next) {

    res.render('add_team', {title: 'Add a drafting team' });
});

module.exports = router;
