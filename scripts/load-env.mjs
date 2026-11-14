import { resolve, dirname } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(resolve(repositoryRoot, ".env"));
