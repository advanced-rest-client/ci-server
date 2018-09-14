const Datastore = require('@google-cloud/datastore');
const slug = require('slug');
const decamelize = require('decamelize');
const config = require('../config');
/**
 * A model for catalog items.
 */
class CatalogModel {
  /**
   * @constructor
   */
  constructor() {
    this.store = new Datastore({
      projectId: config.get('GCLOUD_PROJECT')
    });
    this.namespace = 'api-components';
    this.componentsKind = 'Component';
    this.versionsKind = 'Version';
    this.groupsKind = 'Group';
  }
  /**
   * Creates a slug from a string.
   *
   * @param {String} name Value to slug,
   * @return {String}
   */
  slug(name) {
    return slug(decamelize(name, '-'));
  }
  /**
   * Creates a new version of API component in the data store.
   *
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {String} data Data to store
   * @return {Promise}
   */
  addVersion(version, componentName, groupName, data) {
    const entities = [];
    return this._ensureGroup(groupName, entities)
    .then(() =>
      this._ensureComponent(version, componentName, groupName, entities))
    .then((addVersion) => {
      if (addVersion) {
        return this._createVersion(version, componentName,
          groupName, data, entities);
      } else {
        return this._replaceVersion(version, componentName,
          groupName, data, entities);
      }
    })
    .then((version) => {
      entities.push(version);
      return this.store.upsert(entities);
    });
  }
  /**
   * Creates a group of components if does not exists.
   *
   * @param {String} groupName Name of the group
   * @param {Array} result Entity results array
   * @return {Promise}
   */
  _ensureGroup(groupName, result) {
    const key = this.store.key({
      namespace: this.namespace,
      path: [
        this.groupsKind,
        this.slug(groupName)
      ]
    });
    return this.store.get(key)
    .catch(() => {})
    .then((data) => {
      if (!data || !data[0]) {
        // console.log('Creating group entity');
        result.push(this._createGroup(groupName, key));
      }
    });
  }
  /**
   * Creates a component group entity.
   *
   * @param {String} name Name of the group
   * @param {Object} key Key of the entity.
   * @return {Object} Generated model.
   */
  _createGroup(name, key) {
    const data = {
      key: key,
      data: {
        name: name,
        ref: this.slug(name)
      }
    };
    return data;
  }
  /**
   * Test if component data are already stored and creates a model if not.
   *
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {Array} result Entity results array
   * @return {Promise}
   */
  _ensureComponent(version, componentName, groupName, result) {
    const key = this.store.key({
      namespace: this.namespace,
      path: [
        this.groupsKind,
        this.slug(groupName),
        this.componentsKind,
        this.slug(componentName)
      ]
    });
    return this.store.get(key)
    .catch(() => {})
    .then((data) => {
      if (!data || !data[0]) {
        // console.log('Creating component entity');
        result.push(
          this._createComponent(componentName, version, groupName, key));
        return true;
      } else {
        const model = this._addComponentVersion(data[0], version);
        if (model) {
          result.push(model);
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Creates a component entity.
   *
   * @param {String} name Name of the group
   * @param {String} version Component version
   * @param {String} groupName Component's group
   * @param {Object} key Key of the entity.
   * @return {Object} Generated model.
   */
  _createComponent(name, version, groupName, key) {
    const entity = {
      key: key,
      data: [{
        name: 'ref',
        value: this.slug(name),
        excludeFromIndexes: false
      }, {
        name: 'name',
        value: name,
        excludeFromIndexes: false
      }, {
        name: 'version',
        value: version,
        excludeFromIndexes: true
      }, {
        name: 'versions',
        value: [version],
        excludeFromIndexes: true
      }, {
        name: 'group',
        value: groupName,
        excludeFromIndexes: true
      }]
    };
    return entity;
  }
  /**
   * Adds a new version to the component model.
   * @param {Object} model Existing model
   * @param {String} version Version number
   * @return {Object} updated model
   */
  _addComponentVersion(model, version) {
    if (!model.versions) {
      model.versions = [];
    }
    if (model.versions.indexOf(version) !== -1) {
      return;
    }
    model.versions[model.versions.length] = version;
    return model;
  }
  /**
   * Creates datastore key for version object
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @return {Object}
   */
  _getVersionKey(version, componentName, groupName) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.groupsKind,
        this.slug(groupName),
        this.componentsKind,
        this.slug(componentName),
        this.versionsKind,
        version
      ]
    });
  }
  /**
   * Creates component version entity.
   *
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {Object} data Elmements
   * @return {Object} Generated model.
   */
  _createVersion(version, componentName, groupName, data) {
    // console.log('Creating version entity');
    const key = this._getVersionKey(version, componentName, groupName);
    const entity = {
      key: key,
      data: [{
        name: 'name',
        value: componentName,
        excludeFromIndexes: false
      }, {
        name: 'version',
        value: version,
        excludeFromIndexes: false
      }, {
        name: 'docs',
        value: JSON.stringify(data),
        excludeFromIndexes: true
      }]
    };
    return entity;
  }
  /**
   * Replaces data in existing version model.
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {Object} data Elmements
   * @return {Object} A data model to be updated
   */
  _replaceVersion(version, componentName, groupName, data) {
    const key = this._getVersionKey(version, componentName, groupName);
    return this.store.get(key)
    .catch(() => {})
    .then((model) => {
      if (!model || !model[0]) {
        return this._createVersion(version, componentName, groupName, data);
      } else {
        model = model[0];
        model.docs = JSON.stringify(data);
        return model;
      }
    });
  }
}

module.exports.CatalogModel = CatalogModel;
