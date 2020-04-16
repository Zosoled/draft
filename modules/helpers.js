var helpers = {}

// get the current draft
helpers.currentDraft = function () {
  return { season: 'summer', year: 2020 }
}

// take an array, make them id/url friendly, then concat with a hyphen
helpers.makeID = function (thing) {
  if (typeof thing === 'string') {
    thing = [thing]
  } else if (!Array.isArray(thing)) {
    return false
  }

  for (var i = 0; i < thing.length; i++) {
    if (typeof thing[i] === 'string') {
      thing[i] = thing[i].replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/, '')
    }
  }
  return thing.join('-')
}

/** Shuffles the order of items in an array. */
helpers.shuffle = function (arrayToShuffle) {
  if (!arrayToShuffle || !arrayToShuffle.length) throw new TypeError('Invalid argument')
  for (let i = arrayToShuffle.length; i > 0; i--) {
    let j = Math.floor(Math.random() * i)
    let x = arrayToShuffle[i - 1]
    arrayToShuffle[i - 1] = arrayToShuffle[j]
    arrayToShuffle[j] = x
  }
}

module.exports = helpers
