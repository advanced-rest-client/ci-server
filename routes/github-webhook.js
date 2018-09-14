const express = require('express');
const {BaseRoute} = require('./base-route');
const router = express.Router();
const {CatalogDataGenerator} = require('../lib/data-generator');
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
   * Parent elements.
   * @deprecated Parent elements won't be used in the future.
   * @return {Array}
   */
  get elementsParents() {
    return ['chrome-elements', 'logic-elements', 'raml-elements',
      'transport-elements', 'ui-elements', 'anypoint-elements'];
  }
  /**
   * List of know not arc component projects.
   *
   * @deprecated
   * @return {Array}
   */
  get nonElements() {
    return ['arc-datastore', 'arc-tools', 'polymd', 'cookie-parser',
    'har', 'arc-element-catalog', 'ci-server'];
  }
  /**
   * List of ignored projects.
   *
   * @return {Array}
   */
  get ignored() {
    return this.nonElements.concat(this.elementsParents);
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
    res.set('Connection', 'close');
    const body = req.body;
    if (!body) {
      res.sendStatus(400);
      return;
    }
    const ghEvent = req.get('X-GitHub-Event');
    if (ghEvent === 'ping') {
      res.sendStatus(204);
      return;
    }
    let allowedEvents = ['push'];
    if (allowedEvents.indexOf(ghEvent) === -1) {
      res.sendStatus(404);
      return;
    }
    if (ghEvent === 'pull_request') {
      res.sendStatus(204);
      return;
    }
    if (ghEvent === 'push') {
      process.nextTick(() => this.handlePush(body));
      res.sendStatus(204);
      return;
    }
  }
  /**
   * Handles web-hook message
   *
   * @param {Object} body Body from the request
   */
  handlePush(body) {
    const branch = body.ref;
    if (!branch) {
      console.log('No ref...');
      return;
    }
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    const message = body.head_commit ? body.head_commit.message : 'No message';
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
    const repoName = body.repository.name;
    if (this.ignored.indexOf(repoName) !== -1) {
      console.log('Rejecting repo ', repoName);
      return;
    }
    if (branch === 'refs/heads/stage') {
      return;
    } else if (branch === 'refs/heads/master') {
      const lowerMessage = (message || '').toLowerCase();
      if (lowerMessage.indexOf('initial commit') === 0) {
        return;
      }
      if (lowerMessage.indexOf('[ci skip]') === -1) {
        console.log('Handling release...');
        this.handleRelease(repoName);
      }
    } else if (branch.indexOf('refs/tags/') === 0) {
      this.updateCatalogData(repoName, branch.substr(10));
    } else {
      console.log('Dropping branch ' + branch);
    }
  }

  /**
   * Creates tags for new release.
   *
   * @param {String} name component name.
   */
  handleRelease(name) {
    console.log('  ');
    console.log('  Tagging: ' + name);
    if (!process.env.GITHUB_TOKEN) {
      console.error('process.env.GITHUB_TOKEN IS UNAVAILABLE');
      return;
    }
    this._runScript('./tag-build', [name]).then((code) => {
      console.log(`  tag-build exited with code ${code}`);
      console.log(' ');
    })
    .catch((e) => {
      console.log(`  tag-build exited with error ${e.message}`);
      console.log(' ');
    });
  }

  /**
   * Updates catalog data when new tag has been released.
   *
   * @TODO: Call catalog API to update component demo.
   *
   * @param {String} repoName Repository name
   * @param {String} tagVersion Tag number
   */
  updateCatalogData(repoName, tagVersion) {
    const args = [repoName];
    this._runScript('./update-git-element.sh', args).then(() => {
      console.log(`  Code base updated. Processing stage.`);
      console.log(' ');
      const builder = new CatalogDataGenerator(repoName, tagVersion);
      return builder.build();
    })
    .then(() => console.info('Stage build complete.'))
    .catch((e) => {
      console.log(`  stage-build2 exited with error ${e.message}`);
      console.log(' ');
    });
  }
}
new GithubWebhookRoute();

module.exports = router;
