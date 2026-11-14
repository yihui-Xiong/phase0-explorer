/* Phase 0 Findings Explorer — standalone version. Data: window.PHASE0 (snapshot from the coding sheet). */
(function () {
  const RAW = window.PHASE0;
  const BASE = { items: RAW.items, sources: RAW.sources, groupmap: RAW.groupmap, tools: RAW.tools };
  const CALC = {};
  const calc = (name, spec) => { CALC[name] = spec; };
  const GROUPS7 = [['all', null], ['adhd', 'ADHD'], ['autism', 'Autism'], ['audhd', 'AuDHD'], ['dyslexia', 'Dyslexia'], ['dyspraxia', 'Dyspraxia'], ['dyscalculia', 'Dyscalculia']];

  calc('items_g', { inputs: ['items', 'sources', 'groupmap'], fn: (items, sources, groupmap) => {
    const GROUP = Object.fromEntries(groupmap.filter(r => /^r\//.test((r['Community'] || '').trim()) && (r['Group'] || '').trim()).map(r => [r['Community'].trim(), r['Group'].trim()]));
    const comm = new Map(sources.filter(s => s['Source ID']).map(s => [s['Source ID'].trim(), s['Community'].trim()]));
    const thr = new Map(sources.filter(s => s['Source ID']).map(s => { const id = s['Source ID'].trim(), t = s['Post or comment'] || '', m = /^(comment|reply)/i.test(t) && t.match(/S\d+/); return [id, m ? m[0] : id]; }));
    return items.filter(d => d['Item ID']).map(d => { const sid = (d['Source ID'] || '').trim(), c = comm.get(sid) || ''; return { ...d, Community: c, Group: GROUP[c] || 'Other', Thread: thr.get(sid) || sid }; });
  } });
  calc('summary', { inputs: ['items_g', 'sources', 'groupmap'], fn: (items_g, sources, groupmap) => {
    const GROUP = Object.fromEntries(groupmap.map(r => [r['Community'].trim(), r['Group'].trim()]));
    const G = [['all', 'All', null], ['adhd', 'ADHD', 'ADHD'], ['autism', 'Autism', 'Autism'], ['audhd', 'AuDHD', 'AuDHD'], ['dyslexia', 'Dyslexia', 'Dyslexia'], ['dyspraxia', 'Dyspraxia', 'Dyspraxia'], ['dyscalculia', 'Dyscalculia', 'Dyscalculia']];
    const src = sources.filter(s => s['Source ID']);
    return G.map(([grp, label, g]) => {
      const r = items_g.filter(d => !g || d.Group === g);
      const s = src.filter(x => !g || GROUP[(x['Community'] || '').trim()] === g).length;
      const strat = r.filter(d => d['Row type'] === 'Strategy');
      const tool = strat.filter(d => (d['Primary code'] || '').startsWith('Tool:')).length;
      const byTopic = d3.rollups(r.filter(d => d['Topic']), v => v.length, d => d['Topic']).sort((a, b) => b[1] - a[1]);
      return { grp, label, sources: s, items: r.length, strategies: strat.length, frictions: r.filter(d => d['Row type'] === 'Friction').length,
        per_source: s ? Math.round(r.length / s * 100) / 100 : null, tool_share: strat.length ? Math.round(tool / strat.length * 100) + '%' : '—',
        topics: new Set(r.map(d => d['Topic']).filter(Boolean)).size, top_topic: byTopic.length ? byTopic[0][0] : '', top_n: byTopic.length ? byTopic[0][1] : 0 };
    });
  } });
  calc('topic_tree', { inputs: ['items_g'], fn: (items_g) => GROUPS7.flatMap(([grp, g]) =>
    d3.rollups(items_g.filter(d => d['Topic'] && (!g || d.Group === g)), v => v.length, d => d['Topic'], d => d['Subtopic'] || 'Other')
      .flatMap(([topic, subs]) => subs.map(([subtopic, n]) => ({ grp, topic, subtopic, n })))) });
  calc('code_counts', { inputs: ['items_g'], fn: (items_g) => GROUPS7.flatMap(([grp, g]) =>
    d3.rollups(items_g.filter(d => d['Row type'] === 'Strategy' && d['Primary code'] && (!g || d.Group === g)), v => v.length, d => d['Primary code'])
      .map(([code, n]) => ({ grp, code, kind: code.startsWith('Tool:') ? 'Tool' : 'Non-tool', n })).sort((a, b) => b.n - a.n)) });
  calc('friction_located', { inputs: ['items_g'], fn: (items_g) => GROUPS7.flatMap(([grp, g]) =>
    d3.rollups(items_g.filter(d => d['Row type'] === 'Friction' && d['Friction located in'] && (!g || d.Group === g)), v => v.length, d => d['Friction located in'])
      .map(([located, n]) => ({ grp, located, n })).sort((a, b) => b.n - a.n)) });
  calc('tools_by_kind', { inputs: ['tools', 'items_g'], fn: (tools, items_g) => {
    const RX = {"Brick": "brick", "Opal": "opal", "Switchly": "switchly", "ScreenZen": "zen", "Freedom": "freedom", "Built-in screen-time limits": "built-in", "Screen-time stats": "stats", "Notion": "notion", "Sunsama": "sunsama", "Twos + Obsidian": "twos", "ColorNote": "colornote", "Notes app": "notes app", "Habit and streak apps": "habit|streak", "Task manager apps": "task manager", "Phone checklist": "checklist", "Things app": "things app", "TickTick": "ticktick", "ClickUp and Todoist": "clickup", "Markdown work journal": "markdown", "iOS Reminders (Urgent flag)": "ios reminders", "Notebook or journal": "notebook|journal", "Notepad": "notepad", "Wall planner and signs": "planner|signs", "Paper and pencil": "(^|, )paper|pen and paper", "Google Calendar": "google calendar", "Work calendar": "work calendar", "Skylight app": "skylight", "Phone calendar": "phone calendar", "Timers and pomodoro": "pomodoro|focus timer|phone timer|^timer$", "Alarms": "alarm", "Wake-up light": "wake-up light", "Whiteboards": "whiteboard", "Brown or white noise": "brown noise|noise generator|white noise", "Noise-cancelling headphones": "noise-cancelling|bose|sony|^headphones$", "Music": "music", "Sleep podcasts": "podcast|sleep cove", "Insight Timer": "insight timer", "Streaming TV": "streaming tv", "Earplugs": "earplug", "Audiobook": "audiobook", "Home Assistant": "home assistant", "Wall-mounted tablet": "tablet", "AI assistants (Claude, ChatGPT)": "claude|chatgpt|ai assistant|ai agent|ai tool|ai coding", "Scrunchie on keys": "scrunchie", "Baskets": "basket", "Trash cans": "trash", "Standing desk": "standing desk", "Gym bag and book by the bed": "gym bag|^book$", "Cash envelopes": "envelope", "Incense": "incense", "Pillow with ear-cup dip": "pillow", "Trampoline": "trampoline", "ADHD coach": "coach", "Grocery delivery and pickup": "delivery", "Online shopping": "amazon", "Self-checkout": "self-checkout", "Ride apps": "uber", "Search and social media (previewing places)": "tiktok", "Social media": "^social media$", "Email as to-do list": "email", "WhatsApp": "whatsapp", "Live streaming": "live streaming", "Learning resources (Streamlit, Wikipedia)": "streamlit", "Authenticator app": "authenticator", "Google Keep": "google keep", "Own-built apps": "own app", "Dictation": "dictation", "Sticky notes": "sticky note", "Flowcharts": "flowchart", "Digital clock": "digital clock", "Text-to-speech readers": "text-to-speech", "Videos and recorded lectures": "youtube|video read|recorded lecture", "Fragrance-free cleaners": "fragrance-free", "Perfume": "perfume", "Gloves": "glove", "Fidget toy": "fidget", "Calculator": "calculator", "Mouse and keyboard": "mouse and keyboard", "Khan Academy": "khan"};
    let cat = '';
    const list = tools.filter(d => d['Tool']).map(d => { cat = d['Category'] || cat; return { category: cat, tool: d['Tool'] }; });
    return GROUPS7.flatMap(([grp, g]) => {
      const its = items_g.filter(d => !g || d.Group === g);
      return list.map(t => {
        let n;
        if (/^Partner/.test(t.tool)) n = its.filter(d => d['Primary code'] === 'Social').length;
        else { const rx = new RegExp(RX[t.tool] || t.tool.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); n = its.filter(d => rx.test((d['Tools named'] || '').toLowerCase())).length; }
        return { grp, category: t.category, tool: t.tool, n };
      });
    });
  } });
  calc('group_shares', { inputs: ['code_counts', 'topic_tree', 'friction_located', 'summary'], fn: (code_counts, topic_tree, friction_located, summary) => {
    const out = [], tot = Object.fromEntries(summary.map(s => [s.grp, s]));
    ['adhd', 'autism', 'audhd', 'dyslexia', 'dyspraxia', 'dyscalculia'].forEach(grp => {
      const s = tot[grp] || { strategies: 0, items: 0, frictions: 0 };
      code_counts.filter(d => d.grp === grp).forEach(d => out.push({ dim: 'code', cat: d.code, kind: d.kind, grp, n: d.n, d: s.strategies, share: s.strategies ? d.n / s.strategies : 0 }));
      d3.rollups(topic_tree.filter(d => d.grp === grp), v => d3.sum(v, x => x.n), d => d.topic).forEach(([cat, n]) => out.push({ dim: 'topic', cat, grp, n, d: s.items, share: s.items ? n / s.items : 0 }));
      friction_located.filter(d => d.grp === grp).forEach(d => out.push({ dim: 'loc', cat: d.located, grp, n: d.n, d: s.frictions, share: s.frictions ? d.n / s.frictions : 0 }));
    });
    return out;
  } });
  calc('group_spread', { inputs: ['items_g'], fn: (items_g) => GROUPS7.map(([grp, g]) => {
    const r = items_g.filter(d => !g || d.Group === g), th = d3.rollups(r, v => v.length, d => d.Thread).sort((a, b) => b[1] - a[1]);
    const top = th[0] || ['', 0], pct = r.length ? Math.round(top[1] / r.length * 100) : 0;
    return { grp, items: r.length, threads: th.length, top_thread: top[0], top_n: top[1], top_pct: pct, lead: !!g && r.length > 0 && (r.length < 25 || th.length < 5 || pct >= 40) };
  }) });
  const TECH_GROUPS = [['adhd', 'ADHD'], ['autism', 'Autism'], ['audhd', 'AuDHD'], ['dyslexia', 'Dyslexia'], ['dyspraxia', 'Dyspraxia'], ['dyscalculia', 'Dyscalculia'], ['all', null]];
  calc('tech_mix', { inputs: ['items_g'], fn: (items_g) => TECH_GROUPS.flatMap(([grp, g]) => { const s = items_g.filter(d => d['Row type'] === 'Strategy' && (!g || d.Group === g));
    return ['No tech', 'Software', 'Device', 'Physical object'].map(cat => ({ grp, cat, n: s.filter(d => d['Tech type'] === cat).length, d: s.length })); }) });
  calc('adapt_depth', { inputs: ['items_g'], fn: (items_g) => TECH_GROUPS.flatMap(([grp, g]) => { const s = items_g.filter(d => d['Row type'] === 'Strategy' && (!g || d.Group === g));
    const step = d => String(d['Built it themselves']).toUpperCase() === 'TRUE' ? 'Built it themselves' : (d['Primary code'] || '').startsWith('Tool:') ? d['Primary code'] : 'Not via a tool';
    return ['Not via a tool', 'Tool: as designed', 'Tool: selective use', 'Tool: switching', 'Tool: combining', 'Tool: repurposing', 'Built it themselves'].map(cat => ({ grp, cat, n: s.filter(d => step(d) === cat).length, d: s.length })); }) });
  calc('pattern_rates', { inputs: ['items_g'], fn: (items_g) => { const pats = [...new Set(items_g.map(d => d['Pattern']).filter(Boolean))];
    return TECH_GROUPS.filter(([grp]) => grp !== 'all').flatMap(([grp, g]) => { const all = items_g.filter(d => d.Group === g);
      return pats.map(p => { const r = all.filter(d => d['Pattern'] === p), th = new Set(r.map(d => d.Thread)).size;
        return { grp, pattern: p, n: r.length, threads: th, d: all.length, rate: all.length ? r.length / all.length : 0, counted: r.length >= 2 && th >= 2 }; }); }); } });

  // evaluate calcs over a set of base values (memoized per set)
  function evaluator(vals) { const get = n => { if (n in vals) return vals[n]; const spec = CALC[n]; return (vals[n] = spec.fn(...spec.inputs.map(get))); }; return get; }
  const full = evaluator({ ...BASE });
  const dashData = name => ({ status: 'ok', data: full(name) });

  const PAL = ['#2B3A55','#3E6A8A','#5B8DB8','#1F8A8A','#C2456E','#C77D2E','#B8A400','#7A5BA8','#4E9A5B','#8C6D46','#D0663A','#6B7A8F','#9A9A9A'];
  const KIND = { 'Phone blockers':'#3E6A8A','Task and note apps':'#5B8DB8','Paper':'#C77D2E','Time and calendar':'#7A7A7A','Sound and media':'#7A5BA8','Smart home and DIY':'#1F8A8A','Physical objects':'#B8A400','People':'#C2456E','Services and web':'#4E9A5B','Work systems':'#8C6D46' };
  const GCOL = { adhd: '#C77D2E', autism: '#1F8A8A', audhd: '#7A5BA8', dyslexia: '#C2456E', dyspraxia: '#3F6FA0', dyscalculia: '#4E9A5B' }, GLAB = { all: 'All', adhd: 'ADHD', autism: 'Autism', audhd: 'AuDHD', dyslexia: 'Dyslexia', dyspraxia: 'Dyspraxia', dyscalculia: 'Dyscalculia' };
  const GNAME = { all: null, adhd: 'ADHD', autism: 'Autism', audhd: 'AuDHD', dyslexia: 'Dyslexia', dyspraxia: 'Dyspraxia', dyscalculia: 'Dyscalculia' };
  const fmt = d3.format(','), pctf = d3.format('.0%');
  let group = 'all', tab = 'explore', query = '';
  let hideBig = false, chkBy = 'topic', selHold = null, selCell = null, memo = null;
  function bigThreads() { return d3.rollups(full('items_g'), v => v.length, d => d.Thread).filter(([, n]) => n > 15).sort((a, b) => b[1] - a[1]); }
  const threadOf = s => { const id = (s['Source ID'] || '').trim(), t = s['Post or comment'] || '', m = /^(comment|reply)/i.test(t) && t.match(/S\d+/); return m ? m[0] : id; };
  function D(name) {
    if (!hideBig) return dashData(name);
    if (!memo) { const big = new Set(bigThreads().map(d => d[0]));
      memo = evaluator({ ...BASE, items_g: full('items_g').filter(d => !big.has(d.Thread)), sources: BASE.sources.filter(x => !big.has(threadOf(x))) }); }
    return { status: 'ok', data: memo(name) };
  }
  let zoomed = null, zl = 1;

  function tipFor(box) { let t = box.querySelector('.px-tip'); if (!t) { t = document.createElement('div'); t.className = 'px-tip'; box.appendChild(t); } return t; }
  function place(box, t, ev) { const b = box.getBoundingClientRect(); let x = ev.clientX - b.left + 12, y = ev.clientY - b.top + 12;
    const w = t.offsetWidth, h = t.offsetHeight; if (x + w > b.width) x = Math.max(0, b.width - w - 4); if (y + h > b.height) y = Math.max(0, ev.clientY - b.top - h - 12);
    t.style.left = x + 'px'; t.style.top = y + 'px'; t.style.opacity = 1; }

  // labels are never cut: they wrap and shrink instead
  const _m = document.createElement('canvas').getContext('2d');
  const tw = (s, fs, wt) => { _m.font = `${wt || 400} ${fs}px Inter, sans-serif`; return _m.measureText(s).width; };
  const wrapAll = (text, maxW, fs, wt, split) => { const lines = []; let cur = '';
    for (let w of String(text).split(/\s+/).filter(Boolean)) { const c = cur ? cur + ' ' + w : w;
      if (tw(c, fs, wt) <= maxW) { cur = c; continue; }
      if (cur) lines.push(cur);
      if (tw(w, fs, wt) > maxW) { if (!split) return null;
        while (w.length > 1 && tw(w, fs, wt) > maxW) { let k = w.length - 1; while (k > 1 && tw(w.slice(0, k) + '-', fs, wt) > maxW) k--; lines.push(w.slice(0, k) + '-'); w = w.slice(k); } }
      cur = w; }
    if (cur) lines.push(cur); return lines.length ? lines : ['']; };
  const fitBox = (text, w, h, wt, maxFs, extra, lhf) => { lhf = lhf || 1.15; const xn = extra ? 1 : 0;
    const steps = []; for (let fs = maxFs; fs >= 1.5; fs = fs > 10 ? fs - 1 : fs > 4 ? fs - 0.5 : fs - 0.25) steps.push(fs);
    for (const [split, min] of [[false, 6], [true, 6], [false, 1.5], [true, 1.5]])
      for (const fs of steps) { if (fs < min) break; const lines = wrapAll(text, w, fs, wt, split);
        if (lines && (lines.length + xn) * fs * lhf <= h && (!extra || tw(extra, fs * 0.9, 400) <= w)) return { fs, lines, lh: fs * lhf, split }; }
    return { fs: 1.5, lines: wrapAll(text, Math.max(w, 1), 1.5, wt, true), lh: 1.5 * lhf }; };
  const svgOf = box => d3.select(box).append('svg').attr('width', '100%').attr('font-family', 'Inter, sans-serif');

  function panels(box, groups) {
    box.innerHTML = ''; if (!groups.length) return;
    const W = box.clientWidth || 900, gap = 14, cols = Math.max(1, Math.floor((W + gap) / 250));
    const pw = (W - gap * (cols - 1)) / cols, padB = 10;
    groups.forEach(g => { g._hl = wrapAll(g.name, pw - 60, 14, 700, true); g._head = 30 + (g._hl.length - 1) * 17;
      g.items.forEach(d => { d._ll = wrapAll(d.label, pw - 50, 12, 400, true); d._h = 26 + (d._ll.length - 1) * 15; }); });
    const max = d3.max(groups, g => d3.max(g.items, d => d.n)) || 1;
    const svg = svgOf(box);
    const heights = Array(cols).fill(0); const placed = [];
    groups.forEach(g => { const h = g._head + d3.sum(g.items, d => d._h) + padB; const c = heights.indexOf(Math.min(...heights)); placed.push({ g, x: c * (pw + gap), y: heights[c], h }); heights[c] += h + gap; });
    const H = Math.max(...heights) - gap;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    placed.forEach(({ g, x, y, h }) => {
      const p = svg.append('g').attr('transform', `translate(${x},${y})`);
      p.append('rect').attr('width', pw).attr('height', h).attr('rx', 6).attr('fill', g.color).attr('fill-opacity', .10).attr('stroke', g.color).attr('stroke-opacity', .35);
      p.append('rect').attr('width', 5).attr('height', h).attr('rx', 2).attr('fill', g.color);
      const ht = p.append('text').attr('font-size', 14).attr('font-weight', 700).attr('fill', 'currentColor');
      g._hl.forEach((l, i) => ht.append('tspan').attr('x', 14).attr('y', 20 + i * 17).text(l));
      p.append('text').attr('x', pw - 10).attr('y', 20).attr('text-anchor', 'end').attr('font-size', 14).attr('font-weight', 700).attr('fill', g.color).style('font-variant-numeric', 'tabular-nums').text(fmt(g.total));
      let ry = g._head;
      g.items.forEach(d => {
        const lt = p.append('text').attr('font-size', 12).attr('fill', 'currentColor'), bo = (d._ll.length - 1) * 15;
        d._ll.forEach((l, i) => lt.append('tspan').attr('x', 14).attr('y', ry + 12 + i * 15).text(l));
        p.append('text').attr('x', pw - 10).attr('y', ry + 12).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'currentColor').style('font-variant-numeric', 'tabular-nums').text(fmt(d.n));
        p.append('rect').attr('x', 14).attr('y', ry + 16 + bo).attr('height', 5).attr('rx', 2.5).attr('width', Math.max(3, (pw - 28) * d.n / max)).attr('fill', g.color);
        ry += d._h;
      });
    });
  }
  const mine = (st) => st.data.filter(d => d.grp === group);

  function topicColors() { const all = full('topic_tree').filter(d => d.grp === 'all');
    const tot = d3.rollup(all, v => d3.sum(v, d => d.n), d => d.topic); return d3.scaleOrdinal([...tot.keys()].sort((a, b) => tot.get(b) - tot.get(a)), PAL); }
  function topicGroups(rows, color) {
    const tot = d3.rollup(rows, v => d3.sum(v, d => d.n), d => d.topic);
    return [...tot.keys()].sort((a, b) => tot.get(b) - tot.get(a)).map(t => ({ name: t, total: tot.get(t), color: color(t),
      items: rows.filter(d => d.topic === t).map(d => ({ label: d.subtopic, n: d.n })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)) }));
  }

  function drawTopicMap(st, color) {
    const box = document.getElementById('topics-map'); box.innerHTML = '';
    const groups = topicGroups(mine(st), color); if (!groups.length) return;
    const ZF = zoomed === 'topics-map' ? zl : 1, W = 1600 * ZF, H = 900 * ZF;
    const root = d3.hierarchy({ children: groups.map(g => ({ name: g.name, color: g.color, children: g.items.map(i => ({ name: i.label, n: i.n, color: g.color })) })) })
      .sum(d => d.n || 0).sort((a, b) => b.value - a.value);
    d3.treemap().tile(d3.treemapSquarify.ratio(1.15)).size([W, H]).paddingOuter(3).paddingTop(30).paddingInner(3).round(true)(root);
    const svg = svgOf(box).attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('rect.t').data(root.children).join('rect').attr('x', d => d.x0).attr('y', d => d.y0).attr('width', d => d.x1 - d.x0).attr('height', d => d.y1 - d.y0)
      .attr('rx', 6).attr('fill', d => d.data.color).attr('fill-opacity', .16);
    root.children.forEach(d => { const w = d.x1 - d.x0, f = fitBox(`${d.data.name} · ${fmt(d.value)}`, w - 14, 25, 700, 18, 0, 1.05);
      const t = svg.append('text').attr('font-size', f.fs).attr('font-weight', 700).attr('fill', d.data.color), y0 = d.y0 + 3 + (27 - f.lines.length * f.lh) / 2 + f.fs * 0.85;
      f.lines.forEach((l, i) => t.append('tspan').attr('x', d.x0 + 8).attr('y', y0 + i * f.lh).text(l)); });
    const tip = tipFor(box);
    root.leaves().forEach(d => {
      const w = d.x1 - d.x0, h = d.y1 - d.y0, g = svg.append('g');
      g.append('rect').attr('x', d.x0).attr('y', d.y0).attr('width', w).attr('height', h).attr('rx', 4).attr('fill', d.data.color);
      const cnt = `${fmt(d.value)} item${d.value === 1 ? '' : 's'}`, pad = Math.min(6, w * 0.08, h * 0.08);
      const f = fitBox(d.data.name, w - 2 * pad, h - 2 * pad, 600, 20, cnt), tg = g.append('g').attr('transform', `translate(${d.x0 + pad},${d.y0 + pad})`);
      const tx = tg.append('text').attr('font-size', f.fs).attr('font-weight', 600).attr('fill', '#fff');
      f.lines.forEach((l, i) => tx.append('tspan').attr('x', 0).attr('y', f.fs * 0.9 + i * f.lh).text(l));
      tg.append('text').attr('x', 0).attr('y', f.fs * 0.9 + f.lines.length * f.lh).attr('font-size', f.fs * 0.85).attr('fill', '#fff').attr('fill-opacity', .85).text(cnt);
      g.on('mousemove', ev => { tip.textContent = `${d.parent.data.name} › ${d.data.name}: ${cnt}`; place(box, tip, ev); }).on('mouseleave', () => { tip.style.opacity = 0; });
    });
  }

  function drawToolMap(st) {
    const box = document.getElementById('tools-map'); box.innerHTML = '';
    const rows = mine(st).filter(d => d.n > 0); if (!rows.length) return;
    const ZF = zoomed === 'tools-map' ? zl : 1, W = 1600 * ZF, H = 900 * ZF, legH = 60;
    const root = d3.pack().size([W, H - legH]).padding(5)(d3.hierarchy({ children: rows }).sum(d => d.n));
    const svg = svgOf(box).attr('viewBox', `0 0 ${W} ${H}`), tip = tipFor(box);
    root.leaves().forEach(d => {
      const g = svg.append('g').attr('transform', `translate(${d.x},${d.y})`);
      g.append('circle').attr('r', d.r).attr('fill', KIND[d.data.category] || '#888');
      const side = d.r * 1.38, f = fitBox(d.data.tool, side, side, 600, 22, fmt(d.data.n), 1.12);
      const total = (f.lines.length + 1) * f.lh, y0 = -total / 2 + f.fs * 0.85;
      const t = g.append('text').attr('text-anchor', 'middle').attr('font-size', f.fs).attr('font-weight', 600).attr('fill', '#fff');
      f.lines.forEach((l, i) => t.append('tspan').attr('x', 0).attr('y', y0 + i * f.lh).text(l));
      g.append('text').attr('text-anchor', 'middle').attr('y', y0 + f.lines.length * f.lh).attr('font-size', f.fs * 0.95).attr('fill', '#fff').attr('fill-opacity', .85).text(fmt(d.data.n));
      g.on('mousemove', ev => { tip.textContent = `${d.data.tool} (${d.data.category}): ${fmt(d.data.n)} item${d.data.n === 1 ? '' : 's'}`; place(box, tip, ev); }).on('mouseleave', () => { tip.style.opacity = 0; });
    });
    const cats = [...new Set(rows.map(d => d.category))], per = Math.min(cats.length, 5), cw = W / per;
    const lg = svg.append('g').attr('transform', `translate(0,${H - legH + 12})`);
    cats.forEach((c, i) => { const x = (i % per) * cw + 10, y = Math.floor(i / per) * 24;
      lg.append('circle').attr('cx', x + 8).attr('cy', y).attr('r', 8).attr('fill', KIND[c] || '#888');
      lg.append('text').attr('x', x + 22).attr('y', y + 5).attr('font-size', 15).attr('fill', 'currentColor').text(c); });
  }
  function drawToolList(st) {
    const rows = mine(st).filter(d => d.n > 0);
    const groups = [...new Set(rows.map(d => d.category))].map(c => { const it = rows.filter(d => d.category === c); return { name: c, total: d3.sum(it, d => d.n), color: KIND[c] || '#888',
      items: it.map(d => ({ label: d.tool, n: d.n })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)) }; }).sort((a, b) => b.total - a.total);
    panels(document.getElementById('tools-list'), groups);
  }

  let selCode = null, selLoc = null;
  function hbars(box, rows, label, colorFn, sel, onPick) {
    box.innerHTML = ''; if (!rows.length) return;
    const W = box.clientWidth || 500, rowH = 26, H = rows.length * rowH + 8;
    const svg = svgOf(box).attr('viewBox', `0 0 ${W} ${H}`);
    const lw = d3.max(rows, d => tw(label(d), 12, 400)) + 12;
    const x = d3.scaleLinear([0, d3.max(rows, d => d.n) || 1], [0, Math.max(40, W - lw - 40)]);
    const g = svg.selectAll('g').data(rows).join('g').attr('transform', (d, i) => `translate(0,${i * rowH + 4})`).style('cursor', 'pointer').on('click', (e, d) => onPick(label(d)));
    g.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', rowH - 2).attr('fill', 'transparent');
    g.append('text').attr('x', lw - 8).attr('y', 14).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'currentColor').attr('font-weight', d => sel === label(d) ? 700 : 400).text(label);
    g.append('rect').attr('x', lw).attr('y', 3).attr('height', 16).attr('width', d => x(d.n)).attr('rx', 4).attr('fill', colorFn).attr('fill-opacity', d => sel && sel !== label(d) ? .35 : 1);
    g.append('text').attr('x', d => lw + x(d.n) + 6).attr('y', 15).attr('font-size', 12).attr('fill', 'currentColor').style('font-variant-numeric', 'tabular-nums').text(d => fmt(d.n));
  }

  function inGroup(d) { return !GNAME[group] || d.Group === GNAME[group]; }
  function detail(id, st, sel, pred, heading, cols) {
    const box = document.getElementById(id); box.innerHTML = '';
    if (!sel) { const p = document.createElement('div'); p.className = 'px-hint'; p.textContent = 'Click a bar above to see the specific items.'; box.appendChild(p); return; }
    const rows = st.data.filter(d => inGroup(d) && pred(d));
    const top = document.createElement('div'); top.className = 'px-top';
    const h = document.createElement('h3'); h.textContent = `${heading(sel)} · ${GLAB[group]} · ${fmt(rows.length)} item${rows.length === 1 ? '' : 's'}`; top.appendChild(h);
    const bx = document.createElement('div'); bx.className = 'px-btns';
    const fname = id.replace('-detail', '') + '_' + group + '_' + sel.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const b = document.createElement('button'); b.className = 'px-btn'; b.textContent = 'Download list PNG';
    b.addEventListener('click', () => listPng(box.closest('.px-card').querySelector('h2').textContent, h.textContent, rows, cols, fname));
    const b2 = document.createElement('button'); b2.className = 'px-btn'; b2.textContent = 'CSV';
    b2.addEventListener('click', () => saveCsv(rows, cols.map(c => c[0]), fname));
    bx.append(b, b2); top.appendChild(bx); box.appendChild(top);
    const tb = document.createElement('div'); tb.className = 'px-tablebox';
    const t = document.createElement('table'); t.className = 'px-table';
    const hr = document.createElement('tr'); cols.forEach(([, l]) => { const th = document.createElement('th'); th.textContent = l; hr.appendChild(th); });
    const th = document.createElement('thead'); th.appendChild(hr); t.appendChild(th);
    const bd = document.createElement('tbody');
    rows.forEach(r => { const tr = document.createElement('tr'); cols.forEach(([f]) => { const td = document.createElement('td'); td.textContent = r[f] || ''; tr.appendChild(td); }); bd.appendChild(tr); });
    t.appendChild(bd); tb.appendChild(t); box.appendChild(tb);
  }

  const TABLE_COLS = ['Item ID', 'Group', 'Topic', 'Subtopic', 'Row type', 'Paraphrase', 'Primary code'];
  function tableRows(st) { const q = query.trim().toLowerCase(); return st.data.filter(inGroup).filter(r => !q || TABLE_COLS.concat(['Tools named', 'Why it works (paraphrased)', 'Friction trigger']).some(c => (r[c] || '').toLowerCase().includes(q))); }
  function drawTable(st) {
    const body = document.getElementById('items-body'); body.innerHTML = '';
    const rows = tableRows(st);
    rows.forEach(r => { const tr = document.createElement('tr');
      TABLE_COLS.forEach(c => { const td = document.createElement('td'); td.textContent = r[c] || ''; if (c === 'Group' && GCOL[(r[c] || '').toLowerCase()]) { td.style.color = GCOL[r[c].toLowerCase()]; td.style.fontWeight = 600; } tr.appendChild(td); });
      body.appendChild(tr); });
    document.getElementById('items-filter').textContent = `${fmt(rows.length)} items · ${GLAB[group]}${query ? ` · matching “${query}”` : ''}${hideBig ? ' · big threads hidden' : ''}`;
  }

  // ---- downloads ----
  function save(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function saveCsv(rows, cols, name) {
    const esc = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    save(name + '.csv', new Blob(['﻿' + [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')], { type: 'text/csv' }));
  }
  const colors = () => { const cs = getComputedStyle(document.querySelector('.px-card')); return { bg: cs.backgroundColor || '#fff', fg: cs.color || '#222', muted: getComputedStyle(document.querySelector('.note')).color || '#666' }; };
  async function listPng(title, sub, rows, cols, name) {
    const W = 1600, pad = 40, scale = 2, fs = 17, lh = 23, { bg, fg, muted } = colors();
    const weights = cols.map(([f]) => f === 'Item ID' ? 0.09 : f === 'Topic' ? 0.14 : f === 'Paraphrase' ? 0.46 : 0.31);
    const sumW = weights.reduce((a, b) => a + b, 0), inner = W - pad * 2, cw = weights.map(w => w / sumW * inner);
    const m = document.createElement('canvas').getContext('2d'); m.font = `${fs}px Inter, sans-serif`;
    const wrapC = (txt, w) => { const out = []; let cur = ''; String(txt || '').split(/\s+/).forEach(wd => { const c = cur ? cur + ' ' + wd : wd; if (m.measureText(c).width > w - 14 && cur) { out.push(cur); cur = wd; } else cur = c; }); out.push(cur); return out; };
    const laid = rows.map(r => { const cells = cols.map(([f], i) => wrapC(r[f], cw[i])); return { cells, h: Math.max(...cells.map(c => c.length)) * lh + 14 }; });
    const headH = 110, thH = 36, H = headH + thH + laid.reduce((a, r) => a + r.h, 0) + pad + 24;
    const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale;
    const ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = fg; ctx.font = '600 26px Inter, sans-serif'; ctx.fillText(title, pad, pad + 20);
    ctx.fillStyle = muted; ctx.font = '19px Inter, sans-serif'; ctx.fillText(sub, pad, pad + 54);
    let y = headH; ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.fillStyle = fg;
    let x = pad; cols.forEach(([, l], i) => { ctx.fillText(l, x + 6, y + 24); x += cw[i]; });
    y += thH; ctx.strokeStyle = muted; ctx.globalAlpha = .35; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.font = `${fs}px Inter, sans-serif`;
    laid.forEach(r => { let x = pad; r.cells.forEach((lines, i) => { ctx.fillStyle = i === 0 ? muted : fg; lines.forEach((l, j) => ctx.fillText(l, x + 6, y + 22 + j * lh)); x += cw[i]; });
      y += r.h; ctx.globalAlpha = .2; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke(); ctx.globalAlpha = 1; });
    ctx.fillStyle = muted; ctx.font = '14px Inter, sans-serif'; ctx.fillText(credit(), pad, H - 18);
    save(name + '.png', await new Promise(r => c.toBlob(r, 'image/png')));
  }
  const credit = () => `Phase 0 Findings Explorer · data snapshot ${RAW.snapshot}`;
  async function toPng(box, name) {
    const svg = box.querySelector('svg'); if (!svg) return;
    const clone = svg.cloneNode(true), src = svg.querySelectorAll('*'), dst = clone.querySelectorAll('*');
    src.forEach((el, i) => { const cs = getComputedStyle(el), d = dst[i];
      ['fill', 'stroke', 'fill-opacity', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'font-size', 'font-weight', 'font-family', 'opacity'].forEach(p => d.style.setProperty(p, cs.getPropertyValue(p))); });
    const vb = svg.viewBox.baseVal, scale = 2;
    clone.setAttribute('width', vb.width); clone.setAttribute('height', vb.height); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const card = box.closest('.px-card'), title = card.querySelector('h2').textContent + (tab !== 'compare' && tab !== 'tech' ? ' · ' + GLAB[group] + (hideBig ? ' (big threads hidden)' : '') : '');
    const pad = 24 * (vb.width / 1000 > 1.2 ? vb.width / 1000 : 1), head = 40 * (pad / 24), { bg, fg, muted } = colors(), k = pad / 24;
    const leg = card.querySelector('.px-legend'), legItems = leg ? [...leg.querySelectorAll('span')].map(s => ({ c: getComputedStyle(s.querySelector('i')).backgroundColor, t: s.textContent })) : [];
    const legH = legItems.length ? (Math.ceil(legItems.length / 4) * 22 + 12) * k : 0, footH = 22 * k;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas'); c.width = (vb.width + pad * 2) * scale; c.height = (vb.height + pad * 2 + head + legH + footH) * scale;
    const ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = fg; ctx.font = `600 ${18 * k}px Inter, sans-serif`; ctx.fillText(title, pad, pad + 16 * k);
    ctx.drawImage(img, pad, pad + head, vb.width, vb.height);
    const colW = vb.width / 4; ctx.font = `${13 * k}px Inter, sans-serif`;
    legItems.forEach((it, i) => { const x = pad + (i % 4) * colW, y = pad + head + vb.height + 20 * k + Math.floor(i / 4) * 22 * k;
      ctx.fillStyle = it.c; ctx.beginPath(); ctx.arc(x + 5 * k, y - 4 * k, 5 * k, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = fg; ctx.fillText(it.t, x + 16 * k, y); });
    ctx.fillStyle = muted; ctx.font = `${12 * k}px Inter, sans-serif`; ctx.fillText(credit(), pad, pad + head + vb.height + legH + 16 * k);
    save(name + (tab !== 'compare' && tab !== 'tech' ? '_' + group + (hideBig ? '_nobig' : '') : '') + '.png', await new Promise(r => c.toBlob(r, 'image/png')));
  }

  function dumbbell(box, st, dim, order) {
    box.innerHTML = '';
    const rows = st.data.filter(d => d.dim === dim);
    const grps = ['adhd', 'autism', 'audhd', 'dyslexia', 'dyspraxia', 'dyscalculia'].filter(g => rows.some(d => d.grp === g));
    if (!grps.length) return;
    let cats = [...new Set(rows.map(d => d.cat))];
    cats = order ? order.filter(c => cats.includes(c)) : cats.sort((a, b) => d3.max(rows.filter(d => d.cat === b), d => d.share) - d3.max(rows.filter(d => d.cat === a), d => d.share));
    const get = (g, c) => rows.find(d => d.grp === g && d.cat === c) || { n: 0, d: (rows.find(d => d.grp === g) || {}).d || 0, share: 0 };
    const W = box.clientWidth || 800, rowH = 26, top = 6, axisH = 20, H = top + cats.length * rowH + axisH;
    const svg = svgOf(box).attr('viewBox', `0 0 ${W} ${H}`);
    const lw = d3.max(cats, c => tw(c, 12, 400)) + 14;
    const max = Math.max(0.1, d3.max(rows, d => d.share));
    const x = d3.scaleLinear([0, max], [lw, W - 16]).nice();
    x.ticks(5).forEach(t => { svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', top).attr('y2', H - axisH).style('stroke', 'var(--cds-chart-grid)');
      svg.append('text').attr('x', x(t)).attr('y', H - 5).attr('text-anchor', 'middle').attr('font-size', 11).style('fill', 'var(--color-fg-muted)').text(pctf(t)); });
    const tip = tipFor(box);
    cats.forEach((c, i) => { const y = top + i * rowH + rowH / 2, pts = grps.map(g => ({ g, ...get(g, c) })), g = svg.append('g');
      g.append('rect').attr('x', 0).attr('y', y - rowH / 2).attr('width', W).attr('height', rowH).attr('fill', 'transparent');
      g.append('text').attr('x', lw - 10).attr('y', y + 4).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'currentColor').text(c);
      g.append('line').attr('x1', x(d3.min(pts, p => p.share))).attr('x2', x(d3.max(pts, p => p.share))).attr('y1', y).attr('y2', y).style('stroke', 'var(--cds-chart-axis)').attr('stroke-width', 3).attr('stroke-linecap', 'round');
      pts.forEach(p => g.append('circle').attr('cx', x(p.share)).attr('cy', y).attr('r', 6).attr('fill', GCOL[p.g]).style('stroke', 'var(--color-panel)').attr('stroke-width', 1.5));
      g.on('mousemove', ev => { tip.innerHTML = ''; const h = document.createElement('div'); h.style.fontWeight = 600; h.textContent = c; tip.appendChild(h);
        pts.forEach(p => { const l = document.createElement('div'); l.textContent = `${GLAB[p.g]}: ${pctf(p.share)} (${fmt(p.n)} of ${fmt(p.d)})`; tip.appendChild(l); }); place(box, tip, ev); })
       .on('mouseleave', () => { tip.style.opacity = 0; });
    });
  }
  function legend(el) { el.innerHTML = ''; ['adhd', 'autism', 'audhd', 'dyslexia', 'dyspraxia', 'dyscalculia'].forEach(g => { const s = document.createElement('span'), i = document.createElement('i'); i.style.background = GCOL[g]; s.appendChild(i); s.appendChild(document.createTextNode(GLAB[g])); el.appendChild(s); }); }
  function drawSizes(st) {
    const body = document.getElementById('sizes-body'); body.innerHTML = '';
    st.data.filter(d => d.grp !== 'all').concat(st.data.filter(d => d.grp === 'all')).forEach(r => { const tr = document.createElement('tr');
      [['label'], ['sources', 1], ['items', 1], ['strategies', 1], ['frictions', 1], ['per_source', 1], ['tool_share', 1]].forEach(([f, num]) => { const td = document.createElement('td'); if (num) td.className = 'num';
        const v = r[f]; td.textContent = v == null ? '—' : typeof v === 'number' ? (f === 'per_source' ? v.toFixed(2) : fmt(v)) : v;
        if (f === 'label' && GCOL[r.grp]) { td.style.color = GCOL[r.grp]; td.style.fontWeight = 600; } if (r.grp === 'all') td.style.fontWeight = 600; tr.appendChild(td); });
      body.appendChild(tr); });
  }

  // ---- Check trends ----
  const inG = d => !GNAME[group] || d.Group === GNAME[group];
  function drawHold(st) {
    const body = document.getElementById('hold-body'); body.innerHTML = '';
    document.getElementById('hold-key').textContent = chkBy === 'topic' ? 'Topic' : 'Strategy kind';
    const key = chkBy === 'topic' ? 'Topic' : 'Primary code';
    const rows = st.data.filter(d => inG(d) && d[key] && (chkBy === 'topic' || d['Row type'] === 'Strategy'));
    const agg = d3.rollups(rows, v => { const th = d3.rollups(v, w => w.length, d => d.Thread).sort((a, b) => b[1] - a[1]);
      return { n: v.length, threads: th.length, top: th[0][0], topN: th[0][1] }; }, d => d[key]).sort((a, b) => b[1].n - a[1].n);
    const max = d3.max(agg, d => d[1].n) || 1;
    agg.forEach(([k, a]) => {
      const share = a.topN / a.n, v = a.threads < 3 ? ['thin', 'Thin: under 3 threads'] : share >= 0.5 ? ['one', `Mostly ${a.top}`] : ['ok', 'Solid'];
      const tr = document.createElement('tr'); tr.className = 'px-click' + (selHold === k ? ' px-sel' : '');
      const td = (txt, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; if (txt instanceof Node) c.appendChild(txt); else c.textContent = txt; tr.appendChild(c); return c; };
      td(k);
      const ni = td(fmt(a.n), 'num'), bar = document.createElement('div'); bar.className = 'px-minibar'; bar.style.width = (a.n / max * 100) + '%'; bar.style.marginLeft = 'auto'; ni.appendChild(bar);
      td(fmt(a.threads), 'num'); td(`${a.top} · ${pctf(share)}`);
      const sp = document.createElement('span'); sp.className = 'px-verdict px-v-' + v[0]; sp.textContent = v[1]; td(sp);
      tr.addEventListener('click', () => { selHold = selHold === k ? null : k; redraw(); });
      body.appendChild(tr);
    });
    detail('hold-detail', st, selHold, d => d[key] === selHold && (chkBy === 'topic' || d['Row type'] === 'Strategy'), k => k,
      [['Item ID', 'Item'], ['Thread', 'Thread'], ['Row type', 'Type'], ['Paraphrase', 'Paraphrase']]);
    if (!selHold) document.getElementById('hold-detail').firstChild.textContent = 'Click a row above to see the specific items.';
  }
  function drawHeat(st) {
    const box = document.getElementById('heat-chart'); box.innerHTML = '';
    const rows = st.data.filter(d => inG(d) && d['Topic']); if (!rows.length) return;
    const topics = d3.rollups(rows, v => v.length, d => d['Topic']).sort((a, b) => b[1] - a[1]).map(d => d[0]);
    const strat = rows.filter(d => d['Row type'] === 'Strategy' && d['Primary code']);
    const cc = d3.rollups(strat, v => v.length, d => d['Primary code']);
    const codes = cc.filter(d => !d[0].startsWith('Tool:')).sort((a, b) => b[1] - a[1]).map(d => d[0]).concat(cc.filter(d => d[0].startsWith('Tool:')).sort((a, b) => b[1] - a[1]).map(d => d[0]));
    const cols = ['__f', ...codes, '__s'];
    const ZF = zoomed === 'heat-chart' ? zl : 1, W = (box.clientWidth || 900) * ZF;
    const lw = Math.min(170, W * 0.2), gw = 44, cw = Math.max(22, (W - lw - gw - 8) / cols.length);
    const hl = c => c === '__f' ? 'Frictions' : c === '__s' ? 'All strategies' : c, hw = c => c.startsWith('__') ? 700 : 400;
    const fs = cw < 40 ? 9 : 10.5, nfs = cw < 40 ? 10 : 12;
    const head = cols.map(c => wrapAll(hl(c), cw - 2, fs, hw(c), false) || wrapAll(hl(c), cw - 2, fs, hw(c), true));
    const hh = d3.max(head, l => l.length) * (fs + 2) + 8, rh = 24;
    const rl = topics.map(t => wrapAll(t, lw - 10, 12, 400, true)), rhs = rl.map(l => Math.max(rh, l.length * 14 + 8));
    const H = hh + d3.sum(rhs) + 4;
    const svg = svgOf(box).attr('viewBox', `0 0 ${W} ${H}`);
    head.forEach((l, i) => { const x = lw + i * cw + cw / 2, t = svg.append('text').attr('text-anchor', 'middle').attr('font-size', fs).attr('fill', 'currentColor').attr('font-weight', cols[i].startsWith('__') ? 700 : 400);
      l.forEach((ln, j) => t.append('tspan').attr('x', x).attr('y', hh - 6 - (l.length - 1 - j) * (fs + 2)).text(ln)); });
    const cnt = (t, c) => rows.filter(d => d['Topic'] === t && (c === '__f' ? d['Row type'] === 'Friction' : d['Row type'] === 'Strategy' && d['Primary code'] && (c === '__s' || d['Primary code'] === c))).length;
    const maxS = d3.max(topics, t => d3.max(codes, c => cnt(t, c))) || 1, maxF = d3.max(topics, t => cnt(t, '__f')) || 1;
    const tip = tipFor(box); let y = hh;
    topics.forEach((t, r) => { const h = rhs[r];
      if (r % 2 === 0) svg.append('rect').attr('x', 0).attr('y', y).attr('width', W).attr('height', h).attr('fill', 'currentColor').attr('fill-opacity', .03);
      const tl = svg.append('text').attr('font-size', 12).attr('fill', 'currentColor');
      rl[r].forEach((ln, j) => tl.append('tspan').attr('x', 6).attr('y', y + h / 2 - (rl[r].length - 1) * 7 + j * 14 + 4).text(ln));
      const f = cnt(t, '__f'), s = cnt(t, '__s');
      cols.forEach((c, i) => { const n = cnt(t, c), x = lw + i * cw;
        const g = svg.append('g').style('cursor', n ? 'pointer' : 'default');
        const fill = c === '__f' ? '#C2456E' : c === '__s' ? '#2B3A55' : '#3E6A8A', op = c === '__s' ? (n ? .22 : 0) : n ? .15 + .85 * n / (c === '__f' ? maxF : maxS) : 0;
        g.append('rect').attr('x', x + 1).attr('y', y + 1).attr('width', cw - 2).attr('height', h - 2).attr('rx', 3).attr('fill', fill).attr('fill-opacity', op);
        if (n) g.append('text').attr('x', x + cw / 2).attr('y', y + h / 2 + 4).attr('text-anchor', 'middle').attr('font-size', nfs).attr('fill', c !== '__s' && op > .55 ? '#fff' : 'currentColor').text(n);
        if (selCell && selCell.t === t && selCell.c === c) g.append('rect').attr('x', x + 1).attr('y', y + 1).attr('width', cw - 2).attr('height', h - 2).attr('rx', 3).attr('fill', 'none').attr('stroke', 'currentColor').attr('stroke-width', 2);
        g.on('mousemove', ev => { tip.textContent = `${t} · ${hl(c)}: ${n} item${n === 1 ? '' : 's'}`; place(box, tip, ev); }).on('mouseleave', () => { tip.style.opacity = 0; })
         .on('click', () => { if (!n) return; selCell = selCell && selCell.t === t && selCell.c === c ? null : { t, c }; redraw(); });
      });
      if (f > 0 && f >= s) svg.append('text').attr('x', lw + cols.length * cw + 6).attr('y', y + h / 2 + 4).attr('font-size', 11).attr('font-weight', 700).attr('fill', '#C2456E').text('gap');
      y += h; });
    const c = selCell, lab = c ? `${c.t} · ${hl(c.c)}` : null;
    detail('heat-detail', st, lab, d => c && d['Topic'] === c.t && (c.c === '__f' ? d['Row type'] === 'Friction' : d['Row type'] === 'Strategy' && (c.c === '__s' || d['Primary code'] === c.c)), k => k,
      [['Item ID', 'Item'], ['Paraphrase', 'Paraphrase'], ['Primary code', 'Code'], ['Subtopic', 'Subtopic']]);
    if (!c) document.getElementById('heat-detail').firstChild.textContent = 'Click a cell to see the specific items.';
  }
  function drawSat(st) {
    const box = document.getElementById('sat-chart'), txt = document.getElementById('sat-text'); box.innerHTML = ''; txt.textContent = '';
    const num = id => +(String(id).match(/\d+/) || [0])[0];
    const rows = st.data.filter(d => inG(d) && d['Subtopic']).map(d => ({ s: num(d['Source ID']), k: (d['Topic'] || '') + ' › ' + d['Subtopic'] })).sort((a, b) => a.s - b.s);
    if (!rows.length) return;
    const first = new Map(); rows.forEach(r => { if (!first.has(r.k)) first.set(r.k, r.s); });
    const firsts = [...first.values()].sort((a, b) => a - b), maxS = d3.max(rows, r => r.s), total = firsts.length;
    const pts = [{ s: 0, n: 0 }]; firsts.forEach((s, i) => pts.push({ s, n: i + 1 })); pts.push({ s: maxS, n: total });
    const bins = d3.range(0, Math.ceil(maxS / 50)).map(i => ({ a: i * 50 + 1, b: (i + 1) * 50, n: firsts.filter(s => s > i * 50 && s <= (i + 1) * 50).length }));
    const last100 = firsts.filter(s => s > maxS - 100).length, items100 = rows.filter(r => r.s > maxS - 100).length;
    txt.textContent = `${fmt(total)} distinct subtopics so far. The last 100 sources (S${maxS - 99}–S${maxS}) gave ${fmt(items100)} items and added ${fmt(last100)} new subtopics (${pctf(total ? last100 / total : 0)} of all). Subtopic names were set while coding, so some "new" ones may be renamings.`;
    const ZF = zoomed === 'sat-chart' ? zl : 1, W = (box.clientWidth || 900) * ZF, H = 330, m = { l: 40, r: 12, t: 10, b: 30 }, bh = 70;
    const x = d3.scaleLinear([0, maxS], [m.l, W - m.r]), y = d3.scaleLinear([0, total], [H - m.b - bh - 24, m.t]).nice();
    const yb = d3.scaleLinear([0, d3.max(bins, b => b.n) || 1], [0, bh - 18]);
    const svg = svgOf(box).attr('viewBox', `0 0 ${W} ${H}`);
    y.ticks(5).forEach(t => { svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).style('stroke', 'var(--cds-chart-grid)');
      svg.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').attr('font-size', 11).style('fill', 'var(--color-fg-muted)').text(t); });
    svg.append('path').attr('d', d3.line().x(d => x(d.s)).y(d => y(d.n)).curve(d3.curveStepAfter)(pts)).attr('fill', 'none').attr('stroke', '#3E6A8A').attr('stroke-width', 2.5);
    const base = H - m.b;
    bins.forEach(b => { const x0 = x(b.a - 1) + 1, x1 = x(Math.min(b.b, maxS)) - 1;
      svg.append('rect').attr('x', x0).attr('width', Math.max(1, x1 - x0)).attr('y', base - yb(b.n)).attr('height', yb(b.n)).attr('fill', '#C77D2E').attr('fill-opacity', .8);
      if (x1 - x0 > 14) svg.append('text').attr('x', (x0 + x1) / 2).attr('y', base - yb(b.n) - 3).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', 'currentColor').text(b.n); });
    x.ticks(8).forEach(t => svg.append('text').attr('x', x(t)).attr('y', H - 10).attr('text-anchor', 'middle').attr('font-size', 11).style('fill', 'var(--color-fg-muted)').text('S' + t));
    svg.append('text').attr('x', m.l + 4).attr('y', m.t + 12).attr('font-size', 11).style('fill', 'var(--color-fg-muted)').text('Distinct subtopics so far');
    svg.append('text').attr('x', m.l + 4).attr('y', base - bh - 4).attr('font-size', 11).style('fill', 'var(--color-fg-muted)').text('New subtopics per 50 sources');
  }

  // ---- Tech & DIY ----
  const TCOL = { 'No tech': '#9A9A9A', 'Software': '#3E6A8A', 'Device': '#C77D2E', 'Physical object': '#4E9A5B' };
  const DCOL = { 'Not via a tool': '#9A9A9A', 'Tool: as designed': '#A9C4DC', 'Tool: selective use': '#7FA6C9', 'Tool: switching': '#5B8DB8', 'Tool: combining': '#3E6A8A', 'Tool: repurposing': '#2B3A55', 'Built it themselves': '#C2456E' };
  const inkOn = hex => { const c = d3.color(hex); return c && (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) > 150 ? '#1a1a1a' : '#fff'; };
  function keyLegend(el, cols) { el.innerHTML = ''; Object.entries(cols).forEach(([k, c]) => { const s = document.createElement('span'), i = document.createElement('i'); i.style.background = c; s.appendChild(i); s.appendChild(document.createTextNode(k.replace(/^Tool: /, ''))); el.appendChild(s); }); }
  function stacked(box, st, cols) {
    box.innerHTML = '';
    const order = ['adhd', 'autism', 'audhd', 'dyslexia', 'dyspraxia', 'dyscalculia', 'all'], cats = Object.keys(cols);
    const grps = order.filter(g => st.data.some(d => d.grp === g && d.d > 0)); if (!grps.length) return;
    const W = box.clientWidth || 800, rowH = 30, top = 4, H = top + grps.length * rowH + 4;
    const svg = svgOf(box).attr('viewBox', `0 0 ${W} ${H}`);
    const lw = d3.max(grps, g => tw(GLAB[g] + ' (' + fmt((st.data.find(d => d.grp === g) || {}).d || 0) + ')', 12, 600)) + 14;
    const x = d3.scaleLinear([0, 1], [lw, W - 4]), tip = tipFor(box);
    grps.forEach((g, i) => { const y = top + i * rowH, rows = cats.map(c => st.data.find(d => d.grp === g && d.cat === c) || { n: 0, d: 0 }), tot = rows[0].d || 1;
      const lab = svg.append('text').attr('x', lw - 8).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'currentColor');
      lab.append('tspan').attr('font-weight', g === 'all' ? 700 : 600).text(GLAB[g]); lab.append('tspan').style('fill', 'var(--color-fg-muted)').attr('font-weight', 400).text(' (' + fmt(rows[0].d) + ')');
      let acc = 0; const gg = svg.append('g');
      rows.forEach((r, k) => { const w = x(acc + r.n / tot) - x(acc); if (r.n) {
          gg.append('rect').attr('x', x(acc)).attr('y', y + 4).attr('width', Math.max(0, w - 1)).attr('height', rowH - 8).attr('fill', cols[cats[k]]);
          const lbl = pctf(r.n / tot); if (w > tw(lbl, 11, 600) + 6) gg.append('text').attr('x', x(acc) + w / 2).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600).attr('fill', inkOn(cols[cats[k]])).text(lbl); }
        acc += r.n / tot; });
      gg.append('rect').attr('x', 0).attr('y', y).attr('width', W).attr('height', rowH).attr('fill', 'transparent')
        .on('mousemove', ev => { tip.innerHTML = ''; const h = document.createElement('div'); h.style.fontWeight = 600; h.textContent = `${GLAB[g]} · ${fmt(rows[0].d)} strategies`; tip.appendChild(h);
          rows.forEach((r, k) => { if (!r.n) return; const l = document.createElement('div'); l.textContent = `${cats[k]}: ${fmt(r.n)} (${pctf(r.n / tot)})`; tip.appendChild(l); }); place(box, tip, ev); })
        .on('mouseleave', () => { tip.style.opacity = 0; });
    });
  }
  function drawPatterns(st) {
    const box = document.getElementById('pat-chart'); box.innerHTML = '';
    const grps = ['adhd', 'autism', 'audhd', 'dyslexia', 'dyspraxia', 'dyscalculia'];
    const tot = d3.rollup(st.data, v => d3.sum(v, d => d.n), d => d.pattern);
    const pats = [...tot.keys()].filter(p => tot.get(p) > 0).sort((a, b) => tot.get(b) - tot.get(a)); if (!pats.length) return;
    const W = box.clientWidth || 800, narrow = W < 560, lw = Math.min(narrow ? 130 : 240, W * 0.36), cw = (W - lw - 4) / grps.length;
    const hl = grps.map(g => wrapAll(GLAB[g], cw - 4, 11, 600, true)), headH = d3.max(hl, l => l.length) * 13 + 8;
    const rl = pats.map(p => wrapAll(p, lw - 10, 12, 400, true)), rh = rl.map(l => Math.max(28, l.length * 14 + 10));
    const H = headH + d3.sum(rh) + 4, max = d3.max(st.data, d => d.rate) || 1;
    const svg = svgOf(box).attr('viewBox', `0 0 ${W} ${H}`), tip = tipFor(box);
    grps.forEach((g, j) => { const t = svg.append('text').attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600).attr('fill', GCOL[g]);
      hl[j].forEach((l, k) => t.append('tspan').attr('x', lw + j * cw + cw / 2).attr('y', 12 + k * 13).text(l)); });
    let y = headH;
    pats.forEach((p, i) => { const h = rh[i], t = svg.append('text').attr('font-size', 12).attr('fill', 'currentColor');
      rl[i].forEach((l, k) => t.append('tspan').attr('x', lw - 8).attr('text-anchor', 'end').attr('y', y + (h - rl[i].length * 14) / 2 + 11 + k * 14).text(l));
      grps.forEach((g, j) => { const d = st.data.find(r => r.grp === g && r.pattern === p) || { n: 0, d: 0, rate: 0, threads: 0, counted: false };
        const x0 = lw + j * cw, c = svg.append('g');
        c.append('rect').attr('x', x0 + 1).attr('y', y + 1).attr('width', cw - 2).attr('height', h - 2).attr('rx', 3).style('fill', 'var(--cds-chart-grid)').attr('fill-opacity', .35);
        if (d.n) c.append('rect').attr('x', x0 + 1).attr('y', y + 1).attr('width', cw - 2).attr('height', h - 2).attr('rx', 3).attr('fill', GCOL[g])
          .attr('fill-opacity', d.counted ? 0.18 + 0.82 * Math.sqrt(d.rate / max) : 0.12).attr('stroke', d.counted ? 'none' : GCOL[g]).attr('stroke-dasharray', '3 2').attr('stroke-opacity', .6);
        if (d.n) { const strong = d.counted && 0.18 + 0.82 * Math.sqrt(d.rate / max) > 0.55, lbl = d.rate >= 0.005 ? pctf(d.rate) : '<1%';
          c.append('text').attr('x', x0 + cw / 2).attr('y', y + h / 2 + 4).attr('text-anchor', 'middle').attr('font-size', narrow ? 10 : 11).attr('font-weight', d.counted ? 600 : 400)
            .attr('fill', strong ? '#fff' : 'currentColor').attr('fill-opacity', d.counted ? 1 : .6).text(lbl); }
        c.append('rect').attr('x', x0).attr('y', y).attr('width', cw).attr('height', h).attr('fill', 'transparent')
          .on('mousemove', ev => { tip.innerHTML = ''; const a = document.createElement('div'); a.style.fontWeight = 600; a.textContent = `${p} · ${GLAB[g]}`; tip.appendChild(a);
            const b = document.createElement('div'); b.textContent = d.n ? `${fmt(d.n)} of ${fmt(d.d)} items (${pctf(d.rate)}), from ${fmt(d.threads)} thread${d.threads === 1 ? '' : 's'}` : `None of ${fmt(d.d)} items`; tip.appendChild(b);
            if (d.n) { const e = document.createElement('div'); e.textContent = d.counted ? 'Counted (2+ items from 2+ threads)' : 'Not counted yet (needs 2+ items from 2+ threads)'; tip.appendChild(e); } place(box, tip, ev); })
          .on('mouseleave', () => { tip.style.opacity = 0; }); });
      y += h; });
  }
  function drawDiy(st) {
    const body = document.getElementById('diy-body'); body.innerHTML = '';
    const rows = st.data.filter(d => String(d['Built it themselves']).toUpperCase() === 'TRUE');
    if (!rows.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 4; td.className = 'px-hint'; td.textContent = 'Nothing here yet.'; tr.appendChild(td); body.appendChild(tr); return; }
    rows.forEach(d => { const tr = document.createElement('tr');
      [d['Item ID'], d.Group, d['Tech type'], d['Paraphrase']].forEach((v, k) => { const td = document.createElement('td'); td.textContent = v || '';
        if (k === 1 && GCOL[(v || '').toLowerCase()]) { td.style.color = GCOL[v.toLowerCase()]; td.style.fontWeight = 600; } tr.appendChild(td); }); body.appendChild(tr); });
  }

  function redraw() {
    document.querySelectorAll('[data-group]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.group === group)));
    document.querySelectorAll('[id^=comms-]').forEach(el => { el.hidden = el.id !== 'comms-' + group; });
    Object.entries(GNAME).forEach(([k, g]) => { if (!g) return; const el = document.getElementById('comms-' + k);
      el.textContent = BASE.groupmap.filter(r => r.Group === g).map(r => r.Community).join(', '); });
    { const r = D('group_spread').data.find(d => d.grp === group), el = document.getElementById('thin-note');
      el.hidden = !(r && r.lead && tab !== 'compare' && tab !== 'tech');
      if (!el.hidden) el.textContent = `Read as a lead, not a finding: ${fmt(r.items)} items from ${fmt(r.threads)} thread${r.threads === 1 ? '' : 's'}. The biggest, ${r.top_thread}, gives ${fmt(r.top_n)} (${r.top_pct}%).`; }
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    ['explore', 'compare', 'check', 'tech'].forEach(t => { document.getElementById(t).hidden = tab !== t; });
    document.getElementById('groups').hidden = tab === 'compare' || tab === 'tech';
    document.querySelectorAll('[data-big]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.big === 'hide') === hideBig)));
    document.querySelectorAll('[data-by]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.by === chkBy)));
    { const bt = bigThreads(), el = document.getElementById('big-note');
      el.textContent = bt.length ? (hideBig ? 'Hidden: ' : 'Big threads (15+ items): ') + bt.map(([t, n]) => `${t} (${n})`).join(', ') + (hideBig ? '. Every count and chart now leaves them out.' : '') : ''; }

    const sum = D('summary'), take = document.getElementById('takeaway'), s = sum.data.find(d => d.grp === group) || sum.data[0];
    document.querySelectorAll('.px-kpi [data-field]').forEach(el => { const v = s[el.dataset.field]; el.textContent = typeof v === 'number' ? fmt(v) : v; });
    take.textContent = tab === 'compare' ? 'Each condition group side by side, as shares within its own group.'
      : tab === 'tech' ? `How people use tech, how far they change their tools, and which patterns belong to which group${hideBig ? ' · big threads hidden' : ''}.`
      : tab === 'check' ? `Checks on how solid the trends are · ${GLAB[group]}${hideBig ? ' · big threads hidden' : ''}.`
      : s.items ? `${fmt(s.items)} items ${group === 'all' ? 'from Reddit posts and comments' : 'from ' + GLAB[group] + ' communities'}, across ${fmt(s.topics)} topics. ${s.top_topic} comes up most (${fmt(s.top_n)} items).`
      : `No ${GLAB[group]} items yet.`;
    document.getElementById('group-empty').hidden = s.items > 0;

    if (tab === 'explore') {
      const items = D('items_g'), tt = D('topic_tree'), tk = D('tools_by_kind'), color = topicColors();
      drawTopicMap(tt, color); panels(document.getElementById('topics-list'), topicGroups(mine(tt), color));
      drawToolMap(tk); drawToolList(tk);
      hbars(document.getElementById('codes-chart'), mine(D('code_counts')), d => d.code, d => d.kind === 'Tool' ? '#3E6A8A' : '#9A9A9A', selCode, k => { selCode = selCode === k ? null : k; redraw(); });
      detail('codes-detail', items, selCode, d => d['Row type'] === 'Strategy' && d['Primary code'] === selCode, k => k,
        [['Item ID', 'Item'], ['Paraphrase', 'Strategy'], ['Why it works (paraphrased)', 'Why it works'], ['Topic', 'Topic']]);
      hbars(document.getElementById('attr-chart'), mine(D('friction_located')), d => d.located, d => d.located === 'Person' ? '#C2456E' : d.located === 'Tool' ? '#3E6A8A' : '#9A9A9A', selLoc, k => { selLoc = selLoc === k ? null : k; redraw(); });
      detail('attr-detail', items, selLoc, d => d['Row type'] === 'Friction' && d['Friction located in'] === selLoc, k => `Friction located in: ${k}`,
        [['Item ID', 'Item'], ['Paraphrase', 'Friction'], ['Friction trigger', 'Trigger'], ['Topic', 'Topic']]);
      drawTable(items);
    } else if (tab === 'check') {
      const items = D('items_g'); drawHold(items); drawHeat(items); drawSat(items);
    } else if (tab === 'tech') {
      stacked(document.getElementById('mix-chart'), D('tech_mix'), TCOL); keyLegend(document.getElementById('mix-legend'), TCOL);
      stacked(document.getElementById('depth-chart'), D('adapt_depth'), DCOL); keyLegend(document.getElementById('depth-legend'), DCOL);
      drawPatterns(D('pattern_rates')); drawDiy(D('items_g'));
    } else {
      drawSizes(sum);
      const gs = D('group_shares');
      dumbbell(document.getElementById('cmp-codes-chart'), gs, 'code');
      dumbbell(document.getElementById('cmp-topics-chart'), gs, 'topic');
      dumbbell(document.getElementById('cmp-loc-chart'), gs, 'loc', ['Person', 'Tool', 'Environment', 'Mixed']);
      ['cmp-legend-1', 'cmp-legend-2', 'cmp-legend-3'].forEach(id => legend(document.getElementById(id)));
    }
  }

  // expand any chart to the full window, with zoom
  const zbar = document.getElementById('zbar'), zlvl = document.getElementById('zlvl');
  function setZoom(id) {
    document.querySelectorAll('.px-zoomed').forEach(e => { e.classList.remove('px-zoomed'); e.style.removeProperty('--z'); });
    zoomed = id; zl = (id === 'topics-map' || id === 'tools-map') ? 2 : 1; zlvl.textContent = Math.round(zl * 100) + '%';
    if (id) { const el = document.getElementById(id); el.classList.add('px-zoomed'); el.style.setProperty('--z', zl); el.scrollTop = 0; el.scrollLeft = 0; }
    zbar.hidden = !id; redraw();
  }
  function zoomBy(f) { if (!zoomed) return; zl = Math.min(5, Math.max(1, Math.round(zl * f * 100) / 100));
    document.getElementById(zoomed).style.setProperty('--z', zl); zlvl.textContent = Math.round(zl * 100) + '%'; redraw(); }
  zbar.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => { const z = b.dataset.z; if (z === 'x') setZoom(null); else zoomBy(z === '+' ? 1.25 : 0.8); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && zoomed) setZoom(null); });
  document.querySelectorAll('.px-dl').forEach(b => { const e = document.createElement('button'); e.type = 'button'; e.className = 'px-btn'; e.textContent = 'Expand';
    e.addEventListener('click', () => setZoom(b.dataset.target)); b.parentNode.insertBefore(e, b);
    b.addEventListener('click', () => toPng(document.getElementById(b.dataset.target), b.dataset.name)); });

  document.querySelectorAll('[data-big]').forEach(b => b.addEventListener('click', () => { hideBig = b.dataset.big === 'hide'; memo = null; selCode = selLoc = selHold = selCell = null; redraw(); }));
  document.querySelectorAll('[data-by]').forEach(b => b.addEventListener('click', () => { chkBy = b.dataset.by; selHold = null; redraw(); }));
  document.querySelectorAll('[data-group]').forEach(b => b.addEventListener('click', () => { group = b.dataset.group; selCode = selLoc = selHold = selCell = null; redraw(); }));
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { if (zoomed) setZoom(null); tab = b.dataset.tab; history.replaceState(null, '', '#' + tab); redraw(); }));
  let qt; document.getElementById('items-search').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { query = e.target.value; drawTable(D('items_g')); }, 150); });
  document.getElementById('items-csv').addEventListener('click', () => saveCsv(tableRows(D('items_g')), ['Item ID', 'Source ID', 'Group', 'Community', 'Thread', 'Row type', 'Topic', 'Subtopic', 'Paraphrase', 'Primary code', 'Secondary code(s)', 'Friction trigger', 'Why it works (paraphrased)', 'Tools named', 'Friction located in', 'Pattern', 'Tech type', 'Built it themselves'], 'phase0_items_' + group + (hideBig ? '_nobig' : '')));
  if (['compare', 'check', 'tech'].includes(location.hash.slice(1))) tab = location.hash.slice(1);
  document.getElementById('snapshot').textContent = `Data snapshot ${RAW.snapshot} · ${fmt(RAW.items.length)} items from ${fmt(RAW.sources.length)} sources`;
  let rw, lastW = window.innerWidth; window.addEventListener('resize', () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(rw); rw = setTimeout(redraw, 150); });
  redraw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();
