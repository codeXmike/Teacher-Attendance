import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiEnvPath = path.resolve(__dirname, "../../.env");
const sourceEnvPath = path.resolve(__dirname, "../.env");
const envPath = process.env.ENV_FILE
  ? path.resolve(process.env.ENV_FILE)
  : [apiEnvPath, sourceEnvPath].find((candidate) => existsSync(candidate));

// dotenv.config is synchronous, so all exported settings below are available
// before server.js begins connecting to MongoDB.
if (envPath) dotenv.config({ path: envPath });

export const env = {
  port: Number(process.env.PORT || 4000),
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || "https://teacher-attend.xystems.tech",
  clientUrls: (process.env.CLIENT_URLS || process.env.CLIENT_URL || "https://teacher-attend.xystems.tech")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  sessionTokenTtlSeconds: Number(process.env.SESSION_TOKEN_TTL_SECONDS || 90),
  sessionRotationSeconds: Number(process.env.SESSION_ROTATION_SECONDS || 75),
  defaultAttendanceRadiusMeters: Number(process.env.DEFAULT_ATTENDANCE_RADIUS_METERS || 100)
};
