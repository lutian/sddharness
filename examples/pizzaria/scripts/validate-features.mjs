#!/usr/bin/env node
// validate-features.mjs — Valida feature_list.json e a presença de specs.
//
// Equivalente Node do validador Python que rodava antes em init.sh §3.
// Regras (sem mudança de comportamento):
//   - Estados válidos: pending, spec_ready, in_progress, done, blocked.
//   - No máximo uma feature em in_progress.
//   - Toda feature com sdd:true em estado spec_ready/in_progress/done deve
//     ter specs/<name>/{requirements,design,tasks}.md.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const VALID_STATUSES = new Set(["pending", "spec_ready", "in_progress", "done", "blocked"]);
const REQUIRES_SPEC = new Set(["spec_ready", "in_progress", "done"]);
const SPEC_FILES = ["requirements.md", "design.md", "tasks.md"];

function fail(message) {
  console.log(`[FAIL]  ${message}`);
  process.exitCode = 1;
}

let data;
try {
  data = JSON.parse(readFileSync("feature_list.json", "utf8"));
} catch (err) {
  fail(`feature_list.json inválido: ${err.message}`);
  process.exit(1);
}

const features = data.features ?? [];
const inProgress = features.filter((f) => f.status === "in_progress");
if (inProgress.length > 1) {
  fail(`Há ${inProgress.length} features em in_progress (máximo 1)`);
  process.exit(1);
}

let specErrors = [];
for (const feature of features) {
  if (!VALID_STATUSES.has(feature.status)) {
    fail(`Estado inválido na feature ${feature.id}: ${feature.status}`);
    process.exit(1);
  }
  if (feature.sdd && REQUIRES_SPEC.has(feature.status)) {
    const specDir = join("specs", feature.name);
    for (const fname of SPEC_FILES) {
      if (!existsSync(join(specDir, fname))) {
        specErrors.push(
          `feature ${feature.id} (${feature.name}) em ${feature.status} sem ${specDir}/${fname}`
        );
      }
    }
  }
}

if (specErrors.length > 0) {
  for (const e of specErrors) fail(e);
  process.exit(1);
}

console.log(`[OK]    feature_list.json válido (${features.length} features)`);
console.log("[OK]    Specs presentes para features sdd com estado não-pending");
