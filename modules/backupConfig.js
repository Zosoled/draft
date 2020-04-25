const path = require('path')
var config = {}
config.fs = {}
config.fs.dataPath = path.win32.resolve(__dirname, '../data')
config.fs.tmpPath = '/tmp'

config.aws = {}
config.aws.bucket = 'a'
config.aws.folder = 'movieDraft'

module.exports = config
