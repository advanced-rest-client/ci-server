const Datastore = require('@google-cloud/datastore');
const config = require('./config');
const store = new Datastore({
  projectId: config.get('GCLOUD_PROJECT')
});
const namespace = 'api-components';
const componentsKind = 'Component';
const versionsKind = 'Version';
const groupsKind = 'Group';
/**
 * Lists groups
 * @return {Promise}
 */
function listGroups() {
  const query = store.createQuery(namespace, groupsKind);
  return store.runQuery(query)
  .then((result) => {
    console.log(result);
  });
}
/**
 * Lists components
 * @param {String} group name
 * @return {Promise}
 */
function listComponents(group) {
  const key = store.key({
    namespace: namespace,
    path: [groupsKind, group]
  });
  const query = store.createQuery(namespace, componentsKind).hasAncestor(key);
  return store.runQuery(query)
  .then((result) => {
    console.log(result);
  });
}

/**
 * Lists versions
 * @param {String} group name
 * @param {String} component name
 * @return {Promise}
 */
function listVersions(group, component) {
  const key = store.key({
    namespace: namespace,
    path: [groupsKind, group, componentsKind, component]
  });
  const query = store.createQuery(namespace, versionsKind).hasAncestor(key);
  return store.runQuery(query)
  .then((result) => {
    console.log(result);
  });
}

listGroups();
listComponents('ApiElements');
// listComponents('UiElements');
listVersions('ApiElements', 'date-time');
