import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDatabase = async () => {
  try {
    if (!env.mongodbUri) {
      throw new Error("MONGODB_URI is missing. Set it in apps/api/.env, apps/api/src/.env, or the process environment.");
    }
    await mongoose.connect(env.mongodbUri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

