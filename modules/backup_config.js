const path = require('path')
var config = {}
config.fs = {}
config.fs.data_path = path.win32.resolve(__dirname, '../data')
config.fs.tmp_dest = '/tmp'

config.aws = {}
config.aws.bucket = 'a'
config.aws.folder = 'movie_draft'

module.exports = config
