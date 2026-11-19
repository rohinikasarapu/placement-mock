const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI is not set. Copy backend/.env.example to backend/.env and fill it in.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: +(process.env.DB_POOL_SIZE || 50),   // 600 students are served from a bounded connection pool
    minPoolSize: 5,
    maxIdleTimeMS: 60000
  });
  console.log('MongoDB connected:', mongoose.connection.name);
}
module.exports = connectDB;
