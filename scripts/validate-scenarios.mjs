// scripts/validate-scenarios.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js"; // <-- use the 2020 dialect

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Paths (relative to repo root)
  const schemaPath = resolve(__dirname, "../src/schemas/scenario.schema.json");
  const dataPath   = resolve(__dirname, "../src/data/scenarios.json");

  // Load files
  const [schemaJSON, dataJSON] = await Promise.all([
    readFile(schemaPath, "utf8"),
    readFile(dataPath, "utf8")
  ]);
  const schema = JSON.parse(schemaJSON);
  const data = JSON.parse(dataJSON);

  // Ajv for Draft 2020-12 (ships with the meta-schema preloaded)
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,          // relax if you prefer fewer warnings
    allowUnionTypes: true,  // harmless, future-proofing
  });

  // Compile & validate
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    console.error("❌ scenarios.json failed validation.\n");
    // Pretty-print errors
    for (const err of validate.errors ?? []) {
      const where = err.instancePath || "(root)";
      console.error(`- ${where} ${err.message}`);
      if (err.params) console.error(`  params: ${JSON.stringify(err.params)}`);
    }
    process.exit(1);
  } else {
    console.log("✅ scenarios.json is valid against scenario.schema.json");
  }
}

main().catch((e) => {
  console.error("Validator crashed:", e);
  process.exit(1);
});
