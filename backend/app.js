const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') })); // same-origin by default

app.use(compression());   // gzip: the question papers and static assets shrink ~5-8x
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
  next();
});
app.use(express.json({ limit: '200kb' }));

const dbstats = require('./utils/dbstats');
if (dbstats.enabled()) dbstats.enable();
app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now(), ...(dbstats.enabled() && req.query.stats ? { dbOps: dbstats.counts } : {}) }));
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api', routes);
app.use('/api', notFound);
// Official college logo: serves whichever of public/img/college-logo.{png,jpg,jpeg,svg,webp} the college has supplied (404 if none yet).
app.get('/img/college-logo', (req, res, next) => {
  const dir = path.join(__dirname, '..', 'public', 'img');
  const f = ['png', 'jpg', 'jpeg', 'svg', 'webp'].map(e => path.join(dir, 'college-logo.' + e)).find(fs.existsSync);
  return f ? res.sendFile(f) : res.status(404).end();
});
// Static files: short browser cache for css/js/images so 600 students do not re-download them on every page.
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], etag: true, setHeaders: (res, file) => {
  res.setHeader('Cache-Control', /\.(css|js|png|jpe?g|svg|webp|ico)$/i.test(file) ? 'public, max-age=300' : 'no-cache');
} }));
app.use(errorHandler);

module.exports = app;
