var helpers = {};

// get the current date in YYYYMMDD format
helpers.currentDate = function() {
    return (new Date()).toISOString().slice(0,10).replace(/-/g,"");
}

// get the current draft
helpers.currentDraft = function() {
    return { season: "summer", year: "2016" };
}

// take an array, make them id/url friendly, then concat with a hyphen
helpers.makeID = function(thing) {
    if (typeof thing == "string") {
        thing = [ thing ];
    }
    else if (!Array.isArray(thing)) {
        return false;
    }

    for (var i = 0; i < thing.length; i++) {
        thing[i] = thing[i].replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_]/,"");
    }
    return thing.join('-');
}

module.exports = helpers;
