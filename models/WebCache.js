'use strict';

/**
 * Module Dependencies
 */

var mongoose  = require('mongoose');
var request       = require('request');
var webshot = require('webshot');
var async = require('async');
var _ = require('underscore');

/**
 * Define Asset Schema
 */

var webCacheSchema = new mongoose.Schema({
    url: { type: String, unique: true, index: true },
    accessedOn: { type: Date },
    content: { type: Buffer },
    contentType: { type: String },    
    screenshot: { type: Buffer }
});

var WebCache = mongoose.model('WebCache', webCacheSchema);

module.exports = WebCache;

module.exports.downloadAndCache = function (url, callback) {
    async.parallel([
	function(callback) {
	    request.get({ uri: url, timeout: 5000 }, function (err, response, body) {
		if (!err && response.statusCode === 200) {
		    callback( null, { url: url,
				      content: body,
				      contentType: response.headers['content-type'] }  );
		} else {
		    if (err) {
			callback( err );
		    } else {
			callback( response.statusCode );			
		    }
		}
	    });
	},
	function(callback) {
	    webshot(url, {//timeout: 5000,
		streamType: 'png',
		windowSize: { width: 1024, height: 768 },
		shotSize: { width: 'window', height: 'window' },
		shotOffset: { left: 0,
			      right: 624,
			      top: 0,
			      bottom: 368 }
	    }, function(err, stream) {
		if (err) {
		    callback(err);
		} else {
		    var bufs = [];
		    stream.on('data', function(d){ bufs.push(d); });
		    stream.on('end', function(){
			callback( null, { screenshot: Buffer.concat(bufs) } );
		    });
		}
	    });
	}
    ], function(err, results) {
	if (err) {
	    callback(err);
	} else {
	    var cachedContent = { accessedOn: new Date() };
	    results.forEach( function(result) { _.extend( cachedContent, result ); } );
	    console.log( cachedContent );
	    WebCache.findOneAndUpdate({url: url},
				      cachedContent,
				      {upsert:true},
				      function(err, document) {
					  // It doesn't actually matter if the cache was successful!
				      });
	    
	    callback( null, cachedContent );
	}
    });
};
    
function daysBetween( date1, date2 ) {
    //Get 1 day in milliseconds
    var one_day=1000*60*60*24;
    
    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();
    
    // Calculate the difference in milliseconds
    var difference_ms = date2_ms - date1_ms;
    
    // Convert back to days and return
    return Math.round(difference_ms/one_day); 
}

module.exports.findRecentOrDownload = function (url, callback) {
    WebCache.findOne({ url: url }, function (err, cachedContent) {
	if ((err) || (cachedContent === null)) {
	    module.exports.downloadAndCache( url, callback );  
	} else {	
	    if (daysBetween( cachedContent.accessedOn, new Date() ) < 7) {
		callback( null, cachedContent );
	    } else {
		module.exports.downloadAndCache( url, callback ); 
	    }
	}
    });
};
