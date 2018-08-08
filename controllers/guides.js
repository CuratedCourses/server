'use strict';

/**
 * Guides Controller
 */

module.exports.controller = function (app) {

  /**
   * GET /guides/making-videos
   * Videos on how to make videos
   */

  app.get('/guides/making-videos', function (req, res) {
    res.render('guides/making-videos', {
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
