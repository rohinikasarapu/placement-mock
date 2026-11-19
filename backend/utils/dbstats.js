// Optional database-operation counter (DB_STATS=1). Used by the load test to report how many DB calls each request costs.
const mongoose = require('mongoose');
const counts = { total: 0, byMethod: {}, byCollection: {} };
function enable() {
  mongoose.set('debug', (collection, method) => {
    counts.total++;
    counts.byMethod[method] = (counts.byMethod[method] || 0) + 1;
    counts.byCollection[collection] = (counts.byCollection[collection] || 0) + 1;
  });
}
module.exports = { enable, counts, enabled: () => process.env.DB_STATS === '1' };
