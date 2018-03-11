const {Analyzer, FSUrlLoader} = require('polymer-analyzer');
const fs = require('fs-extra');
const path = require('path');
/**
 * A class that builds component's documentation to readme file.
 */
class ApiDocs {
  /**
   * @constructor
   *
   * @param {String} componentName Name of the component
   * @param {String} componentDir Component directory location.
   */
  constructor(componentName, componentDir) {
    this.componentName = componentName;
    this.componentDir = componentDir;
    this.analyzer = new Analyzer({
      urlLoader: new FSUrlLoader(componentDir),
    });
  }
  /**
   * Builds readme file.
   *
   * @return {Promise}
   */
  build() {
    return this.listElements()
    .then((elements) => this.analyse(elements))
    .then((result) => this.createDocs(result))
    .then((str) => this.updateReadme(str));
  }
  /**
   * Lists elements for the component from bower file.
   *
   * @return {Promise}
   */
  listElements() {
    console.info('  Reading elements list in component.');
    const bowerFile = path.join(this.componentDir, 'bower.json');
    return fs.pathExists(bowerFile)
    .then((exists) => {
      if (exists) {
        return fs.readJson(bowerFile);
      } else {
        console.warn('   File does not exists.');
      }
    })
    .then((bower) => {
      if (!bower) {
        return;
      }
      let main = bower.main || [];
      if (typeof main === 'string') {
        main = [main];
      }
      return main;
    });
  }
  /**
   * Performs element analysis and returns component AST.
   *
   * @param {Array<String>} elements List of components to analyze.
   * @return {Promise}
   */
  analyse(elements) {
    if (!elements) {
      return Promise.resolve();
    }
    console.info('  Analyzing component.');
    const elementsPaths = elements.map((file) => {
      if (file.indexOf('.html') === -1) {
        return;
      }
      return './' + file;
    }).filter((file) => !!file);
    return this.analyzer.analyze(elementsPaths)
    .then((analysis) => {
      const result = [];
      elements.forEach((name) => {
        name = name.replace('.html', '');
        const element = analysis.getFeatures({
          kind: 'element',
          id: name,
          externalPackages: true
        });
        if (element) {
          result.push(element);
        }
      });
      return result;
    });
  }
  /**
   * Generates content for README file.
   *
   * @param {Array<Object>} analysis List of analysis results.
   * @return {Promise}
   */
  createDocs(analysis) {
    if (!analysis) {
      return Promise.resolve();
    }
    console.info('  Generating component documentation.');
    this.analyzed = [];
    let str = '[![Build Status](https://travis-ci.org/';
    str += `advanced-rest-client/${this.componentName}.svg?branch=stage`;
    str += ')](https://travis-ci.org/advanced-rest-client/';
    str += `${this.componentName})\n\n`;
    analysis.forEach((item) => str += this._processAnalysisResult(item));
    return Promise.resolve(str);
  }
  /**
   * Saves generated document in README.md file.
   *
   * @param {String} str Generated document
   * @return {Promise}
   */
  updateReadme(str) {
    const file = path.join(this.componentDir, 'README.md');
    return fs.writeFile(file, str);
  }
  /**
   * Processes component analysis result.
   *
   * @param {Object} analysis Polymer analyzer analysis result.
   * @return {String} Document content.
   */
  _processAnalysisResult(analysis) {
    let result = '';
    analysis.forEach((ast) => {
      result += this._analysisToString(ast);
    });
    return result;
  }
  /**
   * Converts component AST to documentation string.
   *
   * @param {Object} ast PolymerElement object
   * @return {String} Documentation for an element
   */
  _analysisToString(ast) {
    let body = '## ' + ast.name + ' component\n';
    if (ast.tagName && ast.name !== ast.tagName) {
      body += 'Tag: `<' + ast.tagName + '>`\n\n';
    }
    body += this._installationDetails(ast);
    body += ast.description + '\n\n';
    body += '## API\n';
    body += this._getPropertiesTable(ast);
    body += this._getMethodsTable(ast);
    return body;
  }
  /**
   * Converts component AST to installation details.
   *
   * @param {Object} ast PolymerElement object
   * @return {String} Installation details documentation.
   */
  _installationDetails(ast) {
    let body = '### Installation\n';
    body += 'Using bower:\n';
    body += '```\n';
    body += 'bower install --save advanced-rest-client/';
    body += (ast.tagName || ast.name) + '\n';
    body += '```\n\n';
    return body;
  }

  /**
   * Converts component AST to properties table.
   *
   * @param {Object} ast PolymerElement object
   * @return {String} Properties documentation.
   */
  _getPropertiesTable(ast) {
    let body = '### Component properties (attributes)\n\n';
    for (const [name, properties] of ast.properties) {
      if (name[0] === '_' || properties.privacy !== 'public') {
        continue;
      }
      let inh = properties.inheritedFrom;
      if (inh && inh.indexOf('Polymer') !== -1) {
        continue;
      }
      body += '#### ' + name + '\n';
      body += '- Type: `' + properties.type + '`\n';
      if (properties.default) {
        body += '- Default: `' + properties.default + '`\n';
      }
      if (properties.readOnly) {
        body += '- Read only property\n';
      }
      body += properties.description + '\n\n';
    }
    body += '\n';
    return body;
  }

  /**
   * Converts component AST to properties table.
   *
   * @param {Object} ast PolymerElement object
   * @return {String} Properties documentation.
   */
  _getMethodsTable(ast) {
    let body = '### Component methods\n\n';
    for (const [name, properties] of ast.methods) {
      if (name[0] === '_' || properties.privacy !== 'public') {
        continue;
      }
      let inh = properties.inheritedFrom;
      if (inh && inh.indexOf('Polymer') !== -1) {
        continue;
      }
      body += '#### ' + name + '\n';
      body += '- Return type: ';
      if (properties.return && properties.return.type) {
        body += '`' + properties.return.type + '`';
      } else {
        body += '`undefined`';
      }
      body += '\n' + properties.description + '\n';
    }
    body += '\n';
    return body;
  }
}
module.exports.ApiDocs = ApiDocs;
