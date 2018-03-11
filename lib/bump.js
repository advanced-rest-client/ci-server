const semver = require('semver');
const fs = require('fs-extra');
const path = require('path');
/**
 * Class to handle version bump in bower and package files.
 */
class Bump {
  /**
   * @constructor
   *
   * @param {String} componentDri Component directory location.
   */
  constructor(componentDri) {
    this.componentDir = componentDri;
  }

  /**
   * Bumps version for `bower` and `package.json` files.
   *
   * @return {Promise}
   */
  bumpVersion() {
    console.info('Bumping component version.');
    const bowerFile = path.join(this.componentDir, 'bower.json');
    const packageFile = path.join(this.componentDir, 'package.json');
    return this.bumpFileVersion(bowerFile)
    .then(() => this.bumpFileVersion(packageFile));
  }
  /**
   * Bumps version in `bower` file.
   *
   * @param {String} file A file with version information.
   * @return {Promise}
   */
  bumpFileVersion(file) {
    console.info('Bumping version in ', file);
    return fs.pathExists(file)
    .then((exists) => {
      if (exists) {
        return fs.readJson(file);
      } else {
        console.warn('   File does not exists.');
      }
    })
    .then((bower) => {
      if (!bower) {
        return;
      }
      const newVer = semver.inc(bower.version, 'patch');
      bower.version = newVer;
      return fs.writeJson(file, bower, {
        spaces: 2
      });
    });
  }
}

module.exports.Bump = Bump;
