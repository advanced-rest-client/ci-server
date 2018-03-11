const Datastore = require('@google-cloud/datastore');
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
    .then(() =>
      this._createVersion(version, componentName, groupName, data, entities))
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
      path: [this.groupsKind, groupName]
    });
    return this.store.get(key)
    .catch(() => {})
    .then((data) => {
      if (!data || !data[0]) {
        console.log('Creating group entity');
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
        name: name
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
      path: [this.groupsKind, groupName, this.componentsKind, componentName]
    });
    return this.store.get(key)
    .catch(() => {})
    .then((data) => {
      if (!data || !data[0]) {
        console.log('Creating component entity');
        result.push(
          this._createComponent(componentName, version, groupName, key));
      }
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
   * Creates component version entity.
   *
   * @param {String} version Component version
   * @param {String} componentName Component name
   * @param {String} groupName Component's group
   * @param {Object} data Elmements
   * @return {Object} Generated model.
   */
  _createVersion(version, componentName, groupName, data) {
    console.log('Creating version entity');
    const key = this.store.key({
      namespace: this.namespace,
      path: [
        this.groupsKind,
        groupName,
        this.componentsKind,
        componentName,
        this.versionsKind, version
      ]
    });
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
}

module.exports.CatalogModel = CatalogModel;
