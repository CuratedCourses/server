'use strict';

/**
 * Module Dependencies
 */

var mongoose  = require('mongoose');
var async  = require('async');
var path  = require('path');
var cheerio       = require('cheerio');
var compactLanguageDetector = require('cld');
var Schema = mongoose.Schema;
var url = require('url');
var CAFSFile        = require('./CAFSFile.js');
var BloomFilter = require('bloomfilter').BloomFilter;

/**
 * Define Asset Schema
 */

var assetSchema = new mongoose.Schema({
    viewCount: { type: Number, default: 0 },
    viewers: { type: Array },
    
    submitter: { type: Schema.Types.ObjectId, ref: 'User' },

    draft: { type: Boolean },
    published: { type: Boolean },

    // From time to time, assets get replaced by new versions.
    // replacementOf is the authoritative field, and replacedBy is
    // denormalized data.
    replaces: { type: Schema.Types.ObjectId, ref: 'Asset' },
    replacedBy: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    
    // Does every asset actually have a url?  Not really.  Assets that
    // don't have a URL (like sagecells) should be uploaded and then
    // get a content-based curatedcourses URL.  The challenge is
    // content like a video, which might have underlying source code,
    // too...  That URL goes in the repository field
    externalUrl: { type: String, index: true },
    contentHash: { index: true, type: String, ref: 'CAFSFile' },

    // a mimetype string
    contentType: { type: String },    
    
    // an externally hosted thumbnail image
    urlThumbnail: { type: String },
    // a 400x400 .png formatted thumbnail image
    pngThumbnail: { type: Buffer },
    
    // a .svg formatted thumbnail image
    svgThumbnail: { type: Buffer },    
    // a 64x64 jpeg formatted thumbnail image
    jpegThumbnail: { type: Buffer },
    
    // types are: video, applet, sagecell, formativequiz, summativequiz, problem, handout
    type: { type: String },

    title: { type: String },

    description: { type: String },

    // arguably should be "licenses" but since the license is an SPDX
    // license expression, a single license field can reference
    // multiple licenses
    license: { type: String },

    // these "tags" conflate both learning outcomes AND topics
    tags: { type: Array },

    // These array entries should be "people" which could be names, userids, ?
    creators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    contributors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    copyrightHolders: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // iso639-1 formatted language code
    language: { type: String },

    accessibility: { type: String },
    
    // preclass, inclass, postclass, review
    pedagogicalTimeframe: { type: String },

    additionalPrerequisites: { type: String },

    // introduction, example, application, proof
    pedagogicalPerspective: { type: String },

    createdOn: { type: Date }, // "on" means the resolution is a day
    submittedAt: { type: Date }, // "at" means the resolution is a second

    approvals: [ {
	user: { type: Schema.Types.ObjectId, ref: 'User' },
	date: { type: Date },
	upvote: { type: Boolean },
	downvote: { type: Boolean },	
	remarks: { type: String }
    } ]

}, { versionKey: false });

// Add text index -- with weird mongoose language_override option
//
// See: http://stackoverflow.com/questions/39593352/mongodb-only-creates-text-search-index-with-language-override-option
//
assetSchema.index({ title: 'text', description: 'text'}, { language_override: 'text' });

// Add viewer to the bloom filter viewers; increment viewCount only if viewer probably wasn't already in the viewer list
assetSchema.methods.incrementViewCount = function (viewer) {
    var bloom;

    if ((this.viewers) && (this.viewers.length != 0)) {
	bloom = new BloomFilter(this.viewers, 16);
    } else {
	bloom = new BloomFilter(
	    32 * 256, // number of bits to allocate.
	    16        // number of hash functions.
	);
    }
    
    if ( ! (bloom.test( viewer ))) {
	this.viewCount = this.viewCount + 1;
	bloom.add( viewer );
	this.viewers = [].slice.call(bloom.buckets);	
    }
};

assetSchema.methods.isViewableBy = function (user) {
    if (this.published)
	return true;

    if (user.type == 'admin')
	return true;

    if (user._id == this.submitter)
	return true;

    return false;
};

assetSchema.methods.isEditableBy = function (user) {
    if (this.draft && (user._id.equals(this.submitter)))
	return "it is your own draft submission";
    
    if (user.type == 'admin')
	return "you are an administrator";

    if (this.published)
	return false;

    return false;
};

assetSchema.methods.url = function () {
    if (this.externalUrl)
	return this.externalUrl;
    if (this.contentHash)
	return "https://curatedcourses.org/files/" + this.contentHash;
    return "https://curatedcourses.org/";
};

assetSchema.methods.humanReadableType = function () {
    if (this.type === "video")
	return "Video";
    else if (this.type === "applet")
	return "Applet";
    else if (this.type === "sagecell")
	return "SageMath Cell";
    else if (this.type === "formativequiz")
	return "Formative Quiz";
    else if (this.type === "Summative Quiz")
	return "Summative Quiz";
    else if (this.type === "problem")
	return "Problem";
    else if (this.type === "handout")
	return "Handout";
    else if (this.type === "textbook")
	return "Textbook";    
    return "Unknown";
};

assetSchema.methods.humanReadablePedagogicalTimeframe = function () {
    if (this.pedagogicalTimeframe==="preclass")
	return "Pre-class";
    else if (this.pedagogicalTimeframe==="inclass")
	return "In-class";
    else if (this.pedagogicalTimeframe==="postclass")
	return "Post-class";
    else if (this.pedagogicalTimeframe==="review")
	return "Review";
    return "Uncertain";
};

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

