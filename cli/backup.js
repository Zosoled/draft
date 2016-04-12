var zlib = require('zlib');
var fs = require('fs');
var AWS = require('aws-sdk');
var config = require('../modules/backup_config');

// make sure there is a bucket
if (config.aws.bucket == '') {
    console.log('No S3 bucket name set in modules/backup_config.js');
    process.exit(1);
}

// gzip all nedb files in the data directory to temp
fs.readdir(config.fs.data_path, function(err, files) {
    if (err) { console.log('An error has occured reading the data directory',err); process.exit(1); }

    for (var i = 0; i < files.length; i++) {
        if (files[i].match(/nedb$/)) {
            var ip_file = config.fs.data_path + '/' + files[i];
            var op_file = config.aws.folder + '/' + files[i] + '.gz'
            console.log("zipping and uploading" + files[i]);

            var body = fs.createReadStream(ip_file).pipe(zlib.createGzip());
            var s3_obj = new AWS.S3({params: { 
                Bucket: config.aws.bucket, 
                Key: op_file,
                ContentEncoding: 'gzip',
                ACL: 'private'
            }});
            s3_obj.upload({ Body: body }).
                on('httpUploadProgress', function(evt) { console.log(evt); }).
                send(function(err, data) { console.log(err, data) });
        }
    }
});
