const {CatalogDataGenerator} = require('./lib/data-generator');
const builder = new CatalogDataGenerator('xml-viewer', '2.0.0');
builder.build()
.catch((e) => console.error(e));
