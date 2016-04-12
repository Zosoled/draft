var config = {};

config.fs = {};
config.fs.data_path = __dirname + '/../data';
config.fs.tmp_dest = '/tmp'

config.aws = {};
config.aws.bucket = '';
config.aws.folder = 'movie_draft';

module.exports = config;
