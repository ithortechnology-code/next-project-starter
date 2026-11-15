import { resolve, dirname } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  loadEnvFile(resolve(repositoryRoot, ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
