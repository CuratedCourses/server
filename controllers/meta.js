'use strict';

/**
 * Module Dependences
 */

var _ = require('lodash');
var debug = require('debug')('skeleton'); // https://github.com/visionmedia/debug
var utils = require('../config/utils');
var config = require('../config/config');
var cheerio = require('cheerio'); // https://github.com/cheeriojs/cheerio
var request = require('request');
var async = require('async');
var moment = require('moment');
var languages = require('./languages.js').languages;

var Tag = require('../models/Tag.js');
var Asset = require('../models/Asset.js');

/**
 * Textbook Controller
 */

module.exports.controller = function (app) {

    /**
     * copied from textbooks.js controller
     * GET /meta/
     * List meta
     */

    app.get('/meta/', function (req, res) {
      var meta = [require('../views/meta/fcla.json'),
        require('../views/meta/compare.json')
      ];
      res.render('meta/list', {
        url: req.url,
        meta: meta
      });
    });

    app.get('/meta/:id', function (req, res) {
        // BADBAD: this is just a stub until we have more meta
        var article = undefined;

        if (req.params.id == "fclagraph") {
          article = require('../views/meta/fcla.json');
        }

        if (req.params.id == "compare") {
          article = require('../views/meta/compare.json');
        }

        if (article === undefined) {
          req.flash('error', {
            msg: "Could not find article " + req.params.id
          });
          return res.redirect('/meta/');
        }

        res.render('meta/view', {
          url: req.url,
          article: article
          // assets: assets,
          // languages: languages,
          // tags: tags
        });
    });
};

