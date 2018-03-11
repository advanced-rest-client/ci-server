'use strict';

const express = require('express');
const router = express.Router();
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');
const {StageBuild} = require('./lib/stage-build');

app.use(router);
app.use(bodyParser.raw({type: 'application/*', limit: '50mb'}));
/**
 * The CI class working witgh travis requests to build the API components.
 */
class ArcCiServer {
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
    return this.nonElements;
  }
  /**
   * @constructor
   */
  constructor() {
    this.port = 5243;
    app.disable('x-powered-by');
    app.disable('etag');
    this.setHandlers();
    this.createServer();
  }
  /**
   * Sets routing to handle communcation.
   */
  setHandlers() {
    this.setStageUpdate();
  }
  /**
   * Creates server instance.
   */
  createServer() {
    const httpServer = http.createServer(app);
    httpServer.listen(this.port, () => {
      console.log('HTTP started (' + this.port + ').');
    });
  }
  /**
   * This endpoint is called when the `stage` branch has been updated.
   *
   * It calls a script that is building docs, changelog and bumping version.
   * Next it will commit changes and merge it with master.
   * Both branches will be pushed back to GitHub.
   */
  setStageUpdate() {
    app.post('/build', (req, res) => {
      // Old system. Inactive.
      if (!req.body) {
        return res.sendStatus(400);
      }
      let event = req.get('X-GitHub-Event');
      if (event === 'ping') {
        return res.sendStatus(204);
      }
      let allowedEvents = ['push'];
      if (allowedEvents.indexOf(event) === -1) {
        return res.sendStatus(404);
      }
      res.set('Connection', 'close');
      let body = JSON.parse(decoder.write(req.body));
      if (event === 'pull_request') {
      //   // this.handlePullRequest(body);
        return res.sendStatus(204);
      }
      if (event === 'push') {
        this.handlePush(body);
        return res.sendStatus(204);
      }
    });

    app.post('/travis-build', (req, res) => {
      if (!req.body) {
        console.log(req);
        return res.sendStatus(400);
      }
      let event = req.get('x-travis-ci-event');
      switch (event) {
        case 'build-stage':
          let body = JSON.parse(decoder.write(req.body));
          this.buildStage(body);
        break;
        default:
          return res.sendStatus(400);
      }
      return res.sendStatus(204);
    });
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
    const repoName = body.repository.name;
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
    if (this.ignored.indexOf(repoName) !== -1) {
      console.log('Rejecting repo ', repoName);
      return; // Don't process this repos.
    }
    if (branch === 'refs/heads/stage') {
      return;
    } else if (branch === 'refs/heads/master') {
      if (message === 'Initial commit') {
        // Just quietly exit
        console.error('Command rejected: Will not handle initial commit.');
        return;
      }
      if (message === '[ci skip] Automated merge stage->master.') {
        setTimeout(() => {
          console.log('Command accepted: Handle release');
          this.handleRelease(repoName);
        }, 1000);
      }
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
   * Run a bash file
   *
   * @param {String} file A file name to Run
   * @param {Array<String>} params Array of parameters
   * @param {String} name The name of process to mark. Optional.
   * @return {Promise}
   */
  _runScript(file, params, name) {
    return new Promise((resolve, reject) => {
      setTimeout(function() {
        try {
          const spawn = require('child_process').spawn;
          const build = spawn(file, params);

          build.stdout.on('data', (data) => {
            if (!data) {
              return;
            }
            if (name) {
              console.log(`[${name}]: ${data}`);
            } else {
              console.log(data.toString('utf8'));
            }
          });

          build.stderr.on('data', (data) => {
            if (!data) {
              return;
            }
            if (name) {
              console.error(`[${name}]: ${data}`);
            } else {
              console.error(data.toString('utf8'));
            }
          });

          build.on('close', (code) => {
            if (name) {
              console.log(`[${name}] finished with code ${code}`);
            }
            if (code === 0 || code === '0') {
              resolve(code);
            } else {
              reject(new Error(`task [${name}] finished with code ${code}`));
            }
          });
        } catch (e) {
          const msg = `[${name}] fatal error: ${e.message}`;
          console.error(msg);
          reject(new Error(msg));
        }
      }, 3000);
    });
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
    const prNumber = Number(body.pullRequest);
    if (prNumber === prNumber) {
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

new ArcCiServer();
