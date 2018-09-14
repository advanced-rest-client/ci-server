const {CatalogDataGenerator} = require('./lib/data-generator');
const builder = new CatalogDataGenerator('api-method-documentation', '2.0.15');
builder.build()
.catch((e) => console.error(e));
// const slug = require('slug');
// const decamelize = require('decamelize');

// slug.defaults.mode ='pretty';
// slug.defaults.modes.pretty = {
//     replacement: '-',
//     symbols: true,
//     remove: /[.]/g,
//     lower: true,
//     charmap: slug.charmap,
//     multicharmap: slug.multicharmap
// };
// console.log(slug(decamelize('UiElements', '-')));
