'use strict';

/**
 * Module Dependences
 */

var _             = require('lodash');
var debug         = require('debug')('skeleton');       // https://github.com/visionmedia/debug
var utils         = require('../config/utils');
var config        = require('../config/config');

var CAFSFile        = require('../models/CAFSFile.js');

module.exports.controller = function (app) {

  /**
   * GET /files/:id
   * Invite a user to contribute a URL to an asset
   */

    app.get('/files/:id', function (req, res) {
	CAFSFile.contentForAddress( req.params.id, function(err, file) {
	    // BADBAD: should pay some attention to the content type of the file
	    if (err) {
		req.flash('error', { msg: err.message });
		return res.redirect('back');
	    } else if (file === null) {
		req.flash('error', { msg: "Could not find file " + req.params.id });
		return res.redirect('back');		
	    } else {
		res.render('files/default', { url: req.url, content: file.content, contentType: file.contentType });
	    }
	});
    });

};
