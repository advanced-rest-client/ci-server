const express = require('express');
const {BaseRoute} = require('./base-route');
const router = express.Router();
/**
 * Routing for GitHub web hooks.
 */
class GithubWebhookRoute extends BaseRoute {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.initRoute();
  }
  /**
   * Initializes routing for `/build` route.
   */
  initRoute() {
    router.options('/(.*)', this._onGetOptions);
    router.post('/', this._onBuild.bind(this));
  }
  /**
   * Handler for build route.
   *
   * @param {Object} req
   * @param {Object} res
   */
  _onBuild(req, res) {
    console.log('HEADERS');
    console.log(req.headers);
    console.log('BODY');
    console.log(req.body);
    res.set('Connection', 'close');
    res.sendStatus(204);
  }
}
new GithubWebhookRoute();

module.exports = router;
