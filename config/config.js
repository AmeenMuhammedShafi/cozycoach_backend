// /config/env.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Immediately destructure from process.env AFTER config
const {
  PORT = 3000,
  MONGO_URL = "mongodb://localhost:27017/app",
  JWT_SECRET = "default_secret",
} = process.env;

// Export frozen constants
export const ENV = {
  PORT,
  MONGO_URL,
  JWT_SECRET,
};

export default ENV;
