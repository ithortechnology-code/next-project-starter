import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const path = new URL("./auth-recipe-manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(path, "utf8"));
for (const file of Object.keys(manifest.files)) {
  const content = await readFile(new URL(`../${file}`, import.meta.url));
  manifest.files[file] = createHash("sha256").update(content).digest("hex");
}
await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
console.log("Recipe input fingerprints refreshed; run recipe tests before committing.");
