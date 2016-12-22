'use strict';

var LOCAL_URL_PREFIX = 'https://curatedcourses.org/files/';

/**
 * Module Dependences
 */

var _             = require('lodash');
var debug         = require('debug')('skeleton');       // https://github.com/visionmedia/debug
var cheerio       = require('cheerio');         // https://github.com/cheeriojs/cheerio
var request       = require('request');
var async         = require('async');
var moment        = require('moment');

var validUrl = require('valid-url');
var normalizeUrl = require('normalize-url');

var Asset           = require('../models/Asset.js');
var WebCache        = require('../models/WebCache.js');
var CAFSFile        = require('../models/CAFSFile.js');

var passportConf  = require('../config/passport');

/* ************************************************************** */
/* Load languages */
var CountryLanguage = require('country-language');
var Country = require('countryjs');

var languages = [];

CountryLanguage.getLanguageCodes(2).forEach( function(code) {
    CountryLanguage.getLanguage(code, function (err, language) {
	if (err) {
	    console.log(err);
	} else {
	    // Only include languages spoken in a current country
	    if (language.countries.length > 0) {
		// with a nice name we can display
		if (language.nativeName[0].length > 0) {
		    // Sort countries by population
		    language.countries.sort(
			function(a,b) {
			    return Country.population(b.code_2) -
				Country.population(a.code_2); });

		    // Get total population
		    var population = language.countries.
			map( function(c) { return Country.population(c.code_2); } ).
			reduce( function(a,b) { return (a || 0) + (b || 0); }, 0 );

		    // Only include languages with lots of speakers
		    if (population > 1000000) {
			// The flag is reprsented by an iso3166 alpha-2 country code,
			// of the most populous country speaking that language
			var flag = language.countries[0].code_2;
		    
			// I suppose English should be the US flag, despite India being more populous
			if (language.iso639_1 === "en")
			    flag = "US";
			
			languages.push({
			    code: language.iso639_1, // iso639-1
			    flag: flag, // iso3166 alpha-2 code
			    nativeName: language.nativeName[0],
			    englishName: language.name
			});
		    }
		}
	    }
	}
    });
});	

/**
 * Asset Controller
 */

module.exports.controller = function (app) {

    /**
     * GET /assets/new
     * Invite a user to contribute a URL to an asset
     */
    
    app.get('/assets/new', passportConf.isAuthenticated, function (req, res) {
	res.render('assets/new', { url: req.url });
    });
    
    app.post('/assets/new', passportConf.isAuthenticated, function (req, res) {
	var asset = {};

	req.body.assetUrl = normalizeUrl( req.body.assetUrl );
	
	// If the user contributed a file...
	if ((req.files) && (req.files.length == 1)) {
	    console.log( req.files );
	    
	    // Create a content-based URL for the file
	    var file = req.files[0];
	    console.log( file );
	    var address = CAFSFile.addressForContent( file.buffer, file.mimetype );

	    asset.url = LOCAL_URL_PREFIX + address;
	    asset.title = file.originalname;
	    // BADBAD: could also guess the type here
	    
	} else if (validUrl.isUri(req.body.assetUrl)) {
	    // BADBAD: a user could submit TWO drafts for the same URL and we don't handle this case
	    async.waterfall([
		function(callback) {
		    WebCache.findRecentOrDownload( req.body.assetUrl, callback );
		},
		function(body, callback) {
		    Asset.draftAssetFromHTML(req.user, req.body.assetUrl, body, callback );
		},
		function(asset, callback) {
		    asset.save(function(err) {
			callback(err, asset);
		    });
		}
	    ], function(err, asset) {
		if (err) {
		    req.flash('error', { msg: err } );
		    res.redirect('back');
		} else {
		    res.redirect('/assets/' + asset._id + '/edit');
		}
	    });
	} else {
	    req.flash('error', { msg: 'You must contribute either a URL or choose a file to upload.' } );
	    res.render('assets/new', { url: req.url });
	}
    });

    /**
     * GET /assets/:id
     * View an asset
     */
    
    app.get('/assets/:id', function (req, res) {
	Asset.findOne( {_id: req.params.id} ).populate( 'submitter' ).exec( function(err,asset) {
	    if (err) {
		req.flash('error', { msg: err });
		res.redirect('back');
	    } else {
		res.render('assets/view', {
		    url: req.url,
		    asset: asset,
		    languages: languages		    
		});
	    }
	});
    });

    /**
     * GET /assets/
     * List assets
     */
    
    // Invite the user to edit the resource if they are the submitter
    // and it doesn't have any approvals; proposed edit.
    app.get('/assets/', function (req, res) {
	Asset.find( {}, function(err,assets) {
	    res.render('assets/list', {
		url: req.url,
		languages: languages,
		assets: assets
	    });
	});
    });
    
    /**
     * GET /assets/:id/edit
     * Edit an asset
     */
    
    // Invite the user to edit the resource if they are the submitter
    // and it doesn't have any approvals; proposed edit.
    app.get('/assets/:id/edit', passportConf.isAuthenticated, function (req, res) {
	Asset.findOne( {_id: req.params.id}, function(err,asset) {
	    if (err) {
		req.flash('error', { msg: err });
		res.redirect('back');
	    } else {
		res.render('assets/edit', {
		    url: req.url,
		    asset: asset,
		    languages: languages		    
		});
	    }
	});
    });    

    /****************************************************************/

    function copyFormIntoAsset( req, asset ) {
	var fields = ['title',
		      'description',
		      'type',
		      'pedagogicalTimeframe',
		      'pedagogicalPerspective',
		      'language',
		      'license',
		      'accessibility',
		      'additionalPrerequisites',
		      'repository'
		     ];
	
	fields.forEach( function(field) {
	    // All fields get trimmed
	    asset[field] = req.body[field].trim();
	});
	
	asset.createdOn = moment(req.body.createdOn, 'MM/DD/YYYY');
	
	// Should validate this
	asset.tags = req.body.tags.split(',');
    }
    
    app.put('/assets/:id', passportConf.isAuthenticated, function (req, res) {
	Asset.findOne( {_id: req.params.id}, function(err,asset) {
	    if (err) {
		res.json({err:err});
	    } else {
		copyFormIntoAsset( req, asset );
		
		asset.save( function(err) {
		    if (err) {
			res.json({err:err});			
		    } else {
			res.json(asset);
		    }
		});
	    }
	});
    });
    
    app.post('/assets/:id', passportConf.isAuthenticated, function (req, res) {
	Asset.findOne( {_id: req.params.id}, function(err,asset) {
	    if (err) {
		req.flash('error', { msg: err });
		res.redirect('back');
	    } else {
		copyFormIntoAsset( req, asset );

		asset.save( function(err) {
		    if (err) {
			req.flash('error', { msg: err });
		    }

		    // should redirect to view or something if we action=published!
		    res.render('assets/edit', {
			url: req.url,
			asset: asset,
			languages: languages		    
		    });
		});
	    }
	});
    });    

};
