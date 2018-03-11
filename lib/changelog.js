const fs = require('fs-extra');
const path = require('path');
const exec = require('child_process').exec;
/**
 * A class that builds changelog file from git commits.
 */
class Changelog {
  /**
   * @constructor
   *
   * @param {String} componentDri Component directory location.
   */
  constructor(componentDri) {
    this.componentDir = componentDri;
    this.changelogFile = path.join(componentDri, 'CHANGELOG.md');
  }
  /**
   * Builds changelog file.
   *
   * @return {Promise}
   */
  build() {
    return fs.ensureFile(this.changelogFile)
    .then(() => this._runChangelog());
  }
  /**
   * Executes changelog command.
   *
   * @return {Promise}
   */
  _runChangelog() {
    const cmd = 'conventional-changelog -i CHANGELOG.md --same-file -p eslint';
    return this.exec(cmd, this.componentDir)
    .then((result) => {
      if (this.verbose) {
        console.log('Changelog result: ', result);
      }
      return result;
    });
  }

  /**
   * Execute shell command
   *
   * @param {String} cmd Command to execute
   * @param {String?} dir A directoy where to execute the command.
   * @return {Promise} Promise resolves itself if the command was
   * executed successfully and rejects it there was an error.
   */
  exec(cmd, dir) {
    dir = dir || undefined;
    return new Promise((resolve, reject) => {
      const opts = {};
      if (dir) {
        opts.cwd = dir;
      }
      if (this.verbose) {
        console.log(`Executing command: ${cmd} in dir: ${dir}`);
      }
      exec(cmd, opts, (err, stdout, stderr) => {
        if (err) {
          let currentDir = process.cwd();
          if (opts.cwd) {
            currentDir = opts.cwd;
          }
          reject(new Error('Unable to execute command: ' + err.message +
            '. Was in dir: ' + currentDir + '. stdout: ', stdout,
            '. stderr: ', stderr));
          return;
        }
        resolve(stdout);
      });
    });
  }
}
module.exports.Changelog = Changelog;
