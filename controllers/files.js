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
   * Download the content associated to a file
   */

    app.get('/files/:id\.:ext?', function (req, res) {
	var magicExtensions = {
	    "application/pdf": "pdf",
	    // BADBAD: serving random html files is a huge security risk -- but that's why we went crazy with the ContentSecurityPolicy
	    "text/html": "html",
	    "image/png": "png",
	    "image/gif": "gif",
	    "image/jpeg": "jpg"
	};
	
	CAFSFile.contentForAddress( req.params.id, function(err, file) {
	    if (err) {
		req.flash('error', { msg: err.message });
		return res.redirect('back');
	    } else if (file === null) {
		req.flash('error', { msg: "Could not find file " + req.params.id });
		return res.redirect('back');
	    } else if (magicExtensions[file.contentType] && (req.params.ext != magicExtensions[file.contentType])) {
		res.redirect('/files/' + req.params.id + '.' + magicExtensions[file.contentType]);
	    } else {
		res.writeHead(200, {
		    'Content-Type': file.contentType,
		    'Content-Length': file.content.length,
		    // One advantage of content addressable files is that these assets can be cached eternally
		    'Cache-Control': 'public, max-age=31557600'
		});
		res.end(file.content);
	    }
	});
    });
};
