'use strict';

/**
 * Meta Controller
 */

module.exports.controller = function (app) {

  /**
   * GET /meta/fcla-topics
   * David's topic's graph for Rob's book.
   */

  app.get('/meta/fcla-topics-graph', function (req, res) {
    res.render('/meta/fcla-topics-graph', {
      url: req.url
    });
  });

  /**
   * GET /guides/instructor-guide
   */

  app.get('/guides/instructor-guide', function (req, res) {
    res.render('guides//instructor-guide', {
	url: req.url,
    });
  });
};
