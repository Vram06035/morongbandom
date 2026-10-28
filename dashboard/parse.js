// Mailbox parser (browser + node)
(function (g) {
  function parseMailbox(text, source) {
    const out = []; let cur = null; let inFence = false;
    (text || '').replace(/\r\n/g, '\n').split('\n').forEach(line => {
      if (/^\s*```/.test(line)) inFence = !inFence;
      const m = !inFence && line.match(/^##\s*\[([^\]]+)\]\s*(.*)$/);
      if (m) { cur = { id: m[1].trim(), title: m[2].trim(), status: '', body: [], source }; out.push(cur); return; }
      if (!cur) return;
      const s = !inFence && !cur.status && line.match(/^\s*\**Status\**\s*:\s*\**\s*([\w-]+)/i);
      if (s) { cur.status = s[1].toLowerCase(); return; }
      cur.body.push(line);
    });
    out.forEach(e => { e.body = e.body.join('\n').trim(); if (!e.status) e.status = 'open'; });
    return out;
  }
  function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function inline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/^([\wÀ-ỹ /]{2,30}):/u, '<span class="lbl">$1:</span>');
  }
  function md(src) {
    const lines = src.split('\n'); let h = '', list = false, fence = null;
    const close = () => { if (list) { h += '</ul>'; list = false; } };
    for (const l of lines) {
      if (/^\s*```/.test(l)) { if (fence === null) { close(); fence = []; } else { h += '<pre><code>' + esc(fence.join('\n')) + '</code></pre>'; fence = null; } continue; }
      if (fence !== null) { fence.push(l); continue; }
      const li = l.match(/^\s*[-*]\s+(.*)/);
      if (li) { if (!list) { h += '<ul>'; list = true; } h += '<li>' + inline(li[1]) + '</li>'; continue; }
      close();
      const hd = l.match(/^#{3,6}\s+(.*)/);
      if (hd) h += '<h4>' + inline(hd[1]) + '</h4>'; else if (l.trim()) h += '<p>' + inline(l) + '</p>';
    }
    if (fence !== null) h += '<pre><code>' + esc(fence.join('\n')) + '</code></pre>';
    close(); return h;
  }
  function nextId(entries) {
    let max = 0; entries.forEach(e => { const n = parseInt(e.id, 10); if (!isNaN(n) && n > max) max = n; });
    return String(max + 1).padStart(3, '0');
  }
  const api = { parseMailbox, md, nextId, esc };
  if (typeof module !== 'undefined') module.exports = api; else g.Mailbox = api;
})(this);
