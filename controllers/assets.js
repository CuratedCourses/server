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
	if (req.body.assetUrl) {
	    req.body.assetUrl = normalizeUrl( req.body.assetUrl );
	}
	
	async.waterfall([
	    function(callback) {
		if ((req.files) && (req.files.length == 1)) {
		    var file = req.files[0];
		    
		    Asset.draftAssetFromBuffer(req.user, file.buffer, file.mimetype,
					       function(err, asset) {
						   asset.title = file.originalname;
						   
						   callback(err, asset);
					       });
		    
		} else if (validUrl.isUri(req.body.assetUrl)) {
		    // BADBAD: a user could submit TWO drafts for the same URL and we don't handle this case	
		    async.waterfall([		    
			function(callback) {
			    WebCache.findRecentOrDownload( req.body.assetUrl, function(err, body, screenshot) {
				if (err) {
				    callback(err);
				} else {
				    callback( null, { body: body, screenshot: screenshot } );
				}
			    });
			},
			function(result, callback) {
			    Asset.draftAssetFromHTML(req.user, req.body.assetUrl, result.body,
						     function(err, asset) {
							 if (err) {
							     callback(err);
							 } else {
							     asset.pngThumbnail = result.screenshot;
							     callback( null, asset );
							 }
						     });
			}
		    ], callback);
		} else {
		    callback( 'You must contribute either a URL or choose a file to upload.' );
		}
	    },
	    function(asset, callback) {
		asset.save(function(err) {
		    callback(err, asset);
		});
	    }
	], function(err, asset) {
	    if (err) {
		req.flash('error', { msg: err.toString() } );
		res.redirect('back');
	    } else {
		res.redirect('/assets/' + asset._id + '/edit');
	    }
	});
    });

    /**
     * GET /assets/queue
     * View assets in need of moderation
     */
    
    // Invite the user to edit the resource if they are the submitter
    // and it doesn't have any approvals; proposed edit.
    app.get('/assets/queue',  passportConf.isAuthenticated, passportConf.isAdministrator, function (req, res) {
	Asset.find( {draft: false}, null, {sort: {submittedAt: 1}}, function(err,assets) {
	    res.render('assets/list', {
		url: req.url,
		languages: languages,
		assets: assets
	    });
	});
    });

    /**
     * GET /assets/:id.png
     * Get a thumbnail for an asset
     */
    
    app.get('/assets/:id.png', function (req, res) {
	Asset.findOne( {_id: req.params.id} ).exec( function(err,asset) {
	    if ((err) || (asset.pngThumbnail.length == 0)) {
		var imgdata = new Buffer([
		    0x47,0x49, 0x46,0x38, 0x39,0x61, 0x01,0x00, 0x01,0x00, 0x80,0x00, 0x00,0xFF, 0xFF,0xFF,
		    0x00,0x00, 0x00,0x21, 0xf9,0x04, 0x04,0x00, 0x00,0x00, 0x00,0x2c, 0x00,0x00, 0x00,0x00,
		    0x01,0x00, 0x01,0x00, 0x00,0x02, 0x02,0x44, 0x01,0x00, 0x3b
		]);
		res.writeHead(200,
			      {'Content-Type': 'image/gif', 
			       'Content-Length': imgdata.length});
		res.end(imgdata);
	    } else {
		res.writeHead(200, {'Content-Type': 'image/png' });
		res.end(asset.pngThumbnail, 'binary');
	    }
	});
    });
    
    /**
     * GET /assets/:id
     * View an asset
     */
    
    app.get('/assets/:id', function (req, res) {
	Asset.findOne( {_id: req.params.id} )
	    .populate( 'submitter' )
	    .populate( 'approvals.user' ).exec( function(err,asset) {
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
	Asset.find( { published: true, draft: false }, function(err,assets) {
	    res.render('assets/list', {
		url: req.url,
		languages: languages,
		assets: assets
	    });
	});
    });

    app.get('/users/:id/assets', function (req, res) {
	console.log( req.params.id );
	Asset.find( { submitter: req.params.id }, function(err,assets) {
	    if (assets.length > 0) {
		res.render('assets/list', {
		    url: req.url,
		    languages: languages,
		    assets: assets
		});
	    } else {
		res.render('assets/please-contribute', {
		    url: req.url
		});
	    }
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
		      'additionalPrerequisites'
		     ];
	
	fields.forEach( function(field) {
	    // All fields get trimmed
	    if (req.body[field]) {
		asset[field] = req.body[field].trim();
	    }
	});
	
	asset.createdOn = moment(req.body.createdOn, 'MM/DD/YYYY');
	
	// BADBAD: should validate this
	asset.tags = req.body.tags.split(',');
    }

    // BADBAD: need to test permission for doing this...    
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

    // BADBAD: need to test permission for doing this...
    app.post('/assets/:id', passportConf.isAuthenticated, function (req, res) {
	Asset.findOne( {_id: req.params.id}, function(err,asset) {
	    if (err) {
		req.flash('error', { msg: err });
		res.redirect('back');
	    } else {
		copyFormIntoAsset( req, asset );

		if (req.body.action==="publish")
		    asset.draft = false;
		
		asset.save( function(err) {
		    if (err) {
			req.flash('error', { msg: err });
		    }

		    // should redirect to view or something if we action=published!
		    res.redirect( '/assets/' + asset._id );
		});
	    }
	});
    });

    /**
     * POST /assets/:id/approvals
     * Add an approval or a comment to a resource
     */
    
    app.post('/assets/:id/approvals', passportConf.isAuthenticated, passportConf.isAdministrator,
	     function (req, res) {
		 Asset.findOne( {_id: req.params.id}, function(err,asset) {
		     if (err) {
			 req.flash('error', { msg: err });
			 res.redirect('back');
		     } else {
			 var approval = { remarks: req.body.remarks,
					  user: req.user._id,
					  date: new Date(),
					  upvote: (req.body.action == "approve") };

			 asset.approvals.push( approval );

			 if ((approval.upvote) && (asset.submitter.equals(req.user._id))) {
			     req.flash('error', { msg: "You are not allowed to approve your own resource." });
			     res.redirect( '/assets/' + asset._id );
			 } else {
			     if (approval.upvote)
				 asset.published = true;
			 
			     asset.save( function(err) {
				 if (err) {
				     req.flash('error', { msg: err });
				 }
				 
				 // should redirect to view or something if we action=published!
				 res.redirect( '/assets/' + asset._id );
			     });
			 }
		     }
		 });
	     });
};