assetSchema.methods.humanReadablePedagogicalPerspective = function () {
    if (!(this.pedagogicalPerspective))
	return "Uncertain";
    
    if (this.pedagogicalPerspective==="")
	return "Uncertain";
    
    return toTitleCase(this.pedagogicalPerspective);
};



var Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset;

mongoose.set('debug', true);

Asset.ensureIndexes(function (err) {
    if (err) console.log(err);
});

module.exports.draftAssetFromHTML = function(user, externalUrl, document, callback) {
    var asset = new Asset();

    asset.draft = true;
    asset.published = false;

    asset.externalUrl = externalUrl;
    
    asset.submitter = user._id;

    var $ = cheerio.load(document);

    // A reasonable title might either be the opengraph title...
    asset.title = $('meta[property="og:title"]').attr('content')
	// or a dublin core title
	|| $('meta[name="DC.title"]').attr('content')
        // or the HTML page title
	|| $('title').text();

    // og:description is a one to two sentence description of your
    // object.
    asset.description = $('meta[property="og:description"]').attr('content')
	|| $('meta[name="DC.description"]').attr('content');

    // og:url is the canonical URL of your object that will be used as
    // its permanent ID in the graph; we should prefer these
    // permalinks over whatever the user supplied
    var canonicalUrl = $('meta[property="og:url"]').attr('content');
    if (canonicalUrl)
	asset.externalUrl = canonicalUrl;

    // This field should be a SPDX formatted string, but who knows
    // what might appear on the webpage
    asset.license = $('meta[name="DC.rights"]').attr('content');
    
    // og:image is an image URL which should represent your object
    // within the graph; in particular, this will provide a screenshot
    // for a youtube video
    var externalThumbnail = $('meta[property="og:image"]').attr('content');
    if (externalThumbnail)
	asset.urlThumbnail = externalThumbnail;
    // BADBAD: pngThumbnail, svgThumbnail, jpegThumbnail should be
    // populated by rendering the html page at this point
    
    // BADBAD: This could be populated by running the page through an
    // accessibiliy testing engine
    asset.accessibility = "";
        
    asset.pedagogicalTimeframe = "";
    asset.pedagogicalPerspective = "";
    asset.additionalPrerequisites = "";    

    asset.submittedAt = new Date();
    
    // BADBAD: asset.createdOn could be set from a dublin core DC.date?

    // A website is, most generically, a handout
    asset.type = "handout";

    // A youtube video should be marked as a video
    var parsedUrl = url.parse(externalUrl);
    if ((parsedUrl.host) && (parsedUrl.host == "youtube.com")) {
	if ((parsedUrl.query) && (parsedUrl.query.match(/v=/))) {
	    asset.type = "video";
	}
    }

    // BADBAD: fill in...
    //creators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    //contributors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    //copyrightHolders: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // BADBAD: do something to make a first guess about the tags

    async.waterfall([
	// Identify the primary language of the document
	function(callback) {
	    compactLanguageDetector.detect(document, {isHTML: true}, function(err, result) {
		if (!err) {
		    asset.language = result.languages[0].code;
		} else {
		    // If this fail, the default language is English
		    asset.language = 'en';
		}
		callback(null);
	    });
	},
	function(callback) {
	    // If there's already a published asset for this URL...
	    Asset.findOne( { externalUrl: asset.externalUrl,
			     draft: false,
			     published: true }, function(err,previousAsset) {
				 if (err || (previousAsset === null)) {
				     callback(null, asset);
				 } else {
				     // Create a draft edit to this asset
				     var newAsset = new Asset(previousAsset);
				     //newAsset._id = mongoose.Types.ObjectId();
				     newAsset.replaces = previousAsset._id;
				     newAsset.submitter = user._id;
				     newAsset.draft = true;
				     newAsset.published = false;
				     newAsset.approvals = [];
				     newAsset.submittedAt = new Date();
				     
				     callback(null, newAsset);
				 }
			     });
	}
    ], callback);

};

module.exports.draftAssetFromBuffer = function(user, buffer, mimetype, filename, callback) {
    var asset = new Asset();

    asset.draft = true;
    asset.published = false;

    CAFSFile.addressForContent( buffer, mimetype, function(err, address) {
	if (err)
	    callback(err);
	else {
	    asset.contentHash = address;
	    asset.contentType = mimetype;

	    if (filename)
		asset.title = filename;

	    asset.submitter = user._id;

	    asset.accessibility = "";
	    asset.language = 'en';        
	    asset.pedagogicalTimeframe = "";
	    asset.pedagogicalPerspective = "";
	    asset.additionalPrerequisites = "";    
	    
	    asset.submittedAt = new Date();
	    
	    // A file is, most generically, a handout
	    asset.type = "handout";
	    if ( (path.extname(filename) == '.sage') ||
		 (path.extname(filename) == '.py') ||
		 (mimetype.match( /sage/ )) ) {
		asset.type = "sagecell";
	    }
	    
	    Asset.findOne( { externalUrl: asset.externalUrl,
			     draft: false,
			     published: true }, function(err,previousAsset) {
				 if (err || (previousAsset === null)) {
				     callback(null, asset);
				 } else {
				     // Create a draft edit to this asset
				     var newAsset = new Asset(previousAsset);
				     //newAsset._id = mongoose.Types.ObjectId();
				     newAsset.replaces = previousAsset._id;
				     newAsset.submitter = user._id;
				     newAsset.draft = true;
				     newAsset.published = false;
				     newAsset.approvals = [];
				     newAsset.submittedAt = new Date();
				     
				     callback(null, newAsset);
				 }
			     });
	}
    });
};
