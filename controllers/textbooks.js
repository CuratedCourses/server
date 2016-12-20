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

var Tag           = require('../models/Tag.js');

/**
 * Textbook Controller
 */

module.exports.controller = function (app) {
    
    /**
     * GET /textbooks/
     * List textbooks
     */
    
    app.get('/textbooks/', function (req, res) {
	var textbooks = [require('../views/textbooks/books/lay.json')];
	res.render('textbooks/list', {
	    url: req.url,
	    textbooks: textbooks
	});
    });

    // BADBAD: this is just a stub until we have more textbooks
    app.get('/textbooks/:id', function (req, res) {
	var textbook = require('../views/textbooks/books/lay.json');
	
	if (req.params.id == "lay") {
	    Tag.find({}, function(err, tags) {
		if (err) {
		    req.flash('error', {msg: err});
		    return res.redirect('/textbooks/');
		} else {
		    res.format({
			html: function(){
			    res.render('textbooks/view', {
				url: req.url,
				textbook: textbook,
				tags: tags
			    });			    
			},
			
			json: function(){
			    res.send(textbook);
			}
		    });
		}
	    });
	} else {
            req.flash('error', {msg: "Could not find textbook " + req.params.id});
            return res.redirect('/textbooks/');
	}
    });

};
