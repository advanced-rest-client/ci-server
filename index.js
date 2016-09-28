'use strict';

const express = require('express');
const router = express.Router();
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');

app.use(router);
app.use(bodyParser.raw({type: 'application/*'}));

class ArcCiServer {

  constructor() {
    this.port = 5243;
    app.disable('x-powered-by');
    app.disable('etag');
    this.setHandlers();
    this.createServer();
  }

  setHandlers() {
    this.setStageUpdate();
    this.setTestServiice();
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
      let allowedEvents = ['pull_request', 'push'];
      if (allowedEvents.indexOf(event) === -1) {
        return res.sendStatus(404);
      }
      res.set('Connection', 'close');
      let body = JSON.parse(decoder.write(req.body));
      if (event === 'pull_request') {
        this.handlePullRequest(body);
        return res.sendStatus(204);
      }
      if (event === 'push') {
        this.handlePush(body);
        return res.sendStatus(204);
      }
    });
  }

  handlePullRequest(body) {
    // empty for now
    console.log('handlePullRequest');
  }

  handlePush(body) {
    var branch = body.ref;
    if (!branch) {
      console.log('No ref...');
      return;
    }
    if (branch === 'refs/heads/stage') {
      if (body.head_commit.message === 'Initial commit') {
        // Just quietly exit
        return;
      }

      // Check if this isn't our own change to stage
      if (body.head_commit.message.indexOf('[CI]') === 0) {
        console.log('Dropping task. It\'s an CI commit.');
        console.log();
        return;
      }

      let repoName = body.repository.name;
      this.handleStageBuild(repoName);
    } else if ('refs/heads/master') {
      if (body.head_commit.message === 'Initial commit') {
        // Just quietly exit
        return;
      }
      if (body.head_commit.message === '[CI] Automated merge stage->master') {
        let repoName = body.repository.name;
        this.handleRelease(repoName);
      } else {
        console.log('Unsuppoeted master branch');
      }
    } else {
      console.log('Dropping branch ' + branch);
    }
  }

  handleStageBuild(name) {
    console.log('Building: ' + name);
    this._runScript('./stage-build', [name], 'stage');
  }

  handleRelease(name) {
    console.log('Tagging: ' + name);
    if (!process.env.GITHUB_TOKEN) {
      console.error('process.env.GITHUB_TOKEN IS UNAVAILABLE');
      return;
    }
    this._runScript('./tag-build', [name], 'release');
  }
  /**
   * Run a bash file
   *
   * @param {String} file A file name to Run
   * @param {Array<String>} Array of parameters
   */
  _runScript(file, params, name) {
    try {
      const spawn = require('child_process').spawn;
      const build = spawn(file, params);

      build.stdout.on('data', (data) => {
        if (!data) {
          return;
        }
        console.log(`[${name}]: ${data}`);
      });

      build.stderr.on('data', (data) => {
        if (!data) {
          return;
        }
        console.error(`[${name}]: ${data}`);
      });

      build.on('close', (code) => {
        console.log(`[${name}] finished with code ${code}`);
      });
    } catch (e) {
      console.error(`[${name}] fatal error: ${e.message}`);
    }
  }
}

new ArcCiServer();
