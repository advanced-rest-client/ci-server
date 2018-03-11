'use strict';
const {ErrorResponse} = require('../models/error-response');
/**
 * Base reoute containing common functions.
 */
class BaseRoute {
  /**
   * @constructor
   */
  constructor() {
    this._onGetOptions = this._onGetOptions.bind(this);
  }

  /**
   * Sends an error response to the client.
   *
   * @param {Object} resp Express response object.
   * @param {Number} code Error status code. Default 400.
   * @param {String} errorCode Error code.
   * @param {String} message A reason message. Default empty string.
   */
  sendError(resp, code, errorCode, message) {
    const error = new ErrorResponse(errorCode, message);
    const body = JSON.stringify(error, null, 2);
    resp.set('Content-Type', 'application/json');
    resp.status(code || 400).send(body);
  }
  /**
   * Send an API success response.
   * @param {Object} resp Express response object.
   * @param {Object} obj An object to stringnify and send.
   * @param {Number} statusCode Response status code. Default 200.
   */
  sendObject(resp, obj, statusCode) {
    statusCode = statusCode || 200;
    obj = obj || {};
    const body = JSON.stringify(obj, null, 2);
    resp.set('Content-Type', 'application/json');
    resp.status(statusCode).send(body);
  }
  /**
   * Sends CORS headers.
   *
   * @param {Object} req Request
   * @param {Object} res Response
   */
  _onGetOptions(req, res) {
    this.appendCors(req, res);
    res.set('Content-Type', 'plain/text');
    res.status(200).send('GET,HEAD,POST');
  }
  /**
   * Appends COST headers to the response.
   *
   * @param {Object} req Request
   * @param {Object} res Response
   */
  appendCors(req, res) {
    const origin = req.get('origin');
    let allowed = false;
    if (origin) {
      if (origin.indexOf('http://127.0.0.1') === 0 || origin.indexOf('http://localhost') === 0) {
        res.set('access-control-allow-origin', origin);
        allowed = true;
      } else if (origin.indexOf('advancedrestclient.com') === 0) {
        res.set('access-control-allow-origin', origin);
        allowed = true;
      }
    }
    if (allowed) {
      res.set('allow', 'GET,HEAD');
      res.set('access-control-allow-headers', 'authorization');
    }
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
      setTimeout(() => {
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
}

module.exports.BaseRoute = BaseRoute;
