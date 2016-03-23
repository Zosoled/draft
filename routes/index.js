var express = require('express');
var router = express.Router();
var Datastore = require('nedb')
  , db = new Datastore({ filename: 'data/draft.nedb', autoload: true });

/* GET home page. */
router.get('/', function(req, res, next) {
    var movies= [];

    db.find({}, function(err, docs) {
        if (err) { console.log("Unable to get draft documents",err); process.exit(1); };
console.log(docs);
        //if (docs.length !== 1) { console.log("Found an inappropriate number of documents: "+docs.length); process.exit(1); };

        movies = docs.movies;
    });
    res.render('index', { title: 'IDX Movie Draft', movies: movies });
});

module.exports = router;
