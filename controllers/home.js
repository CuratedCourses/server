'use strict';

/**
 * Home Controller
 */

var Asset           = require('../models/Asset.js');

module.exports.controller = function (app) {
    app.get('/', function (req, res) {

	
	Asset.aggregate().match( {type: "video", externalUrl: {$regex: 'watch\\?v=' } } ).sample(20).exec( function(err,assets) {

	    var asset = assets[0];
	    var url = asset.externalUrl.split('watch?v=');
	    if (url.length >= 2)
		url = url[1];
	    else
		url = "MOlNwzqBIk"
	    
	    res.render('home/home', {
		url: req.url,
		showcaseVideo: url
	    });	    
	});
	

  });
};
