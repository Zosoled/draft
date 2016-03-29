var helpers = {};

// get the current date in YYYYMMDD format
helpers.currentDate = function() {
    return (new Date()).toISOString().slice(0,10).replace(/-/g,"");
}

// get the current draft
helpers.currentDraft = function() {
    return { season: "summer", year: "2016" };
}

module.exports = helpers;
