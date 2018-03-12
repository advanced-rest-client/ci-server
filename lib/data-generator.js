const {Analyzer, FSUrlLoader, PackageUrlResolver, generateAnalysis} =
  require('polymer-analyzer');
const path = require('path');
const {CatalogModel} = require('./catalog-model');
/**
 * Class responsible for generating data for API components catalog.
 */
class CatalogDataGenerator {
  /**
   * @constructor
   *
   * @param {String} component Component name from ARC organization.
   * @param {String} tagVersion Released tag version.
   */
  constructor(component, tagVersion) {
    this.component = component;
    this.version = tagVersion;
    this.componentDir = this._getComponentDir(component);
    this.analyzer = new Analyzer({
      urlLoader: new FSUrlLoader(this.componentDir),
      urlResolver: new PackageUrlResolver(),
    });
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
   * Generates documentation file for the component and tag.
   * Result is sent to the catalog www server.
   *
   * @return {Promise}
   */
  build() {
    const isInTests = /(\b|\/|\\)(test)(\/|\\)/;
    const isNotTest = (f) => f.sourceRange &&
      !isInTests.test(f.sourceRange.file);
    return this.analyzer.analyzePackage()
    .then((pkg) => this._extractComponentTags(pkg))
    .then((pkg) => generateAnalysis(pkg, '', isNotTest))
    .then((result) => this._cleanStoreData(result))
    .then((result) => {
      const group = this._getGroupName();
      const model = new CatalogModel();
      return model.addVersion(this.version, this.component, group, result);
    });
  }
  /**
   * Extracts group name from the analysis result.
   *
   * @param {Object} pkg Analysis result/.
   * @return {Object} Analysis result.
   */
  _extractComponentTags(pkg) {
    const doc = pkg.getDocument(this.component + '.html');
    const set = doc.getFeatures({kind: 'element', id: this.component});
    let element;
    set.forEach((item) => {
      element = item;
    });
    let result = [];
    if (element && element.jsdoc && element.jsdoc.tags &&
      element.jsdoc.tags.length) {
      result = element.jsdoc.tags;
    }
    this.tags = result;
    return pkg;
  }
  /**
   * Extracts group name from the tags.
   *
   * @return {String} Element group name.
   */
  _getGroupName() {
    let t = this.tags;
    let result;
    if (t) {
      let tag = t.find((item) =>
        item.title === 'memberof' || item.title === 'group');
      if (tag) {
        result = tag.description;
      }
    }
    if (!result) {
      result = 'ApiElements';
    }
    return result;
  }
  /**
   * Removes data not used by the catalog.
   *
   * @param {Object} data Element analysis result.
   * @return {Object} Data ready to be stored.
   */
  _cleanStoreData(data) {
    if (data.elements) {
      data.elements = data.elements.map((item) => this._cleanItem(item));
    }
    if (data.metadata) {
      if (data.metadata.polymer) {
        if (data.metadata.polymer.behaviors) {
          data.metadata.polymer.behaviors =
          data.metadata.polymer.behaviors.map((item) => this._cleanItem(item));
        }
      }
    }
    return data;
  }
  /**
   * Cleans analysis result item.
   *
   * @param {Object} item Analysis result item
   * @return {Object} Data to be stored in the data store.
   */
  _cleanItem(item) {
    item.events = this.cleanArray(item.events);
    item.methods = this.cleanNames(item.methods);
    item.methods = this.cleanArray(item.methods);
    item.properties = this.cleanNames(item.properties);
    item.properties = this.cleanArray(item.properties);
    item.slots = this.cleanArray(item.slots);
    item.styling = item.styling || {};
    item.styling.cssVariables = this.cleanArray(item.styling.cssVariables);
    item.styling.selectors = this.cleanArray(item.styling.selectors);
    delete item.sourceRange;
    delete item.attributes;
    delete item.staticMethods;
    return item;
  }
  /**
   * Cleans array items for unwanted data from the analysis.
   *
   * @param {Array<Object>} arr Analysed data
   * @return {Array<Object>} Thre same array without unwanted data
   */
  cleanArray(arr) {
    if (!arr || !arr.length) {
      return arr;
    }
    arr = arr.map((item) => {
      delete item.sourceRange;
      return item;
    });
    return arr;
  }
  /**
   * Removes properties and methods from the array that are not directly related
   * to the element.
   *
   * @param {Array<Object>} arr Analysed data
   * @return {Array<Object>} Thre same array without unwanted data
   */
  cleanNames(arr) {
    if (!arr || !arr.length) {
      return arr;
    }
    arr = arr.filter((item) => {
      let inh = item.inheritedFrom;
      if (inh && inh.indexOf('Polymer') !== -1) {
        return false;
      }
      return true;
    });
    return arr;
  }
}
module.exports.CatalogDataGenerator = CatalogDataGenerator;
