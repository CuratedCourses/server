'use strict';

/**
 * Module Dependencies
 */

var mongoose  = require('mongoose');
var request       = require('request');

/**
 * Define Asset Schema
 */

var webCacheSchema = new mongoose.Schema({
    url: { type: String, unique: true, index: true },
    accessedOn: { type: Date },
    content: { type: Buffer },
});

var WebCache = mongoose.model('WebCache', webCacheSchema);

module.exports = WebCache;

module.exports.downloadAndCache = function (url, callback) {
    request.get({ uri: url, timeout: 5000 }, function (err, response, body) {
	if (!err && response.statusCode === 200) {

	    var cachedContent = { url: url,
				  accessedOn: new Date(),
				  content: body };
	    
	    WebCache.findOneAndUpdate({url: url},
				      cachedContent,
				      {upsert:true},
				      function(err, document) {
					  // It doesn't actually matter if the cache was successful!
				      });
	    
	    callback( null, body );
	} else {
	    if (err) {
		callback( err );
	    } else { 
		callback( response.statusCode );
	    }
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
		callback( null, cachedContent.content );
	    } else {
		module.exports.downloadAndCache( url, callback );  		
	    }
	}
    });
};
