const AWS = require('aws-sdk')
const fs = require('fs')
const zlib = require('zlib')
const config = require('../modules/backupConfig.js')

// make sure there is a bucket
if (config.aws.bucket === '') {
  console.log('No S3 bucket name set in modules/backupConfig.js')
  process.exit(1)
}

// gzip all nedb files in the data directory to temp
fs.readdir(config.fs.dataPath, function (err, files) {
  if (err) {
    console.log('An error has occured reading the data directory', err)
    process.exit(1)
  }

  for (var i = 0; i < files.length; i++) {
    if (files[i].match(/nedb$/)) {
      var ipFile = config.fs.dataPath + '/' + files[i]
      var opFile = config.aws.folder + '/' + files[i] + '.gz'
      console.log('zipping and uploading ' + files[i])

      var body = fs.createReadStream(ipFile).pipe(zlib.createGzip())
      var s3 = new AWS.S3()
      var params = {
        Bucket: config.aws.bucket,
        Key: opFile,
        ContentEncoding: 'gzip',
        ACL: 'private',
        Body: body
      }
      s3.upload(params, function (err, data) {
        console.log(err, data)
      }).on('httpUploadProgress', function (evt) {
        console.log(evt)
      }).send(function (err, data) {
        console.log(err, data)
      })
    }
  }
})
