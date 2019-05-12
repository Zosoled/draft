var helpers = {};

// get the current date in YYYYMMDD format
helpers.currentDate = function() {
    return (new Date()).toISOString().slice(0,10).replace(/-/g,"");
}

// get the current draft
helpers.currentDraft = function() {
    return { season: "summer", year: "2019" };
}

// take an array, make them id/url friendly, then concat with a hyphen
helpers.makeID = function ( array ) {
    if ( ! Array.isArray( array ) ) {
        throw "Parameter is not an array";
    }

    for ( let i = 0; i < array.length; i++ ) {
        array[ i ] = encodeURIComponent( array[ i ] );
    }
    return array.join( '-' );
}

helpers.addRandomOrderElement = function (movies) {
    function shuffle (a) {
        var j, x, i;
        for (i = a.length; i; i -= 1) {
            j = Math.floor(Math.random() * i);
            x = a[i - 1];
            a[i - 1] = a[j];
            a[j] = x;
        }

        return a;
    }
    
    // first make an array of orders the same size
    var movie_order = new Array;
    for (var i = 0; i < movies.length; i++) {
        movie_order.push(i);
    }
    movie_order = shuffle(movie_order);
    
    for (var i = 0; i < movies.length; i++) {
        movies[i].order = movie_order[i];
    }

    return movies;
}

module.exports = helpers;
