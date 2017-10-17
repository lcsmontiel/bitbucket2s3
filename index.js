'use strict'

var s3Config = require("./config/s3.json");
var bitbucketConfig = require('./config/bitbucket.json');

var fs = require('fs');
var path = require('path');

var aws = require('aws-sdk');
var s3 = new aws.S3({apiVersion: "2006-03-01"});

var decompress = require('decompress');
var archiver = require('archiver');
var shell = require('shelljs');
var bitbucketEvent = null;

exports.handler = function(event, context,callback) {
    console.log("Function started!");
    bitbucketEvent = event;
    bitbucketEvent.fileLocation = "/tmp/"+(bitbucketEvent.repoName).toLowerCase()+".zip";
    lambda().then(function(success){
        callback(null,success.message);
    },function(error){
        callback(error.message);
    });
};

const lambda = function(){
    return new Promise(function(resolve, reject) {
        if((bitbucketConfig.branches).indexOf(bitbucketEvent.branch) < 0){
            reject({'success' : false,'message' : 'No configured build for this branch!'});
        } else {
            bitbucket().then(function(success){
                resolve(success);
            },function(error){
                reject(error);
            });
        }
    });
};

const bitbucket = function(){
    console.log('Branch integration of '+bitbucketEvent.branch+' initialized...');

    return new Promise(function(resolve, reject) {
        var credentials = bitbucketConfig.user+":"+bitbucketConfig.password;
        var curlURL = "https://"+credentials+"@bitbucket.org/" + bitbucketEvent.owner+"/"+bitbucketEvent.repoName+"/get/"+bitbucketEvent.branch+".zip";

        var curl = "curl --silent -L "+curlURL+" > "+bitbucketEvent.fileLocation;
        console.log("Downloading file from Bitbucket.org...");
        console.log(curl);
        if (shell.exec(curl).code !== 0) {
            reject({'success' : false,'message' : "Can't Download File!"});
        } else {
            unzipFile().then(function(success){
                resolve(success);
            },function(error){
                reject(error);
            });
        }
    });
};

const unzipFile = function () {
    return new Promise(function(resolve, reject) {
        decompress(bitbucketEvent.fileLocation, path.dirname(bitbucketEvent.fileLocation)).then(function(success){
            shell.rm('-rf',bitbucketEvent.fileLocation);
            var path = "/tmp/"+success[0].path;
            console.log("File unzipped!");
            reZipFile(path).then(function(success){
                resolve(success);
            },function(error){
                reject(error);
            });
        },function(){
            reject({'success' : false,'message' : "Can't unzip file"});
        });
    });
};

const reZipFile = function(path){
    console.log('Re-ziping file with correct structure...');

    return new Promise(function(resolve, reject) {
        var output = fs.createWriteStream(bitbucketEvent.fileLocation);
        var archive = archiver('zip', {zlib: { level: 9 }});
        archive.pipe(output);
        archive.directory(path, false);
        archive.finalize().then(function() {
            shell.rm('-rf',path);
            console.log("File zipped to "+bitbucketEvent.fileLocation);
            upload2s3().then(function(success){
                resolve(success);
            },function(error){
                reject(error);
            });
        },function() {
            reject({'success' : false,'message' : "Can't zip file"});
        });
    });
};

const upload2s3 = function (){
    return new Promise(function(resolve, reject) {
        console.log("Loading file for stream...");

        var fileStream = fs.createReadStream(bitbucketEvent.fileLocation);
        fileStream.on('error', function (err) {
            console.log('File Error', err);
            reject({'success' : false,'message' : 'File Error!'});
        });

        fileStream.on('open', function () {
            console.log("Uploading file before downloaded to S3...");
            s3.upload({
                Bucket: s3Config.bucket,
                Key: (bitbucketEvent.repoName).toLowerCase() + "/" + bitbucketEvent.branch+".zip",
                Body: fileStream
            }, function (err, data) {
                if (err) {
                    reject({'success' : false,'message' : 'Uploading error!'});
                }
                if (data) {
                    console.log("Upload Success!", data.Location);
                    resolve({'success' : true,'message' : 'Success!'});
                }
            });
        });
    });
};