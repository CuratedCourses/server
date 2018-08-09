'use strict';

/**
 * Home Controller
 */

var Asset           = require('../models/Asset.js');

module.exports.controller = function (app) {
    app.get('/', function (req, res) {
	// Okay, okay, use the original video
   	var url = "hMOlNwzqBIk";
	    
	res.render('home/home', {
	    url: req.url,
	    showcaseVideo: url
	});	    
  });
};
