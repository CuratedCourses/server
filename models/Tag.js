'use strict';

/**
 * Module Dependencies
 */

var mongoose  = require('mongoose');

/**
 * Define Asset Schema
 */

var tagSchema = new mongoose.Schema({
    _id: { type: String, unique: true },

    description: { type: String },
    
    // arguably should be "licenses" but since the license is an SPDX
    // license expression, a single license field can reference
    // multiple licenses
    license: { type: String },

    kind: { type: String },

    copyright: { type: String }

});

module.exports = mongoose.model('Tag', tagSchema);
