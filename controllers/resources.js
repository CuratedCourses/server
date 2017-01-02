'use strict';

/**
 * Module Dependencies
 */

var debug         = require('debug')('skeleton');  // https://github.com/visionmedia/debug

/**
 * Resources Controller, which provides the basic mechanisms for
 * handling our "advertising" network.
 */

module.exports.controller = function (app) {
    
    app.get('/resources/show.js', function (req, res) {
	res.sendfile('show-resources.js', {root: './public/js'});
    });

    app.get('/resources/margin.css', function (req, res) {
	res.sendfile('resources-margin.min.css', {root: './public/css'});	
    });

    
};
