'use strict';

/**
 * Meta Controller
 */

module.exports.controller = function(app) {
  app.get('/meta', function(req, res) {  // When user requests meta page
    res.render('meta/meta', {           // Render meta page
    });
  });
};
