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
	url: req.url,
	videos: require('../views/guides/videos.json')	
    });
  });

  /**
   * GET /guides/instructor-guide
   */

  app.get('/guides/instructor-guide', function (req, res) {
    res.render('guides/instructor-guide', {
	url: req.url,
    });
  });
  /**
   * GET /guides/student-guide
   */

  app.get('/guides/student-guide', function (req, res) {
    res.render('guides/student-guide', {
	url: req.url,
    });
  });
  
  /**
   * GET /guides/learning-outcomes
   */

  app.get('/guides/learning-outcomes', function (req, res) {
    res.render('guides/learning-outcomes', {
      url: req.url,
    });
  });
  /**
   * GET /guides/peer-review
   */

  app.get('/guides/peer-review', function (req, res) {
    res.render('guides/peer-review', {
      url: req.url,
    });
  });
  /**
   * GET /guides/worksheet-howto
   */

  app.get('/guides/worksheet-howto', function (req, res) {
    res.render('guides/worksheet-howto', {
      url: req.url,
    });
  });
  /**
   * GET /guides/flipclass-howto
   */

  app.get('/guides/flipclass-howto', function (req, res) {
    res.render('guides/flipclass-howto', {
      url: req.url,
    });
  });
};
