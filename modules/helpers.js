var helpers = {}

/** Get the current draft */
helpers.currentDraft = function () {
  return { season: 'Summer', year: 2020 }
}

/** Concatenates an array of items into a URL-friendly pseudo-ID string */
helpers.makeId = function (itemsToConcatenate) {
  const a = []
  for (let i = 0; i < itemsToConcatenate.length; i++) {
    a[i] = String(itemsToConcatenate[i])
      .replace(/\s/g, '_')
      .replace(/[^a-zA-Z0-9_]/, '')
  }
  return a.join('-')
}

/** Shuffles the order of items in an array. */
helpers.shuffle = function (arrayToShuffle) {
  if (!arrayToShuffle || !arrayToShuffle.length) throw new TypeError('Invalid argument')
  for (let i = arrayToShuffle.length; i > 0; i--) {
    const j = Math.floor(Math.random() * i)
    const x = arrayToShuffle[i - 1]
    arrayToShuffle[i - 1] = arrayToShuffle[j]
    arrayToShuffle[j] = x
  }
}

module.exports = helpers
