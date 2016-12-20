// upsert-tags.js creates a temporary directory, clones the
// CuratedCourses standards repo in it, and converts the .json files
// therein into documents in the mongodb Tag collection.

// Because of require('dotenv'), this should be run from the root
// directory of the CuratedCourses project

'use strict';

var GIT_URL = 'https://github.com/kisonecat/standards.git';

var fs                = require('fs');
var path              = require('path');
var process           = require('process');
var config            = require('../config/config');
var mongoose          = require('mongoose');
var colors            = require('colors');
var async             = require('async');
var spawn             = require('child_process').spawn;
var recursive         = require('recursive-readdir');
    
mongoose.connect(config.mongodb.url);
var db = mongoose.connection;

var Tag = require('../models/Tag.js');

function addOrUpdateStandard( standard, callback ) {
    // Mongo wants _id instead of id
    if (standard.id) {
	standard._id = standard.id;
	delete standard.id;
    }

    // Upsert the provided data
    Tag.findOneAndUpdate({_id: standard._id}, standard, {upsert:true}, function(err, doc){
	if (err)
	    callback(err);
	else {
	    console.log( "upsert " + standard._id );
	    callback(null);
	}
	
	return;
    });
}

/* Walk through the pathname directory finding .json files and applynig addOrUpdateStandard to the data in those files */
function processStandards( pathname, callback ) {
    recursive(pathname, function (err, files) {
	if (err)
	    callback(err);
	else {
	    async.each( files, function(filename, callback) {
		if (path.extname(filename) != '.json') {
		    callback(null);
		} else {
		    var filenameId = path.relative( pathname, filename ).replace( /\.json$/, '' ).replace( /\//g, '.' );
		    
		    fs.readFile(filename, 'utf8', function (err, data) {
			if (err)
			    callback(err);
			else {
			    var standard = JSON.parse(data);

			    if (standard.id != filenameId)
				callback( "Mismatch between filename and the id in .json for file " + filename );
			    else {
				addOrUpdateStandard( standard, callback );
			    }
			}
		    });
		}
	    }, callback );
	}
    });
}

////////////////////////////////////////////////////////////////
db.on('error', function () {
  console.log('MongoDB Connection Error. Please make sure MongoDB is running.'.red.bold);
  process.exit(0);
});

////////////////////////////////////////////////////////////////
db.on('open', function () {
    console.log('Mongodb ' + 'connected!'.green.bold);

    var tmp = require('tmp');

    tmp.dir({prefix:'git-',unsafeCleanup: true},
	    function _tempDirCreated(err, pathname, cleanupCallback) {
		if (err) throw err;

		var git = spawn('git', ['clone', GIT_URL], {cwd: pathname});
		
		git.on('close', (code) => {
		    if (code != 0) {
			throw ('git repository ' + 'could not be cloned'.red.bold);
		    }

		    console.log('git repository ' + 'cloned!'.green.bold);

		    pathname = path.join( pathname, 'standards' );
		    
		    processStandards( pathname, function(err) {
			if (err) throw err;
			cleanupCallback();
			process.exit(0);
		    });
		});
	    });
});
