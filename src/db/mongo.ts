/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-misused-promises */
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";



export async function connectMongo(uri: string) {
if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return;
  }
  mongoose.set("strictQuery", true);

  console.log("Connecting to MongoDB...", uri);

  await mongoose.connect(uri,{
      dbName: env.DB_NAME,
      family: 4, // Force IPv4
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

  logger.info(
    {
      host: mongoose.connection.host,
      name: mongoose.connection.name
    },
    "Connected to MongoDB",
  );
}

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully');
  } catch (error) {
    logger.error({
      message: "Error disconnecting from MongoDB",
      file: "mongo.ts",
      method: "disconnectDB",
      error, // FULL object logged
    });
    console.error('❌ MongoDB disconnection error:', error);
  }
};


// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔌 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});


// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

