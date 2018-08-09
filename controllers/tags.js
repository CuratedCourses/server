'use strict';

/**
 * Module Dependencies
 */

var Tag           = require('../models/Tag');
var Asset         = require('../models/Asset');
var debug         = require('debug')('skeleton');  // https://github.com/visionmedia/debug
var crypto        = require('crypto');
var config        = require('../config/config');
var languages = require('./languages.js').languages;

/**
 * Tag Controller
 */

module.exports.controller = function (app) {

    RegExp.quote = function(str) {
	return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
    };
    
    function getTags(req, res) {
	// Canonicalize the URL
	var tagName = req.url;

	// standards have dots, but the URLs use slashes as seprarators
	tagName = tagName.replace( /^\//, '' );
	
	if (tagName.match( /\./ )) {
	    tagName = tagName.split('.').join('/');
	    res.redirect( '/' + tagName );
        // Tag URLs don't end with a slash
	} else if (tagName.match( /\/$/ )) {
	    tagName = tagName.replace( /\/$/, '' );
	    res.redirect( '/' + tagName );
	} else {
	    tagName = tagName.split('/').join('.');

	    // Check if this is a prefix to many tags
	    Tag.find( {_id: new RegExp('^' + RegExp.quote(tagName + '.')) }, function(err,tags) {
		if ((err) || (tags.length == 0)) {
		    Tag.findOne( {_id: tagName}, function(err,tag) {
			if ((err) || (!tag)) {
			    if (err)
				req.flash( 'error', { msg: err.message });
			    else
				req.flash( 'error', { msg: "missing tag" });
			    
			    res.render('tags/tags', {
				tagPrefix: tagName,
				tags: [],
				url: req.url
			    });
			} else {
			    Asset.find( { tags: { $elemMatch: { $eq: tag._id } } }, function(err,assets) {
				if (err) {
				    req.flash( 'error', { msg: err.message });
				    assets = [];
				}

				res.format({
				    html: function() {
					res.render('tags/tag', {
					    tagName: tagName,
					    tag: tag,
					    languages: languages,
					    assets: assets,
					    url: req.url
					});
				    },

				    json: function() {
					// Our advertising code accesses this from many origins, so we need to permit access
					res.header( 'Access-Control-Allow-Origin', '*' );
					res.json( {
					    tag: tag,
					    assets: assets
					});
				    }
				});
			    });
			}
		    });
		} else {
		    res.render('tags/tags', {
			tagPrefix: tagName,
			tags: tags,
			url: req.url
		    });
		}
	    });
	}
    }

    /**
     * GET /math/... and /CCSS/...
     * Render a tag page
     */

    app.get('/math*', getTags );
    app.get('/CCSS*', getTags );

    /* The restful API sits under /tags */
    
    app.get('/tags', function(req,res) {
	Tag.find( {}, function(err,tags) {
	    if (err) {
		res.json([]);
            } else {
		res.format({
		    json: function(){
			res.send(tags);
		    }});
	    }
	});
    });
};
