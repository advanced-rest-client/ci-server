const assert = require('chai').assert;
const {CatalogModel} = require('../lib/catalog-model');

describe('Catalog model', () => {
  it('Creates catalog model', () => {
    const model = new CatalogModel();
    return model.addVersion('0.0.1', 'test-component', 'test-group', {
      type: 'test'
    })
    .then((result) => {
      assert.typeOf(result, 'object');
    });
  });
});
