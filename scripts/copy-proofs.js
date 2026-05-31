const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../outputs/sp1/proof.bin");
const vkey = path.resolve(__dirname, "../outputs/sp1/vkey.bin");
const publicValues = path.resolve(
  __dirname,
  "../outputs/sp1/public_values.bin",
);

const scenariosDir = path.resolve(__dirname, "../app/public/scenarios");
const targetScenario = path.join(scenariosDir, "flash-crash");

function copyFileIfExists(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) {
    console.warn(`Source not found: ${srcPath}`);
    return false;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${srcPath} -> ${destPath}`);
  return true;
}

if (!fs.existsSync(targetScenario)) {
  console.warn("Target scenario directory not found:", targetScenario);
  process.exit(1);
}

const didCopyProof = copyFileIfExists(
  src,
  path.join(targetScenario, "proof.bin"),
);
const didCopyVkey = copyFileIfExists(
  vkey,
  path.join(targetScenario, "vkey.bin"),
);
const didCopyPublic = copyFileIfExists(
  publicValues,
  path.join(targetScenario, "public_values.bin"),
);

if (!didCopyProof) {
  console.warn("No proof copied. Run the prover first: ./scripts/5-prove.sh");
}

if (!didCopyVkey) {
  console.warn("No vkey copied.");
}

if (!didCopyPublic) {
  console.warn("No public_values.bin copied.");
}

console.log("Done.");
