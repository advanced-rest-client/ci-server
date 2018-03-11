const path = require('path');
const {Bump} = require('./bump');
const {ApiDocs} = require('./api-docs');
const {Changelog} = require('./changelog');
const {spawn} = require('child_process');
/**
 * A class that is responsible for building the stage.
 *
 * This class assumes that components source code has been already cloned
 * into `../build` direcotry (relative to the www server root path).
 */
class StageBuild {
  /**
   * @constructor
   *
   * @param {String} component Component name from ARC organization.
   */
  constructor(component) {
    this.component = component;
    this.componentDir = this._getComponentDir(component);
  }
  /**
   * Creates a path to the component directory.
   *
   * @param {String} component Component name to process.
   * @return {String} Absolute path to the component directory.
   */
  _getComponentDir(component) {
    return path.resolve('..', 'build', component);
  }
  /**
   * Builds the stage.
   * - bumps patch version
   * - creates changelog
   * - updates readme file
   * - commits changes to GitHub
   * - tags release
   * - checkout master and merge with stage
   * - push master.
   * @return {Promise}
   */
  build() {
    const bump = new Bump(this.componentDir);
    const apiDocs = new ApiDocs(this.component, this.componentDir);
    const changelog = new Changelog(this.componentDir);
    return bump.bumpVersion()
    .then(() => apiDocs.build())
    .then(() => changelog.build())
    .then(() => this._finishStage());
  }
  /**
   * Runs `finish-stage.sh` script that commits git changes.
   *
   * @return {Promise}
   */
  _finishStage() {
    console.info('  Finishing stage build.');
    return new Promise((resolve, reject) => {
      const script = spawn('./finish-stage.sh', [this.componentDir]);
      script.stdout.on('data', (data) => {
        console.info(data.toString());
      });
      script.stderr.on('data', (data) => {
        console.error(data.toString());
      });
      script.on('exit', (code) => {
        if (code && code !== 0) {
          reject(new Error());
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports.StageBuild = StageBuild;
