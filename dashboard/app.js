const REPO = 'Vram06035/morongbandom', BR = 'main', DIR = 'agent-mailbox';
const FILES = { 'to-codex.md': ['bb', 'Bb', 'Codex'], 'from-codex.md': ['cx', 'Codex', 'Bb'], 'to-bb.md': ['cx', 'Codex', 'Bb'], 'from-bb.md': ['bb', 'Bb', 'Codex'] };
const ORDER = ['to-codex.md', 'from-codex.md', 'to-bb.md', 'from-bb.md'];
const ST = { open: 'Mở', 'in-progress': 'Đang làm', done: 'Xong', blocked: 'Bị chặn' };
const $ = s => document.querySelector(s);
let data = {}, times = {}, sel = location.hash.slice(1) || null, filter = 'all';
const tok = () => localStorage.getItem('mb_token') || '';

async function load() {
  $('#refresh').classList.add('spin');
  try {
    await Promise.all(ORDER.map(async f => {
      const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${BR}/${DIR}/${f}?t=${Date.now()}`, { cache: 'no-store' });
      data[f] = r.ok ? Mailbox.parseMailbox(await r.text(), f) : [];
    }));
    loadTimes();
    render(); $('#upd').textContent = 'Cập nhật ' + new Date().toLocaleTimeString('vi-VN');
  } catch (e) { $('#upd').textContent = 'Lỗi tải: ' + e.message; }
  $('#refresh').classList.remove('spin');
}
async function loadTimes() { // last commit time per file (rate-limited API, best effort)
  if (times._at && Date.now() - times._at < 120000) return;
  times._at = Date.now();
  const h = tok() ? { Authorization: 'Bearer ' + tok() } : {};
  await Promise.all(ORDER.map(async f => {
    try { const r = await fetch(`https://api.github.com/repos/${REPO}/commits?path=${DIR}/${f}&per_page=1&sha=${BR}`, { headers: h });
      const j = await r.json(); if (j[0]) times[f] = new Date(j[0].commit.committer.date); } catch (e) {}
  }));
  render();
}
function tasks() {
  const m = new Map();
  ORDER.forEach(f => data[f]?.forEach(e => {
    const k = (f.includes('bb') ? 'B-' : 'C-') + e.id;
    if (!m.has(k)) m.set(k, { key: k, id: e.id, title: e.title, msgs: [], status: e.status, lane: f.includes('bb') ? 'Codex → Bb' : 'Bb → Codex' });
    const t = m.get(k); t.msgs.push(e); if (f.startsWith('from')) t.status = e.status; else if (!t.msgs.some(x => x.source.startsWith('from'))) t.status = e.status;
  }));
  return [...m.values()].sort((a, b) => b.id.localeCompare(a.id));
}
const badge = s => `<span class="badge s-${s}">${ST[s] || s}</span>`;
function render() {
  const all = tasks(); $('#count').textContent = all.length;
  if (!sel && all[0]) sel = all[0].key;
  $('#tasks').innerHTML = all.filter(t => filter === 'all' || t.status === filter).map(t =>
    `<li class="${t.key === sel ? 'sel' : ''}" data-k="${t.key}"><div><b>[${Mailbox.esc(t.id)}]</b> ${Mailbox.esc(t.title)}</div><small>${t.lane} · ${t.msgs.length} tin</small>${badge(t.status)}</li>`).join('') || '<li class="none">Không có việc</li>';
  const t = all.find(x => x.key === sel);
  if (!t) { $('#thread').innerHTML = '<div class="empty">Chưa có việc nào. Tạo việc mới bên dưới.</div>'; return; }
  $('#ttitle').innerHTML = `[${Mailbox.esc(t.id)}] ${Mailbox.esc(t.title)} ${badge(t.status)}`;
  $('#tsub').textContent = t.lane;
  $('#thread').innerHTML = t.msgs.map(e => {
    const [cls, who, to] = FILES[e.source], tm = times[e.source];
    return `<div class="msg ${cls}"><span class="av ${cls}">${cls === 'bb' ? 'Bb' : 'Cx'}</span><div class="bub">
      <div class="meta"><b>${who}</b> → ${to} ${badge(e.status)} <span class="file">${e.source}</span>${tm ? `<time title="Commit gần nhất của file">${tm.toLocaleString('vi-VN')}</time>` : ''}</div>
      <div class="body">${Mailbox.md(e.body) || '<i>(trống)</i>'}</div></div></div>`;
  }).join('') + (t.msgs.some(x => x.source.startsWith('from')) ? '' : '<div class="typing">Đang chờ phản hồi…</div>');
}
function gate() {
  const ok = !!tok();
  ['#ctitle', '#cbody', '#send', '#target'].forEach(s => $(s).disabled = !ok);
  $('#hint').innerHTML = ok ? 'Việc mới sẽ được thêm vào <code>to-codex.md</code> với Status: open' : '🔒 Nhập GitHub token trong ⚙ Cài đặt để gửi việc.';
}
const b64e = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
async function send(ev) {
  ev.preventDefault(); const f = $('#target').value, url = `https://api.github.com/repos/${REPO}/contents/${DIR}/${f}`;
  const h = { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json' };
  $('#send').disabled = true; $('#send').textContent = 'Đang gửi…';
  try {
    const cur = await (await fetch(url + '?ref=' + BR, { headers: h, cache: 'no-store' })).json();
    if (!cur.content) throw new Error(cur.message || 'không đọc được file');
    const text = b64d(cur.content), id = Mailbox.nextId(Mailbox.parseMailbox(text, f));
    const who = localStorage.getItem('mb_sender') || 'Bb';
    const entry = `\n## [${id}] ${$('#ctitle').value.trim()}\nStatus: open\nNgười gửi: ${who}\nViệc: ${$('#cbody').value.trim()}\n`;
    const r = await fetch(url, { method: 'PUT', headers: h, body: JSON.stringify({ message: `mailbox: ${who.toLowerCase()} ${id}`, content: b64e(text.replace(/\s*$/, '\n') + entry), sha: cur.sha, branch: BR }) });
    if (!r.ok) throw new Error((await r.json()).message);
    $('#ctitle').value = $('#cbody').value = ''; sel = 'C-' + id; location.hash = sel; times._at = 0;
    setTimeout(load, 1500);
  } catch (e) { alert('Gửi thất bại: ' + e.message); }
  $('#send').textContent = 'Gửi ➤'; gate();
}
$('#tasks').onclick = e => { const li = e.target.closest('li[data-k]'); if (li) { sel = li.dataset.k; location.hash = sel; render(); } };
document.querySelector('.filters').onclick = e => { if (!e.target.dataset.f) return; filter = e.target.dataset.f;
  document.querySelectorAll('.filters button').forEach(b => b.classList.toggle('act', b === e.target)); render(); };
$('#refresh').onclick = () => { times._at = 0; load(); };
$('#gear').onclick = () => { $('#token').value = tok(); $('#sender').value = localStorage.getItem('mb_sender') || 'Bb'; $('#settings').showModal(); };
$('#settings').onclose = () => { const v = $('#settings').returnValue;
  if (v === 'clear') localStorage.removeItem('mb_token'); else if (v === 'ok') { const t = $('#token').value.trim(); t ? localStorage.setItem('mb_token', t) : localStorage.removeItem('mb_token'); localStorage.setItem('mb_sender', $('#sender').value); }
  gate(); };
$('#compose').onsubmit = send;
gate(); load(); setInterval(load, 30000);
