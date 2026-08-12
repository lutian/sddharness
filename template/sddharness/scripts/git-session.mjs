#!/usr/bin/env node
/**
 * git-session.mjs — branch mãe + worktree por feature
 *
 *   node sddharness/scripts/git-session.mjs current-branch
 *   node sddharness/scripts/git-session.mjs ensure-parent --jira KEY --title "..."
 *   node sddharness/scripts/git-session.mjs add-worktree --jira KEY --feature feature-01 --title "..."
 *   node sddharness/scripts/git-session.mjs merge-worktree --feature feature-01
 *   node sddharness/scripts/git-session.mjs show-session
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { featureNn, slugify } from "./git-slug.mjs";

const ROOT = process.cwd();
const SESSION_PATH = join(ROOT, ".sddharness", "session.json");

function fail(msg) {
  console.error(`[FAIL]  ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[OK]    ${msg}`);
}

function git(args, opts = {}) {
  const r = spawnSync("git", args, {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || "").trim();
    fail(`git ${args.join(" ")}: ${err || `exit ${r.status}`}`);
  }
  return (r.stdout || "").trim();
}

function gitOk(args, opts = {}) {
  const r = spawnSync("git", args, {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
  });
  return r.status === 0;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[key] = val;
    } else {
      out._.push(a);
    }
  }
  return out;
}

function readSession() {
  if (!existsSync(SESSION_PATH)) {
    return {
      jiraKey: null,
      baseBranch: null,
      parentBranch: null,
      parentTitle: null,
      features: {},
    };
  }
  return JSON.parse(readFileSync(SESSION_PATH, "utf8"));
}

function writeSession(session) {
  mkdirSync(join(ROOT, ".sddharness"), { recursive: true });
  writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2) + "\n");
}

function branchExists(name) {
  return gitOk(["show-ref", "--verify", "--quiet", `refs/heads/${name}`]);
}

function cmdCurrentBranch() {
  if (!gitOk(["rev-parse", "--is-inside-work-tree"])) {
    fail("não é um repositório git");
  }
  const name = git(["branch", "--show-current"]);
  if (!name) fail("HEAD detached — faça checkout de uma branch antes");
  console.log(name);
}

function cmdEnsureParent(args) {
  const jira = args.jira;
  const title = args.title;
  if (!jira || !title) fail("usage: ensure-parent --jira KEY --title \"...\"");

  const base = git(["branch", "--show-current"]);
  if (!base) fail("HEAD detached — faça checkout de uma branch base");

  const slug = slugify(title);
  const parentBranch = `feature/${jira}-${slug}`;

  if (branchExists(parentBranch)) {
    git(["checkout", parentBranch]);
    ok(`branch mãe já existia: ${parentBranch}`);
  } else {
    git(["checkout", "-b", parentBranch]);
    ok(`branch mãe criada: ${parentBranch}`);
  }

  const session = readSession();
  session.jiraKey = jira;
  session.baseBranch = base;
  session.parentBranch = parentBranch;
  session.parentTitle = title;
  session.features = session.features || {};
  writeSession(session);

  console.log(parentBranch);
}

function cmdAddWorktree(args) {
  const jira = args.jira;
  const feature = args.feature;
  const title = args.title;
  if (!jira || !feature || !title) {
    fail('usage: add-worktree --jira KEY --feature feature-01 --title "..."');
  }

  const session = readSession();
  const parentBranch = session.parentBranch;
  if (!parentBranch) fail("rode ensure-parent antes de add-worktree");

  const nn = featureNn(feature);
  const slug = slugify(title);
  const worktreeBranch = `feature/${jira}-${nn}-${slug}`;
  const worktreePath = `.worktrees/${jira}-${nn}-${slug}`;
  const absPath = join(ROOT, worktreePath);

  mkdirSync(join(ROOT, ".worktrees"), { recursive: true });

  if (existsSync(absPath)) {
    ok(`worktree já existe: ${worktreePath}`);
  } else if (branchExists(worktreeBranch)) {
    git(["worktree", "add", worktreePath, worktreeBranch]);
    ok(`worktree anexado à branch existente: ${worktreeBranch}`);
  } else {
    git(["worktree", "add", "-b", worktreeBranch, worktreePath, parentBranch]);
    ok(`worktree criado: ${worktreeBranch} → ${worktreePath}`);
  }

  session.jiraKey = jira;
  session.features = session.features || {};
  session.features[feature] = {
    worktreeBranch,
    worktreePath,
    title,
    merged: false,
  };
  writeSession(session);

  console.log(
    JSON.stringify({ worktreeBranch, worktreePath, parentBranch }, null, 2)
  );
}

function cmdMergeWorktree(args) {
  const feature = args.feature;
  if (!feature) fail("usage: merge-worktree --feature feature-01");

  const session = readSession();
  const parentBranch = session.parentBranch;
  const feat = session.features?.[feature];
  if (!parentBranch) fail("session sem parentBranch");
  if (!feat) fail(`feature ${feature} não está na session`);

  const { worktreeBranch, worktreePath } = feat;
  const absPath = join(ROOT, worktreePath);

  // dirty check no worktree
  if (existsSync(absPath)) {
    const dirty = git(["status", "--porcelain"], { cwd: absPath });
    if (dirty) {
      fail(
        `worktree sujo em ${worktreePath}. Faça commit (ou stash) antes do merge:\n${dirty}`
      );
    }
  }

  git(["checkout", parentBranch]);
  git(["merge", "--no-ff", worktreeBranch, "-m", `merge ${worktreeBranch} into ${parentBranch}`]);
  ok(`merge de ${worktreeBranch} → ${parentBranch}`);

  if (existsSync(absPath)) {
    git(["worktree", "remove", "--force", worktreePath]);
    ok(`worktree removido: ${worktreePath}`);
  }

  // remove branch do worktree se ainda existir e não for a mãe
  if (branchExists(worktreeBranch) && worktreeBranch !== parentBranch) {
    git(["branch", "-d", worktreeBranch]);
    ok(`branch do worktree removida: ${worktreeBranch}`);
  }

  feat.merged = true;
  writeSession(session);
  console.log(JSON.stringify({ parentBranch, worktreeBranch, merged: true }, null, 2));
}

function cmdShowSession() {
  if (!existsSync(SESSION_PATH)) {
    console.log("{}");
    return;
  }
  console.log(readFileSync(SESSION_PATH, "utf8").trimEnd());
}

function usage() {
  console.log(`Usage:
  git-session.mjs current-branch
  git-session.mjs ensure-parent --jira KEY --title "..."
  git-session.mjs add-worktree --jira KEY --feature feature-01 --title "..."
  git-session.mjs merge-worktree --feature feature-01
  git-session.mjs show-session`);
}

const argv = parseArgs(process.argv.slice(2));
const cmd = argv._[0];

switch (cmd) {
  case "current-branch":
    cmdCurrentBranch();
    break;
  case "ensure-parent":
    cmdEnsureParent(argv);
    break;
  case "add-worktree":
    cmdAddWorktree(argv);
    break;
  case "merge-worktree":
    cmdMergeWorktree(argv);
    break;
  case "show-session":
    cmdShowSession();
    break;
  default:
    usage();
    process.exit(cmd ? 1 : 1);
}
