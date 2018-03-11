const {StageBuild} = require('./lib/stage-build');
const builder = new StageBuild('date-time');
builder.build()
.catch((e) => console.error(e));
