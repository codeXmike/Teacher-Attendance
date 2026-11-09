import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import { Admin } from "../src/models/Admin.js";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = process.env.ENV_FILE
  ? path.resolve(process.env.ENV_FILE)
  : [path.join(apiRoot, ".env"), path.join(apiRoot, "src", ".env")].find(existsSync);
dotenv.config({ path: envPath || path.join(apiRoot, ".env") });

const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "System Administrator" } = process.env;
if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.log("error: MONGODB_URI, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 8 characters must be set in apps/api/.env");
  throw new Error("Set MONGODB_URI, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 8 characters in apps/api/.env");
}

try {
  await mongoose.connect(MONGODB_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await Admin.findOneAndUpdate(
    { email },
    { $set: { name: ADMIN_NAME.trim(), passwordHash } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  console.log(`Administrator ready: ${admin.email}`);
} finally {
  await mongoose.disconnect();
}
