const mongoose = require("mongoose");

let mongod = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/shopkart";
  
  try {
    // Attempt connecting to the configured URI with a 3-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] Connected successfully to MongoDB at ${uri}`);
  } catch (err) {
    console.warn(`[Database] Could not connect to external MongoDB (${err.message}).`);
    console.log("[Database] Initializing embedded MongoDB server for zero-setup execution...");
    
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      mongod = await MongoMemoryServer.create({
        instance: {
          dbName: "shopkart"
        }
      });
      const memoryUri = mongod.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] Connected successfully to embedded MongoDB at ${memoryUri}`);
    } catch (memErr) {
      console.error("[Database] Failed to initialize embedded MongoDB:", memErr.message);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

module.exports = { connectDB, disconnectDB };
