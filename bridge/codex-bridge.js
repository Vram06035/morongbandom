#!/usr/bin/env node
// Codex CLI bridge for agent-mailbox. Node 18+, stdlib only.
// Usage: node bridge/codex-bridge.js [--interval 60] [--once]
// Env: CODEX_CMD (override command; prompt passed in env BRIDGE_PROMPT), BRIDGE_INTERVAL
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TO_CODEX = path.join(ROOT, 'agent-mailbox', 'to-codex.md');
const LOCK = path.join(ROOT, 'bridge', '.bridge.lock');
const IS_WIN = process.platform === 'win32';

function log(...a) { console.log(`[${new Date().toLocaleString()}]`, ...a); }

// Parse '## [ID] Title' entries and their 'Status:' line.
function parseEntries(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let cur = null;
  lines.forEach((line, i) => {
    const h = line.match(/^##\s*\[([^\]]+)\]\s*(.*)$/);
    if (h) { cur = { id: h[1].trim(), title: h[2].trim(), status: null, statusLine: -1, line: i }; out.push(cur); return; }
    if (cur && cur.statusLine < 0) {
      const s = line.match(/^\s*Status:\s*(\S+)/i);
      if (s) { cur.status = s[1].toLowerCase(); cur.statusLine = i; }
    }
  });
  return out;
}

function setStatus(text, id, status) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const e = parseEntries(text).find(x => x.id === id);
  if (!e || e.statusLine < 0) throw new Error(`entry ${id} has no Status line`);
  lines[e.statusLine] = lines[e.statusLine].replace(/Status:\s*\S+/i, `Status: ${status}`);
  return lines.join(nl);
}

function git(args, opt = {}) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0 && !opt.allowFail) throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r;
}

function hasChanges() { return git(['status', '--porcelain']).stdout.trim().length > 0; }

function commitAndPush(msg) {
  git(['add', '-A', 'agent-mailbox']);
  if (git(['diff', '--cached', '--quiet'], { allowFail: true }).status === 0) { log('nothing to commit'); return; }
  git(['commit', '-m', msg]);
  for (let i = 1; i <= 5; i++) {
    if (git(['push'], { allowFail: true }).status === 0) { log('pushed:', msg); return; }
    log(`push rejected, pull --rebase (try ${i})`);
    const r = git(['pull', '--rebase'], { allowFail: true });
    if (r.status !== 0) { git(['rebase', '--abort'], { allowFail: true }); throw new Error('rebase conflict, resolve manually: ' + r.stderr); }
  }
  throw new Error('push failed after retries');
}

function buildPrompt(id) {
  return `Read agent-mailbox/README.md. Then handle task [${id}] in agent-mailbox/to-codex.md. ` +
    `Write your reply into agent-mailbox/from-codex.md following the reply template, with the same ID. ` +
    `Set the Status of the original entry [${id}] in to-codex.md to done or blocked. ` +
    `Do NOT run git commit or git push; the bridge will commit for you.`;
}

function runCodexPrompt(prompt, id) {
  let r;
  if (process.env.CODEX_CMD) {
    r = spawnSync(process.env.CODEX_CMD, { cwd: ROOT, shell: true, stdio: 'inherit', env: { ...process.env, BRIDGE_PROMPT: prompt, BRIDGE_TASK_ID: id } });
  } else {
    // Only fixed arguments pass through cmd.exe; mailbox text goes via stdin.
    r = spawnSync(IS_WIN ? 'codex.cmd' : 'codex', ['exec', '--sandbox', 'workspace-write', '-'], {
      cwd: ROOT, shell: IS_WIN, input: prompt, encoding: 'utf8',
      stdio: ['pipe', 'inherit', 'inherit']
    });
  }
  if (r.error) throw r.error;
  return r.status;
}

function runCodex(id) { return runCodexPrompt(buildPrompt(id), id); }

function acquireLock() {
  try {
    const fd = fs.openSync(LOCK, 'wx'); fs.writeSync(fd, String(process.pid)); fs.closeSync(fd); return true;
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const pid = parseInt(fs.readFileSync(LOCK, 'utf8'), 10);
    try { process.kill(pid, 0); return false; } catch { fs.unlinkSync(LOCK); return acquireLock(); } // stale lock
  }
}
function releaseLock() { try { fs.unlinkSync(LOCK); } catch {} }

function tick() {
  if (hasChanges()) { log('working tree has local changes; commit/stash them first. Skipping.'); return; }
  const p = git(['pull', '--ff-only'], { allowFail: true });
  if (p.status !== 0) { log('git pull --ff-only failed:', p.stderr.trim()); return; }
  const open = parseEntries(fs.readFileSync(TO_CODEX, 'utf8')).filter(e => e.status === 'open');
  if (!open.length) { log('no open tasks'); return; }
  for (const e of open) {
    log(`task [${e.id}] ${e.title}: in-progress`);
    fs.writeFileSync(TO_CODEX, setStatus(fs.readFileSync(TO_CODEX, 'utf8'), e.id, 'in-progress'));
    commitAndPush(`mailbox: codex ${e.id} in-progress`);
    const code = runCodex(e.id);
    log(`codex exited with ${code}`);
    const after = parseEntries(fs.readFileSync(TO_CODEX, 'utf8')).find(x => x.id === e.id);
    if (after && after.status === 'in-progress') {
      log(`codex left [${e.id}] in-progress; marking blocked`);
      fs.writeFileSync(TO_CODEX, setStatus(fs.readFileSync(TO_CODEX, 'utf8'), e.id, 'blocked'));
    }
    commitAndPush(`mailbox: codex ${e.id}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const iIdx = args.indexOf('--interval');
  const interval = Number(iIdx >= 0 ? args[iIdx + 1] : process.env.BRIDGE_INTERVAL || 60);
  const once = args.includes('--once');
  if (!acquireLock()) { console.error('Another bridge is running (bridge/.bridge.lock).'); process.exit(1); }
  const stop = () => { log('stopping'); releaseLock(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop); process.on('exit', releaseLock);
  log(`bridge started in ${ROOT}, interval ${interval}s. Ctrl+C to stop.`);
  let busy = false;
  const loop = () => {
    if (busy) return; busy = true;
    try { tick(); } catch (e) { log('error:', e.message); } finally { busy = false; }
    if (once) stop();
  };
  loop();
  if (!once) setInterval(loop, interval * 1000);
}

module.exports = { parseEntries, setStatus, buildPrompt, runCodexPrompt };
if (require.main === module) main();
