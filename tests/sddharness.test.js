import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, it, after } from "node:test";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(KIT, "bin", "sddharness");
const SCHEMA = join(KIT, "schema", "feature_list.schema.json");
const MARKER = "## TODO — preencha após instalar o arnês";

describe("sddharness schema", () => {
  it("schema file exists and is valid JSON", () => {
    const raw = readFileSync(SCHEMA, "utf8");
    const schema = JSON.parse(raw);
    assert.equal(schema.title, "sddharness feature_list");
    assert.ok(schema.properties.features);
  });

  it("accepts feature-01 naming pattern in schema", () => {
    const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
    const pattern = schema.properties.features.items.properties.name.pattern;
    assert.equal(pattern, "^feature-[0-9]{2,}$");
    assert.ok(new RegExp(pattern).test("feature-01"));
    assert.ok(!new RegExp(pattern).test("feature-1"));
  });
});

describe("sddharness CLI init (install skeleton)", () => {
  const dest = mkdtempSync(join(tmpdir(), "sddharness-"));

  after(() => {
    rmSync(dest, { recursive: true, force: true });
  });

  it("copies skeleton without error", () => {
    const r = spawnSync(process.execPath, [CLI, "init", dest], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.ok(existsSync(join(dest, "AGENTS.md")));
    assert.ok(existsSync(join(dest, ".sddharness", "config.json")));
    assert.ok(existsSync(join(dest, ".cursor", "commands", "sddharness.md")));
    assert.ok(existsSync(join(dest, ".claude", "agents", "docs_filler.md")));
    assert.ok(existsSync(join(dest, ".cursor", "agents", "docs_filler.md")));
    assert.ok(existsSync(join(dest, "scripts", "docs-ready.mjs")));
    assert.ok(existsSync(join(dest, "scripts", "validate-features.mjs")));
  });

  it("docs still have TODO marker after install", () => {
    for (const f of ["architecture.md", "conventions.md", "verification.md"]) {
      const text = readFileSync(join(dest, "docs", f), "utf8");
      assert.ok(text.includes(MARKER), f);
    }
  });

  it("docs-ready.mjs exits 1 on stubs", () => {
    const r = spawnSync(
      process.execPath,
      [join(dest, "scripts", "docs-ready.mjs")],
      { cwd: dest, encoding: "utf8" }
    );
    assert.notEqual(r.status, 0);
  });

  it("slash command documents init, filldocs, write-spec — not execute", () => {
    const cmd = readFileSync(
      join(dest, ".cursor", "commands", "sddharness.md"),
      "utf8"
    );
    assert.match(cmd, /filldocs/);
    assert.match(cmd, /\/sddharness init/);
    assert.match(cmd, /write-spec/);
    assert.doesNotMatch(cmd, /\/sddharness execute/);
  });

  it("config includes docs_filler", () => {
    const cfg = JSON.parse(
      readFileSync(join(dest, ".sddharness", "config.json"), "utf8")
    );
    assert.ok(cfg.agents.docs_filler);
  });

  it("does not overwrite existing AGENTS.md on second init", () => {
    const marker = "# CUSTOM AGENTS\n";
    writeFileSync(join(dest, "AGENTS.md"), marker);
    const r = spawnSync(process.execPath, [CLI, "init", dest], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.equal(readFileSync(join(dest, "AGENTS.md"), "utf8"), marker);
  });

  it("validate passes on empty feature list", () => {
    const r = spawnSync(process.execPath, [CLI, "validate", dest], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });
});

describe("docs-ready.mjs", () => {
  it("exits 0 when TODO markers removed", () => {
    const dir = mkdtempSync(join(tmpdir(), "docs-ready-"));
    try {
      mkdirSync(join(dir, "docs"), { recursive: true });
      mkdirSync(join(dir, "scripts"), { recursive: true });
      cpSync(
        join(KIT, "template", "scripts", "docs-ready.mjs"),
        join(dir, "scripts", "docs-ready.mjs")
      );
      for (const f of ["architecture.md", "conventions.md", "verification.md"]) {
        writeFileSync(join(dir, "docs", f), `# ${f}\n\nConteúdo real sem stub.\n`);
      }
      const r = spawnSync(
        process.execPath,
        [join(dir, "scripts", "docs-ready.mjs")],
        { cwd: dir, encoding: "utf8" }
      );
      assert.equal(r.status, 0, r.stdout + r.stderr);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validate-features name rule", () => {
  it("rejects feature-1 (no zero-pad)", () => {
    const dir = mkdtempSync(join(tmpdir(), "harness-bad-"));
    try {
      mkdirSync(join(dir, "scripts"), { recursive: true });
      mkdirSync(join(dir, "specs"), { recursive: true });
      const validator = readFileSync(
        join(KIT, "template", "scripts", "validate-features.mjs"),
        "utf8"
      );
      writeFileSync(join(dir, "scripts", "validate-features.mjs"), validator);
      writeFileSync(
        join(dir, "feature_list.json"),
        JSON.stringify({
          project: "t",
          rules: { valid_status: ["pending"] },
          features: [
            {
              id: 1,
              name: "feature-1",
              title: "x",
              description: "y",
              acceptance: [],
              sdd: true,
              status: "pending",
            },
          ],
        })
      );
      const r = spawnSync(
        process.execPath,
        [join(dir, "scripts", "validate-features.mjs")],
        { cwd: dir, encoding: "utf8" }
      );
      assert.notEqual(r.status, 0);
      assert.match(r.stdout + r.stderr, /feature-01/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
