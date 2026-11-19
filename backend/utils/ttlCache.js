// Tiny in-process cache with a time-to-live and "single flight" loading: when many requests ask for the same key at
// once (e.g. 600 students opening the dashboard together) only ONE of them hits the database.
const store = new Map();     // key -> { at, value } | { promise }
async function cached(key, ttlMs, loader) {
  if (process.env.CACHE_DISABLED === '1') return loader();   // used by the test-suite, which edits the database directly
  const hit = store.get(key);
  if (hit) {
    if (hit.promise) return hit.promise;
    if (Date.now() - hit.at < ttlMs) return hit.value;
  }
  const promise = loader().then(value => { store.set(key, { at: Date.now(), value }); return value; }, err => { store.delete(key); throw err; });
  store.set(key, { promise });
  return promise;
}
const clear = prefix => { for (const k of store.keys()) if (!prefix || k.startsWith(prefix)) store.delete(k); };
module.exports = { cached, clear };
