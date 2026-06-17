const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kentaz';

const mongoOptions = {
  // Fail fast instead of hanging the whole serverless function (Vercel kills
  // at 300s) when the cluster is unreachable or the IP isn't allow-listed.
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  // Keep the pool small — serverless functions are single-request and we don't
  // want each cold start opening a large pool against Atlas.
  maxPoolSize: 5,
  // Don't queue queries while disconnected; surface a clear error instead of
  // buffering until the function times out.
  bufferCommands: false,
};

// Cache the connection promise across warm serverless invocations. Without this
// every request (and every concurrent module reuse) would kick off a new
// connection, exhausting the Atlas connection limit and causing timeouts.
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI, mongoOptions)
      .then((m) => {
        console.log('Connected to MongoDB');
        return m;
      })
      .catch((err) => {
        // Reset so the next request can retry instead of reusing a rejected
        // promise forever.
        cached.promise = null;
        console.error('MongoDB connection error:', err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
