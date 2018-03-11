const express = require('express');
const {BaseRoute} = require('./base-route');
const router = express.Router();
const {StageBuild} = require('../lib/stage-build');
/**
 * Routing for GitHub web hooks.
 */
class TravisBuildRoute extends BaseRoute {
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
    if (!req.body) {
      this.sendError(res, 400, 400, 'No body.');
      return;
    }
    let ghEvent = req.get('x-travis-ci-event');
    switch (ghEvent) {
      case 'build-stage':
        process.nextTick(() => this.buildStage(req.body));
        break;
      default:
        this.sendError(res, 400, 400, 'Unknown github event.');
        return;
    }
    res.sendStatus(204);
  }

  /**
   * Build stage branch after travis reported successful build.
   * This comand is executed not from the GitHub event but from travis
   * `after_success` script.
   *
   * @param {Object} body Body sent from the script.
   */
  buildStage(body) {
    if (body.branch !== 'stage') {
      console.error('This is not the stage branch.');
      return;
    }
    if (body.pullRequest) {
      // TODO: should update author's agreement for publishing code.
      console.info('Passing on pull request');
      return;
    }
    const slug = body.slug; // owner_name/repo_name
    if (!slug || slug === 'unknown') {
      console.error('The slug is unknown.');
      return;
    }

    const elementName = slug.split('/')[1];
    console.log(' ');
    console.log('  Building element for stage.');
    console.log('    build number: %s', body.buildNumber);
    console.log('    job #: %s', body.jobNumber);
    console.log('    commit sha: %s', body.commit);
    const args = [elementName, body.buildNumber, body.jobNumber];

    console.info('  Getting latest component stage.');
    this._runScript('./update-git-element.sh', args).then(() => {
      console.log(`  Code base updated. Processing stage.`);
      console.log(' ');
      const builder = new StageBuild(elementName);
      return builder.build();
    })
    .then(() => console.info('Stage build complete.'))
    .catch((e) => {
      console.log(`  stage-build2 exited with error ${e.message}`);
      console.log(' ');
    });
  }
}
new TravisBuildRoute();

module.exports = router;
