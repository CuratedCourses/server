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
var Tag             = require('../models/Tag.js');

var passportConf  = require('../config/passport');

var languages = require('./languages.js').languages;

/**
 * Asset Controller
 */

module.exports.controller = function (app) {

  /**
   * GET /bundles
   * Show some bundled content
   */

  app.get('/bundles', function (req, res) {
    res.render('assets/bundles', {
      url: req.url
    });
  });
    
    
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
		    
		    Asset.draftAssetFromBuffer(req.user, file.buffer, file.mimetype, file.originalname,
					       function(err, asset) {
						   callback(err, asset);
					       });
		    
		} else if (validUrl.isUri(req.body.assetUrl)) {
		    // BADBAD: a user could submit TWO drafts for the same URL and we don't handle this case	
		    async.waterfall([		    
			function(callback) {
			    WebCache.findRecentOrDownload( req.body.assetUrl, function(err, page) {
				if (err) {
				    callback(err);
				} else {
				    callback( null, page );
				}
			    });
			},
			function(result, callback) {
			    Asset.draftAssetFromHTML(req.user, req.body.assetUrl, result.content,
						     function(err, asset) {
							 if (err) {
							     callback(err);
							 } else {
							     asset.pngThumbnail = result.screenshot;
							     asset.contentType = result.contentType;
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
	Asset.find( {draft: false, published: false}, null, {sort: {submittedAt: 1}}, function(err,assets) {
	    res.render('assets/list', {
		url: req.url,
		languages: languages,
		assets: assets
	    });
	});
    });

    /**
     * GET /assets/:id.png
     * Get a thumbnail for an asset (aggressively cached!)
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
		res.header('Cache-Control', 'public, max-age=31557600');
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
	var asset;
	var tags;
	
	async.waterfall([
	    function(callback) {
		Asset.findOne( {_id: req.params.id} )
		    .populate( 'submitter' )
		    .populate( 'approvals.user' ).exec( callback );
	    },
	    function(theAsset, callback) {
		asset = theAsset;
		
		// Increment the view count -- but this can be asynchronous
		asset.incrementViewCount( req.connection.remoteAddress );
		asset.save( function(err) { });

		// Find all tags
		Tag.find( {}, callback );		
	    },
	    function(theTags, callback) {
		tags = theTags;

		// Load sage cell content
		if ((asset.type == "sagecell") && (asset.contentHash)) {
		    CAFSFile.contentForAddress( asset.contentHash, callback );
		} else {
		    callback(null);
		}
	    }
	], function( err, file ) {
	    if (err) {
		req.flash('error', { msg: err });
		res.redirect('back');
	    } else {
		var sagecell = undefined;
		if (file)
		    sagecell = file.content;
		
		res.render('assets/view', {
		    url: req.url,
		    asset: asset,
		    tags: tags,
		    sagecell: sagecell,
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
	var search = { published: true, draft: false };
	
	if (req.query.q) {
	    search['$text'] = { $search: req.query.q };

	    Asset.find( search, function(err,assets) {
		if (err) {
		    req.flash('error', { msg: err });
		    res.redirect('back');		
		} else {
		    res.render('assets/search', {
			url: req.url,
			languages: languages,
			assets: assets,
			query: req.query.q
		    });
		}
	    });
	} else {
	    Asset.find( search, function(err,assets) {
		if (err) {
		    req.flash('error', { msg: err });
		    res.redirect('back');		
		} else {
		    // BADBAD: or list-thumbnails
		    res.render('assets/list-thumbnails', {
			url: req.url,
			languages: languages,
			assets: assets
		    });
		}
	    });
	}
    });

    app.get('/users/:id/assets', function (req, res) {
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
		      'externalUrl',		      
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

	if (req.body.createdOn != '') {
	    asset.createdOn = moment(req.body.createdOn, 'MM/DD/YYYY');
	} else  {
	    asset.createdOn = '';
	}
	
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
					  upvote: (req.body.action == "approve"),
					  downvote: (req.body.action == "retract") };

			 asset.approvals.push( approval );

			 if ((approval.upvote) && (asset.submitter.equals(req.user._id))) {
			     req.flash('error', { msg: "You are not allowed to approve your own resource." });
			     res.redirect( '/assets/' + asset._id );
			 } else {
			     if (approval.upvote)
				 asset.published = true;

			     if (approval.downvote)
				 asset.published = false;
			 
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
