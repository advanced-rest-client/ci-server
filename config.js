'use strict';

// Hierarchical node.js configuration with command-line arguments, environment
// variables, and files.
const nconf = module.exports = require('nconf');
const path = require('path');
nconf
  .argv()
  .env([
    'GCLOUD_PROJECT',
    'INSTANCE_CONNECTION_NAME',
    'NODE_ENV'
  ])
  .file({
    file: path.join(__dirname, 'config.json')
  })
  .defaults({
    // This is the id of your project in the Google Cloud Developers Console.
    GCLOUD_PROJECT: 'advancedrestclient-1155'
  });
/**
 * Checks if configuration exists.
 *
 * @param {String} setting Setting name
 */
function checkConfig(setting) {
  if (!nconf.get(setting)) {
    throw new Error(
      `You must set ${setting} as an environment variable or in config.json!`);
  }
}
checkConfig('GCLOUD_PROJECT');
