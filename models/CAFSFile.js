'use strict';

/**
 * Module Dependencies
 */

var mongoose  = require('mongoose');
var crypto    = require('crypto');
var DIGEST_ALGORITHM = 'sha1';

/**
 * Define Schema for a content-addressable filesystem
 */

var cafsFileSchema = new mongoose.Schema({

    // BADBAD: The _id is a DIGEST_ALGORITHM hash
    _id: { type: String },

    // The content cannot be too large -- maybe 4 MB
    content: { type: Buffer },

    // A mimetype string
    contentType: { type: String },
}, { versionKey: false });

var CAFSFile = mongoose.model('CAFSFile', cafsFileSchema);

module.exports = CAFSFile;

module.exports.addressForContent = function(buffer, contentType, callback) {
    var hash = crypto.createHash(DIGEST_ALGORITHM).update(buffer).digest('base64');

    // These addresses may not be URL safe, but we want them to be
    // such.  Arguably, this is application logic that really belongs
    // in the controller.
    var address = hash.replace(/\+/g, '-').replace(/\//g,'_').replace('=','');

    // Check if we've already saved this content
    CAFSFile.findOne({ _id: hash }, function (err, file) {
	// If not...
	if ((err) || (file === null)) {
	    // Save it!
	    var newFile = new CAFSFile({
		_id : hash,
		content : buffer,
		contentType : contentType
	    });
 
	    newFile.save(function (err, data) {
		if (err) {
		    console.log(err);
		    callback(err);
		} else {
		    console.log( "Saved content to hash ", address );
		    callback(null, address);
		}
	    });
	} else {
	    return callback(null, address);
	}
    });

    return address;
};

module.exports.contentForAddress = function(address, callback) {
    // Undo the URL safety
    address = address.replace(/-/g, '+').replace(/_/g,'/');
    
    if ((address.length % 4) === 2) {
	address += '=';
    }
    
    if ((address.length % 4) === 3) {
	address += '=';
    }

    CAFSFile.findOne({ _id: address }, callback);
};
