'use strict';

/**
 * Module Dependences
 */

var _             = require('lodash');
var debug         = require('debug')('skeleton');       // https://github.com/visionmedia/debug
var utils         = require('../config/utils');
var config        = require('../config/config');
var cheerio       = require('cheerio');         // https://github.com/cheeriojs/cheerio
var request       = require('request');
var async         = require('async');
var moment        = require('moment');
var languages     = require('./languages.js').languages;

var Tag           = require('../models/Tag.js');
var Asset         = require('../models/Asset.js');

/**
 * Textbook Controller
 */

module.exports.controller = function (app) {
    
    /**
     * GET /textbooks/
     * List textbooks
     */
    
    app.get('/textbooks/', function (req, res) {
	var textbooks = [require('../views/textbooks/books/beezer.json'),
			 require('../views/textbooks/books/hefferon.json'),
			 require('../views/textbooks/books/lay.json')
			];
	res.render('textbooks/list', {
	    url: req.url,
	    textbooks: textbooks
	});
    });

    app.get('/textbooks/:id', function (req, res) {
        // BADBAD: this is just a stub until we have more textbooks
	var textbook = undefined;

	if (req.params.id == "lay") {
	    textbook = require('../views/textbooks/books/lay.json');
	}

	if (req.params.id == "hefferon") {
	    textbook = require('../views/textbooks/books/hefferon.json');
	}

	if (req.params.id == "beezer") {
	    textbook = require('../views/textbooks/books/beezer.json');
	}		

	if (textbook === undefined) {
            req.flash('error', {msg: "Could not find textbook " + req.params.id});
            return res.redirect('/textbooks/');
	}
	
	Tag.find({}, function(err, tags) {
	    if (err) {
		req.flash('error', {msg: err});
		return res.redirect('/textbooks/');
	    } else {
		// BADBAD: this is NOT the fastest way to show all the assets -- oh well.

		Asset.find( { published: true, draft: false }, function(err,assets) {
		    if (err) {
			assets = [];
		    }
		    
		    res.format({
			html: function(){
			    res.render('textbooks/view', {
				url: req.url,
				textbook: textbook,
				assets: assets,
				languages: languages,
				tags: tags
			    });			    
			},
			
			json: function(){
			    res.send(textbook);
			}
		    });
		});
	    }
	});
    });

};
