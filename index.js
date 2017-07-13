'use strict';

const express = require('express');
const router = express.Router();
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');

app.use(router);
app.use(bodyParser.raw({type: 'application/*', limit: '50mb'}));

class ArcCiServer {

  get elementsParents() {
    return ['chrome-elements', 'logic-elements', 'raml-elements', 'transport-elements',
      'ui-elements', 'anypoint-elements'];
  }

  get nonElements() {
    return ['arc-datastore', 'arc-tools', 'polymd', 'cookie-parser',
    'har', 'arc-element-catalog', 'ci-server'];
  }

  get ignored() {
    return this.nonElements; //.concat(this.elementsParents);
  }

  constructor() {
    this.port = 5243;
    app.disable('x-powered-by');
    app.disable('etag');
    this.setHandlers();
    this.createServer();
  }

  setHandlers() {
    this.setStageUpdate();
    // this.setTestServiice();
  }

  createServer() {
    var httpServer = http.createServer(app);
    httpServer.listen(this.port, () => {
      console.log('HTTP started (' + this.port + ').');
    });
  }

  // setTestServiice() {
  //   app.get('/', (req, res) => {
  //     this.handleRelease('test-element');
  //   });
  // }

  /**
   * This endpoint is called when the `stage` branch has been updated (after PR).
   *
   * It calls a script that is building docs, changelog and bumping version.
   * Next it will commit changes and merge it with master.
   * Both branches will be pushed back to GitHub.
   */
  setStageUpdate() {
    app.post('/build', (req, res) => {
      if (!req.body) {
        console.log(req);
        return res.sendStatus(400);
      }
      let event = req.get('X-GitHub-Event');
      if (event === 'ping') {
        // console.log(decoder.write(req.body));
        // hmac.update(req.body);
        // console.log(hmac.digest('hex'));
        return res.sendStatus(204);
      }
      let allowedEvents = ['push'];
      if (allowedEvents.indexOf(event) === -1) {
        return res.sendStatus(404);
      }
      res.set('Connection', 'close');
      let body = JSON.parse(decoder.write(req.body));
      // if (event === 'pull_request') {
      //   // this.handlePullRequest(body);
      //   return res.sendStatus(204);
      // }
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

  // handlePullRequest(body) {
  //   // empty for now
  //   console.log('handlePullRequest');
  // }

  handlePush(body) {
    var branch = body.ref;
    if (!branch) {
      console.log('No ref...');
      return;
    }
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    var message = body.head_commit ? body.head_commit.message : 'No message';
    var repoName = body.repository.name;
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
    if (this.ignored.indexOf(repoName) !== -1) {
      console.log('Rejecting repo ', repoName);
      return; // Don't process this repos.
    }
    if (branch === 'refs/heads/stage') {
      console.info('Command rejected: Stage has been moved to other CI command.');
      //
      // This part was replaced by Travis call.
      // See raml-path-to-object for travis configuration.
      //

      // if (message === 'Initial commit') {
      //   // Just quietly exit
      //   return;
      // }
      //
      // // Check if this isn't our own change to stage
      // if (message.indexOf('[CI]') === 0) {
      //   console.log('Dropping task. It\'s an CI commit.');
      //   console.log();
      //   return;
      // }
      // this.handleStageBuild(repoName);
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
        }, 10000);
      } else {
        console.log('Unsupported master commit: ' + message);
      }
    } else if (branch.indexOf('refs/tags/') === 0) {
      // if (message.indexOf('[CI]') !== -1) {
      //   console.log('Dropping task. It\'s an CI commit.');
      //   console.log();
      //   return;
      // }
      if (this.elementsParents.indexOf(repoName) !== -1) {
        setTimeout(() => {
          console.log('Command accepted: Update catalog');
          this._updateCatalog(repoName);
        }, 10000);
        return;
      }
      if (message === '[ci skip] Automated merge stage->master.') {
        setTimeout(() => {
          console.log('Command accepted: Process tag');
          this._processNewTag(repoName);
        }, 10000);
        return;
      }
      console.log('Unsupported tag commit message: ', message);
    } else {
      console.log('Dropping branch ' + branch);
    }
  }

  handleStageBuild(name) {
    console.log('Building: ' + name);
    this._runScript('./stage-build', [name], 'stage');
  }

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

  _processNewTag(name) {
    console.log('Updating element structure: ' + name);
    if (!process.env.GITHUB_TOKEN) {
      console.error('process.env.GITHUB_TOKEN IS UNAVAILABLE');
      return;
    }
    this._runScript('./update-structure', [name], 'structure')
    .then((code) => {
      console.log(`  update-structure exited with code ${code}`);
      console.log(' ');
    })
    .catch((e) => {
      console.log(`  update-structure exited with error ${e.message}`);
      console.log(' ');
    });
  }

  /**
   * Run a bash file
   *
   * @param {String} file A file name to Run
   * @param {Array<String>} params Array of parameters
   * @param {String} name The name of process to mark. Optional.
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
          var msg = `[${name}] fatal error: ${e.message}`;
          console.error(msg);
          reject(new Error(msg));
        }
      }, 3000);
    });
  }

  /**
   * Build stage branch after travis reported successful build.
   * This comand is executed not from the GitHub event but from travis `after_success` script.
   *
   * @param {Object} body Body sent from the script.
   */
  buildStage(body) {
    if (body.branch !== 'stage') {
      return console.error('This is not the stage branch.');
    }
    var prNumber = Number(body.pullRequest);
    if (prNumber === prNumber) {
      // TODO: should update author's agreement for publishing code.
      return console.info('Passing on pull request');
    }
    var slug = body.slug; // owner_name/repo_name
    if (!slug || slug === 'unknown') {
      return console.error('The slug is unknown.');
    }

    var elementName = slug.split('/')[1];
    console.log(' ');
    console.log('  Building element for stage.');
    console.log('    build number: %s', body.buildNumber);
    console.log('    job #: %s', body.jobNumber);
    console.log('    commit sha: %s', body.commit);
    // console.log('    is pull request: %s', body.pullRequest); // not yer to be used.
    // console.log('    pull request sha: %s', body.pullRequestSha);

    var args = [elementName, body.buildNumber, body.jobNumber];
    this._runScript('./stage-build2', args).then((code) => {
      console.log(`  stage-build2 exited with code ${code}`);
      console.log(' ');
    })
    .catch((e) => {
      console.log(`  stage-build2 exited with error ${e.message}`);
      console.log(' ');
    });
  }

  _updateCatalog(name) {
    console.log(' ');
    console.log('  Updating catalog to update ', name);
    var args = [name];
    this._runScript('./update-catalog', args).then((code) => {
      console.log(`  update-catalog exited with code ${code}`);
      console.log(' ');
    })
    .catch((e) => {
      console.log(`  update-catalog exited with error ${e.message}`);
      console.log(' ');
    });
  }

}

new ArcCiServer();
