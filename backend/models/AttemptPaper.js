const mongoose = require('mongoose');

// The frozen question paper (with answer key) of one attempt, kept apart from the attempt document on purpose:
// the attempt document is written on every answer save and must stay small, while the paper is written once and read
// once per server process (then cached). _id equals the attempt's _id.
const attemptPaperSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  paper: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { versionKey: false, collection: 'attemptpapers' });

module.exports = mongoose.model('AttemptPaper', attemptPaperSchema);
