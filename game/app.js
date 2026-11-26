(() => {
'use strict';

/* ───────────────────────── data & constants ───────────────────────── */

const DATA = window.EXAM_DATA;
const app = document.getElementById('app');
const KEY = 'examquest.v1';
const BOSS = '__boss';

const MODES = [
	{ id: 'order', name: 'Order', glyph: '⇅', mult: 1, blurb: 'Pick the lines in the right order' },
	{ id: 'gaps', name: 'Gaps', glyph: '▢', mult: 1.5, ratio: 0.35, blurb: 'Fill in the missing tokens' },
	{ id: 'gaps2', name: 'Gaps+', glyph: '▣', mult: 2, ratio: 0.7, blurb: 'Most of the code is missing' },
	{ id: 'recall', name: 'Recall', glyph: '⌨', mult: 3, blurb: 'Type it all from memory' },
];
const MODE = Object.fromEntries(MODES.map((m) => [m.id, m]));
const TITLES = ['Pisciner', 'Novice', 'Cadet', 'Coder', 'Hacker', 'Segfault Slayer', 'Pointer Whisperer', 'Backtracker', 'Kernel Sage', 'Exam Legend'];

const EXS = {};

/* ───────────────────────── persistence ───────────────────────── */

const fresh = () => ({ xp: 0, cells: {}, srs: {}, streak: { last: null, count: 0 }, mute: false, noLogic: false });
let S = fresh();
try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private mode */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
const levelOf = (xp) => Math.floor(Math.sqrt(xp / 400)) + 1;
const xpFor = (lvl) => (lvl - 1) * (lvl - 1) * 400;
const cellKey = (ex, chunk, mode) => `${ex}/${chunk}/${mode}`;
const stars = (ex, chunk, mode) => (S.cells[cellKey(ex, chunk, mode)] || {}).stars || 0;
const playable = (ex) => ex.chunks.filter((c) => !c.given);

function mastery(ex) {
	let got = stars(ex.id, BOSS, 'recall'), max = 3;
	for (const c of playable(ex)) for (const m of MODES) { got += stars(ex.id, c.id, m.id); max += 3; }
	return { got, max, pct: got / max };
}

function nextCell(ex) {
	for (const c of playable(ex)) for (const m of MODES) if (!stars(ex.id, c.id, m.id)) return { chunk: c.id, mode: m.id };
	if (!stars(ex.id, BOSS, 'recall')) return { boss: true };
	return null;
}

function dueList() {
	const t = today(), out = [];
	for (const [k, v] of Object.entries(S.srs)) {
		const [exId, chunkId] = k.split('/');
		const ex = EXS[exId];
		if (ex && v.due <= t && ex.chunks.some((c) => c.id === chunkId && !c.given)) out.push({ exId, chunkId, due: v.due });
	}
	return out.sort((a, b) => a.due - b.due);
}

function srsUpdate(exId, chunkId, ok) {
	const k = `${exId}/${chunkId}`, prev = S.srs[k];
	const interval = ok ? Math.min(prev ? prev.interval * 2 : 1, 32) : 1;
	S.srs[k] = { interval, due: today() + interval };
}

function touchStreak() {
	const t = today();
	if (S.streak.last === t) return;
	S.streak.count = S.streak.last === t - 1 ? S.streak.count + 1 : 1;
	S.streak.last = t;
}
const liveStreak = () => (S.streak.last >= today() - 1 ? S.streak.count : 0);

/* ───────────────────────── C tokenizer & highlighting ───────────────────────── */

const TOK = /\s+|\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#\s*\w+|[A-Za-z_]\w*|\d+\.?\d*\w*|->|\+\+|--|<<|>>|<=|>=|==|!=|&&|\|\||[+\-*\/%&|^]=|\.\.\.|./g;
const KW = new Set('if else while for return break continue switch case default do sizeof static const typedef struct'.split(' '));
const TY = new Set('int char void float double long short unsigned signed size_t ssize_t FILE va_list t_city'.split(' '));

function kind(t) {
	if (/^\s/.test(t)) return 'ws';
	if (t[0] === '"' || t[0] === "'") return 'str';
	if (t[0] === '#') return 'pre';
	if (t.startsWith('//')) return 'com';
	if (/^\d/.test(t)) return 'num';
	if (/^[A-Za-z_]/.test(t)) return KW.has(t) ? 'kw' : TY.has(t) ? 'ty' : /^[A-Z_][A-Z0-9_]+$/.test(t) ? 'mac' : 'id';
	return 'op';
}

function tokenize(text) {
	const out = [];
	let m;
	TOK.lastIndex = 0;
	while ((m = TOK.exec(text))) out.push({ t: m[0], k: kind(m[0]), end: m.index + m[0].length });
	const inc = out.length && /^#\s*include/.test(out[0].t);
	out.forEach((tok, i) => {
		if (inc && i > 0 && tok.k !== 'ws') tok.k = 'str';
		if (tok.k === 'id') {
			const nx = out.slice(i + 1).find((x) => x.k !== 'ws');
			if (nx && nx.t === '(') tok.k = 'fn';
		}
	});
	return out;
}

// Whitespace-insensitive form of a line; hints walk along this one.
function canonRaw(text) {
	let out = '';
	for (const { t, k } of tokenize(text)) {
		if (k === 'ws') continue;
		const piece = k === 'pre' ? t.replace(/\s+/g, '') : t;
		if (/\w$/.test(out) && /^\w/.test(piece)) out += ' ';
		out += piece;
	}
	return out;
}

// Form used to judge typed code: also treats `return x;` and `return (x);` as the same line.
function canon(text) {
	const c = canonRaw(text);
	const m = c.match(/^return\((.*)\);$/);
	return m && balanced(m[1]) ? `return${/^\w/.test(m[1]) ? ' ' : ''}${m[1]};` : c;
}

function balanced(s) {
	let d = 0, q = '';
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (q) { if (ch === '\\') i++; else if (ch === q) q = ''; continue; }
		if (ch === '"' || ch === "'") q = ch;
		else if (ch === '(') d++;
		else if (ch === ')' && --d < 0) return false;
	}
	return d === 0;
}

function lineModel(raw) {
	const text = raw.trim();
	return {
		raw, text,
		indent: raw.slice(0, raw.length - raw.trimStart().length),
		blank: !text,
		auto: /^[{}]$/.test(text),
		tokens: tokenize(text),
		canon: canon(text),
		hint: canonRaw(text),
	};
}

// Neighbouring #includes, and neighbouring declarations, can be written in any order.
// A declaration still has to come after the ones its initialiser reads, and two lines
// that consume the same stream or argument list (fgetc, va_arg, read...) keep their order.
const DECL = /^(?:(?:static|const|unsigned|signed)\s+)*(?:int|char|float|double|long|short|size_t|ssize_t|FILE|va_list|t_city|void)\b[^(;=]*?(\w+)\s*(?:\[[^\]]*\])?\s*(?:=.*)?;$/;
const EFFECT = /\b(fgetc|getc|getchar|va_arg|read|scanf|fscanf)\s*\(/;

for (const rank of DATA.ranks) for (const level of rank.levels) for (const ex of level.exercises) {
	EXS[ex.id] = ex;
	for (const c of ex.chunks) {
		c.model = c.lines.map(lineModel);
		// ctx: unchanged exam code (shown, never drilled); chg: a line that has to be fixed
		c.model.forEach((l, i) => { l.note = c.notes[i]; l.chunk = c; l.ctx = c.ctx[i]; if (l.ctx) l.auto = true; });
		c.fix = c.ctx.some(Boolean);
		c.model.forEach((l) => { l.chg = c.fix && !l.ctx && !!l.note; });
		c.steps = c.model.filter((l) => l.note && !l.ctx);
		groupChunk(c);
	}
}

/* ── lines that may be written in any order ── */

function orderKind(l) {
	if (/^#\s*include\b/.test(l.text)) return 'inc';
	const m = l.text.match(DECL);
	if (!m) return null;
	l.name = m[1];
	l.uses = l.text.slice(l.text.indexOf(m[1]) + m[1].length).match(/[A-Za-z_]\w*/g) || [];
	l.effect = (l.text.match(EFFECT) || [])[1];
	return 'decl';
}

function groupChunk(c) {
	let run = [];
	const flush = () => {
		if (run.length > 1) {
			const g = { members: run.slice(), kind: run[0].kind };
			run.forEach((l, i) => {
				l.grp = g;
				l.deps = run.slice(0, i).filter((a) => (a.name && l.uses.includes(a.name)) || (a.effect && a.effect === l.effect));
			});
			g.strict = run.some((l) => l.deps.length);
		}
		run = [];
	};
	for (const l of c.model) {
		const k = c.given || l.ctx || l.blank ? null : orderKind(l);
		if (!k || (run.length && run[0].kind !== k)) flush();
		if (k) { l.kind = k; run.push(l); }
	}
	flush();
}

// Which group kinds may be written in any order: includes everywhere, declarations only in
// Recall (and the boss). Order mode drills the written order; Gaps keeps every line in place.
const FREE = { order: ['inc'], gaps: [], gaps2: [], recall: ['inc', 'decl'] };
const isFree = (g) => !!g && !!R && FREE[R.mode.id].includes(g.kind);

// The lines that may go at position idx: just arr[idx], unless it sits in an any-order group.
function choices(arr, idx) {
	const l = arr[idx], g = l.grp;
	if (!isFree(g)) return [l];
	const gs = arr.findIndex((x) => x.grp === g);
	const done = arr.slice(gs, idx);
	return arr.slice(idx, gs + g.members.length).filter((x) => x.deps.every((d) => done.includes(d)));
}

// Move the chosen line to position idx; the lines still to come keep their written order.
function take(arr, idx, l) {
	arr.splice(arr.indexOf(l, idx), 1);
	arr.splice(idx, 0, l);
}

const stepNo = (arr, idx) => {
	const c = arr[idx].chunk;
	return arr.slice(0, idx).filter((x) => x.chunk === c && c.steps.includes(x)).length + 1;
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tokHTML = (tok) => (tok.k === 'ws' ? esc(tok.t) : `<span class="t-${tok.k}">${esc(tok.t)}</span>`);
const hl = (tokens) => tokens.map(tokHTML).join('');
const lineHTML = (l) => (l.blank ? ' ' : `<span class="ind">${l.indent}</span>${hl(l.tokens)}`);
const lnCls = (l) => 'ln' + (l.ctx ? ' ctx' : '') + (l.chg ? ' chg' : '');
const codeBlock = (lines) => lines.map((l) => `<div class="${lnCls(l)}">${lineHTML(l)}</div>`).join('');
const fixCount = (ex) => playable(ex).reduce((n, c) => n + (c.fix ? c.steps.length : 0), 0);

/* ───────────────────────── juice: sound, confetti, toasts ───────────────────────── */

let actx;
function beep(freq, dur = 0.08, type = 'triangle', vol = 0.06, delay = 0) {
	if (S.mute) return;
	try {
		actx = actx || new (window.AudioContext || window.webkitAudioContext)();
		const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
		o.type = type; o.frequency.value = freq;
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g); g.connect(actx.destination);
		o.start(t); o.stop(t + dur);
	} catch (e) { /* no audio */ }
}
const sfx = {
	good: (combo) => beep(440 * Math.pow(2, Math.min(combo, 12) / 12), 0.09),
	bad: () => beep(130, 0.2, 'sawtooth', 0.05),
	hint: () => beep(300, 0.12, 'sine', 0.05),
	click: () => beep(660, 0.04, 'sine', 0.03),
	win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, 'triangle', 0.07, i * 0.1)),
	star: (i) => beep(784 + i * 180, 0.18, 'sine', 0.07),
	level: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => beep(f, 0.2, 'square', 0.035, i * 0.07)),
};

const fx = document.getElementById('fx');
const ctx = fx.getContext('2d');
let parts = [], raf = 0;
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function confetti(n = 140, x = 0.5, y = 0.35) {
	if (calm) return;
	fx.width = innerWidth; fx.height = innerHeight;
	const colors = ['#00e5c3', '#ffd166', '#ff5fa2', '#7c9cff', '#ffffff'];
	for (let i = 0; i < n; i++) {
		const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 11;
		parts.push({ x: x * fx.width, y: y * fx.height, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, r: 3 + Math.random() * 5, c: colors[i % colors.length], rot: Math.random() * 6, life: 1 });
	}
	if (!raf) raf = requestAnimationFrame(tick);
}
function tick() {
	ctx.clearRect(0, 0, fx.width, fx.height);
	parts = parts.filter((p) => p.life > 0 && p.y < fx.height + 20);
	for (const p of parts) {
		p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += 0.2; p.life -= 0.008;
		ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
		ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); ctx.fillStyle = p.c;
		ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
	}
	raf = parts.length ? requestAnimationFrame(tick) : 0;
}

function toast(html, cls = '') {
	const t = document.createElement('div');
	t.className = 'toast ' + cls;
	t.innerHTML = html;
	document.getElementById('toasts').appendChild(t);
	setTimeout(() => t.remove(), 3200);
}

function shake(node) {
	node.classList.remove('shake');
	void node.offsetWidth;
	node.classList.add('shake');
	node.addEventListener('animationend', () => node.classList.remove('shake'), { once: true });
}

/* ───────────────────────── shared UI pieces ───────────────────────── */

const starsHTML = (n, cls = '') => `<span class="stars ${cls}">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('')}</span>`;
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function topbar() {
	const lvl = levelOf(S.xp), a = xpFor(lvl), b = xpFor(lvl + 1);
	const pct = Math.round(((S.xp - a) / (b - a)) * 100);
	const streak = liveStreak();
	return `
	<header class="top">
		<button class="brand" data-act="home"><b>EXAM</b><span>QUEST</span><em>42</em></button>
		<div class="top-right">
			<div class="streak ${streak ? 'lit' : ''}" title="Daily streak"><span class="flame">▲</span>${streak}<small>day${streak === 1 ? '' : 's'}</small></div>
			<div class="lvl" title="${S.xp} XP">
				<div class="lvl-badge">${lvl}</div>
				<div class="lvl-info">
					<div class="lvl-name">${TITLES[Math.min(lvl - 1, TITLES.length - 1)]}</div>
					<div class="xpbar"><i style="width:${pct}%"></i></div>
					<div class="lvl-xp">${S.xp - a} / ${b - a} XP</div>
				</div>
			</div>
			<button class="icon-btn" data-act="mute" title="Toggle sound">${S.mute ? '🔇' : '🔊'}</button>
		</div>
	</header>`;
}

// The Logic box: what the finished step did, and a plain-language hint for the next one.
function logic(next, done, at) {
	const box = document.getElementById('logic');
	const ref = next || done;
	if (!box || !ref) return;
	const c = ref.chunk;
	const no = next ? at || c.steps.indexOf(next) + 1 : c.steps.length;
	const g = next && isFree(next.grp) ? next.grp : null;
	box.classList.toggle('off', !!S.noLogic);
	box.innerHTML = `
		<div class="logic-h">
			<b>Logic</b><span>${esc(c.title)}</span><em>step ${no} / ${c.steps.length}</em>
			<button data-act="logic" title="Show or hide the logic box">${S.noLogic ? 'show' : 'hide'}</button>
		</div>
		<div class="logic-body">
			<p class="logic-goal">${esc(c.goal)}</p>
			${done && done.note ? `<p class="logic-done"><i>✓</i><span>${esc(done.note[0])}${done.note[1] ? `<small>${esc(done.note[1])}</small>` : ''}</span></p>` : ''}
			${g ? `<p class="logic-any"><i>⇅</i><span>Any order works for these ${g.members.length} ${g.kind === 'inc' ? 'includes' : 'declarations'}${g.strict ? ', as long as each one comes after the variables it uses' : ''}.</span></p>` : ''}
			${next ? `<p class="logic-next"><i>▸</i><span><em>Next</em>${esc(next.note[0])}</span></p>` : '<p class="logic-next end"><i>★</i><span>Block complete.</span></p>'}
		</div>`;
}

let view = { name: 'home' };
function show(html, cls) {
	app.innerHTML = `<div class="screen ${cls}">${html}</div>`;
	window.scrollTo(0, 0);
}

/* ───────────────────────── home ───────────────────────── */

function renderHome() {
	stopRound();
	view = { name: 'home' };
	const rank = DATA.ranks[0];
	const due = dueList();
	let total = 0, got = 0, n = 0;
	const levels = rank.levels.map((level) => `
		<h2 class="section"><span>${esc(level.name)}</span></h2>
		<div class="cards">${level.exercises.map((ex) => {
			const m = mastery(ex);
			total += m.max; got += m.got;
			const nx = nextCell(ex);
			return `
			<button class="card ${m.pct === 1 ? 'mastered' : ''}" data-act="ex" data-ex="${ex.id}" style="--i:${n++}">
				<div class="ring" style="--p:${m.pct}"><span>${Math.round(m.pct * 100)}<small>%</small></span></div>
				<div class="card-body">
					<h3>${esc(ex.name)}</h3>
					<p>${esc(ex.file)} · ${fixCount(ex) ? `${fixCount(ex)} lines to fix in ${playable(ex).length} blocks` : `${playable(ex).length} blocks to memorise`}</p>
					<div class="card-meta">${starsHTML(Math.floor(m.pct * 3 + 1e-9))}<span>${m.got}/${m.max} ★</span></div>
				</div>
				<div class="card-go">${m.pct === 1 ? 'MASTERED' : nx && m.got ? 'CONTINUE ▸' : 'START ▸'}</div>
			</button>`;
		}).join('')}</div>`).join('');

	show(`
		${topbar()}
		<section class="hero">
			<p class="eyebrow">memory trainer</p>
			<h1>Know the answers <span>by heart.</span></h1>
			<p class="sub">Drill every exam solution until your fingers type it on their own: reorder it, fill the gaps, then recall it cold.</p>
			<div class="ranks">
				${['02', '03', '04', '05', '06'].map((r) => `<button class="rank ${r === '03' ? 'on' : ''}" ${r === '03' ? '' : 'disabled title="Not built yet"'}>Rank ${r}${r === '03' ? '' : '<small>soon</small>'}</button>`).join('')}
			</div>
		</section>
		<section class="overview">
			<div class="stat"><b>${Math.round((got / total) * 100)}%</b><span>rank mastery</span></div>
			<div class="stat"><b>${got}</b><span>of ${total} stars</span></div>
			<div class="stat"><b>${Object.keys(S.srs).length}</b><span>blocks in review</span></div>
			<button class="review ${due.length ? 'due' : ''}" data-act="review" ${due.length ? '' : 'disabled'}>
				<b>${due.length ? `${due.length} review${due.length > 1 ? 's' : ''} due` : 'No reviews due'}</b>
				<span>${due.length ? 'Recall them before you forget ▸' : 'Clear a Recall round to schedule one'}</span>
			</button>
		</section>
		${levels}
		<footer class="foot">
			<span>Solutions live in <code>game/solutions/</code> · rebuild with <code>node game/build.js</code></span>
			<button class="link" data-act="reset">Reset progress</button>
		</footer>`, 'home');
}

/* ───────────────────────── exercise page ───────────────────────── */

function renderEx(exId, tab = 'train') {
	stopRound();
	const ex = EXS[exId];
	view = { name: 'ex', exId, tab };
	const m = mastery(ex);
	const nx = nextCell(ex);
	const tabs = [['train', 'Train'], ['logic', 'Logic'], ['solution', 'Solution'], ['subject', 'Subject']];
	if (ex.original) tabs.push(['original', 'Broken original']);

	let body = '';
	if (tab === 'train') {
		const rows = ex.chunks.map((c) => {
			if (c.given) return `<div class="row given"><div class="row-name"><b>${esc(c.title)}</b><small>given by the exam — nothing to memorise</small></div></div>`;
			return `<div class="row"><div class="row-name"><b>${esc(c.title)}</b><small>${c.fix ? `${c.steps.length} changed line${c.steps.length > 1 ? 's' : ''}` : `${c.model.filter((l) => !l.blank).length} lines`}</small></div>${MODES.map((mode) => {
				const s = stars(ex.id, c.id, mode.id);
				const isNext = nx && nx.chunk === c.id && nx.mode === mode.id;
				return `<button class="cell ${s ? 'done' : ''} ${isNext ? 'next' : ''}" data-act="play" data-chunk="${c.id}" data-mode="${mode.id}" title="${mode.blurb}">
					<span class="cell-glyph">${mode.glyph}</span>${starsHTML(s, 'sm')}</button>`;
			}).join('')}</div>`;
		}).join('');
		const boss = stars(ex.id, BOSS, 'recall');
		body = `
			${fixCount(ex) ? '<p class="note fixnote">Only the lines that differ from the broken file are drilled. Everything the exam hands you unchanged is shown dimmed, as context.</p>' : ''}
			<div class="grid">
				<div class="row head"><div></div>${MODES.map((mode) => `<div class="col-h" title="${mode.blurb}"><b>${mode.name}</b><small>×${mode.mult} XP</small></div>`).join('')}</div>
				${rows}
			</div>
			<button class="boss ${boss ? 'done' : ''}" data-act="boss">
				<span class="boss-ico">☠</span>
				<span class="boss-txt">${fixCount(ex) ? '<b>Boss fight — every fix in one go</b><small>The whole broken file, every changed line typed from memory. This is the exam.</small>' : '<b>Boss fight — the whole file from memory</b><small>Every block in a row, no skeleton keys. This is the exam.</small>'}</span>
				${starsHTML(boss)}
			</button>`;
	} else if (tab === 'solution') {
		body = ex.chunks.map((c) => `
			<div class="chunk ${c.given ? 'given' : ''}">
				<div class="chunk-h"><b>${esc(c.title)}</b>${c.given ? '<span class="tag">given</span>' : '<span class="tag hot">memorise</span>'}</div>
				<div class="code">${codeBlock(c.model)}</div>
			</div>`).join('');
	} else if (tab === 'logic') {
		body = `<p class="note">The program in plain words, line by line. The same steps guide you in the Logic box while you train.</p>` + ex.chunks.map((c) => `
			<div class="chunk walk ${c.given ? 'given' : ''}">
				<div class="chunk-h"><b>${esc(c.title)}</b>${c.given ? '<span class="tag">given</span>' : ''}</div>
				<p class="walk-goal">${esc(c.goal)}</p>
				<div class="code walk-code">${c.model.map((l) => `<div class="walk-row ${l.ctx ? 'ctx' : ''} ${l.chg ? 'chg' : ''}"><div class="ln">${lineHTML(l)}</div><div class="walk-note">${l.note ? `${esc(l.note[0])}${l.note[1] ? `<small>${esc(l.note[1])}</small>` : ''}` : ''}</div></div>`).join('')}</div>
			</div>`).join('');
	} else if (tab === 'subject') {
		body = `<pre class="subject">${esc(ex.subject)}</pre>`;
	} else {
		body = `<p class="note">This is the buggy file the exam hands you. Compare it with the Solution tab — the fixes are the blocks marked “fixed”.</p>
			<div class="code">${codeBlock(ex.original.split('\n').map(lineModel))}</div>`;
	}

	show(`
		${topbar()}
		<section class="ex-head">
			<button class="back" data-act="home">◂ All exercises</button>
			<div class="ex-title">
				<div class="ring big" style="--p:${m.pct}"><span>${Math.round(m.pct * 100)}<small>%</small></span></div>
				<div>
					<h1>${esc(ex.name)}</h1>
					<p>Expected file <code>${esc(ex.file)}</code> · ${m.got}/${m.max} stars</p>
					<div class="chips">${ex.allowed.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
				</div>
				${nx ? `<button class="cta" data-act="continue">${m.got ? 'Continue' : 'Start training'} ▸<small>${nx.boss ? 'Boss fight' : `${esc(ex.chunks.find((c) => c.id === nx.chunk).title)} · ${MODE[nx.mode].name}`}</small></button>`
		: '<div class="cta ghost">Fully mastered ✓<small>Replay any block to keep it fresh</small></div>'}
			</div>
			<nav class="tabs">${tabs.map(([id, label]) => `<button class="${id === tab ? 'on' : ''}" data-act="tab" data-tab="${id}">${label}</button>`).join('')}</nav>
		</section>
		<section class="ex-body">${body}</section>`, 'ex');
}

/* ───────────────────────── round engine ───────────────────────── */

let R = null;

function stopRound() {
	if (R) clearInterval(R.timer);
	R = null;
}

function startRound(cfg) {
	stopRound();
	const ex = EXS[cfg.exId];
	const segs = cfg.boss ? playable(ex) : [ex.chunks.find((c) => c.id === cfg.chunkId)];
	const mode = MODE[cfg.boss ? 'recall' : cfg.mode];
	R = { cfg, ex, segs, mode, total: 0, done: 0, mistakes: 0, hints: 0, combo: 0, maxCombo: 0, xp: 0, t0: Date.now(), over: false };
	view = { name: 'play' };
	const label = cfg.boss ? 'Boss fight' : segs[0].title;
	show(`
		<header class="hud">
			<button class="icon-btn" data-act="quit" title="Quit (Esc)">✕</button>
			<div class="hud-title"><b>${esc(ex.name)}</b><span>${esc(label)}</span><em class="mode-${mode.id}">${cfg.boss ? '☠ Boss' : `${mode.glyph} ${mode.name}`}</em>${cfg.queue ? `<em class="q">review · ${cfg.queue.length} left after this</em>` : ''}</div>
			<div class="hud-stats">
				<div class="hud-stat combo" id="combo"><b>0</b><span>combo</span></div>
				<div class="hud-stat" id="miss"><b>0</b><span>misses</span></div>
				<div class="hud-stat" id="xpnow"><b>0</b><span>xp</span></div>
				<div class="hud-stat" id="clock"><b>0:00</b><span>time</span></div>
			</div>
			<div class="hud-bar"><i id="prog"></i></div>
		</header>
		<main id="stage" class="stage stage-${mode.id}"></main>
		<footer class="dock"><aside class="logic" id="logic" aria-live="polite"></aside><div class="keys" id="keys"></div></footer>`, 'play');
	R.timer = setInterval(() => {
		const c = document.querySelector('#clock b');
		if (c && R && !R.over) c.textContent = fmtTime((Date.now() - R.t0) / 1000);
	}, 500);
	({ order: playOrder, gaps: playGaps, gaps2: playGaps, recall: playRecall })[mode.id]();
	hud();
}

function hud() {
	const q = (s) => document.querySelector(s);
	q('#combo b').textContent = R.combo;
	q('#combo').classList.toggle('hot', R.combo >= 5);
	q('#combo').classList.toggle('fire', R.combo >= 12);
	q('#miss b').textContent = R.mistakes + R.hints;
	q('#xpnow b').textContent = R.xp;
	q('#prog').style.width = (R.total ? (R.done / R.total) * 100 : 0) + '%';
}

function good(anchor) {
	R.done++; R.combo++;
	R.maxCombo = Math.max(R.maxCombo, R.combo);
	const gain = Math.round(8 * R.mode.mult * (1 + Math.min(R.combo, 10) * 0.1));
	R.xp += gain;
	sfx.good(R.combo);
	hud();
	const c = document.getElementById('combo');
	c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
	if (anchor && !calm) {
		const r = anchor.getBoundingClientRect(), f = document.createElement('span');
		f.className = 'float'; f.textContent = '+' + gain;
		f.style.left = Math.min(r.right + 8, innerWidth - 60) + 'px'; f.style.top = r.top + 'px';
		document.body.appendChild(f);
		setTimeout(() => f.remove(), 900);
	}
	if (R.combo && R.combo % 10 === 0) toast(`<b>${R.combo} combo!</b> keep it flowing`, 'combo');
}

function bad(node) {
	R.mistakes++; R.combo = 0;
	sfx.bad();
	if (node) shake(node);
	document.querySelector('.hud').classList.remove('flash'); void app.offsetWidth; document.querySelector('.hud').classList.add('flash');
	hud();
}

function hinted() {
	R.hints++; R.combo = 0;
	sfx.hint();
	hud();
}

function finish() {
	if (R.over) return;
	R.over = true;
	clearInterval(R.timer);
	const { cfg, ex, mode } = R;
	const secs = Math.round((Date.now() - R.t0) / 1000);
	const errs = R.mistakes + R.hints * 2;
	const got = errs === 0 ? 3 : errs <= Math.max(1, Math.ceil(R.total * 0.2)) ? 2 : 1;
	const bonus = Math.round(got * 15 * mode.mult * (cfg.boss ? 3 : 1));
	const key = cellKey(ex.id, cfg.boss ? BOSS : cfg.chunkId, mode.id);
	const prev = S.cells[key] || { stars: 0, plays: 0 };
	const lvl0 = levelOf(S.xp);
	S.cells[key] = { stars: Math.max(prev.stars, got), plays: prev.plays + 1, best: prev.best ? Math.min(prev.best, secs) : secs };
	S.xp += R.xp + bonus;
	if (mode.id === 'recall') for (const seg of R.segs) srsUpdate(ex.id, seg.id, got >= 2);
	touchStreak();
	save();
	const lvl1 = levelOf(S.xp);
	const queue = cfg.queue || [];
	const nx = nextCell(ex);
	const record = prev.best && secs < prev.best;

	const ov = document.createElement('div');
	ov.className = 'overlay';
	ov.innerHTML = `
		<div class="result">
			<p class="eyebrow">${cfg.boss ? 'boss defeated' : got === 3 ? 'flawless' : got === 2 ? 'solid' : 'cleared'}</p>
			<h2>${esc(cfg.boss ? ex.name : R.segs[0].title)}</h2>
			<div class="big-stars">${[1, 2, 3].map((i) => `<i class="${i <= got ? 'on' : ''}" style="--d:${i * 0.22}s">★</i>`).join('')}</div>
			<div class="result-stats">
				<div><b>+${R.xp + bonus}</b><span>XP</span></div>
				<div><b>${fmtTime(secs)}</b><span>${record ? 'new best!' : 'time'}</span></div>
				<div><b>${R.mistakes}</b><span>misses</span></div>
				<div><b>${R.hints}</b><span>hints</span></div>
				<div><b>${R.maxCombo}</b><span>max combo</span></div>
			</div>
			${got < 3 ? `<p class="tip">${R.hints ? 'Hints cost double — try once more without them for 3 stars.' : 'One more clean run and it sticks. Go for 3 stars.'}</p>` : ''}
			<div class="result-btns">
				<button class="btn" data-act="retry">↻ Retry</button>
				${queue.length ? `<button class="btn primary" data-act="next-review">Next review (${queue.length}) ▸</button>`
		: nx && !cfg.review ? `<button class="btn primary" data-act="next">Next: ${nx.boss ? 'Boss fight' : `${esc(ex.chunks.find((c) => c.id === nx.chunk).title)} · ${MODE[nx.mode].name}`} ▸</button>` : ''}
				<button class="btn" data-act="done">${cfg.review ? 'Home' : 'Back to grid'}</button>
			</div>
		</div>`;
	app.querySelector('.screen').appendChild(ov);
	sfx.win();
	for (let i = 0; i < got; i++) setTimeout(() => sfx.star(i), 450 + i * 220);
	if (got === 3) setTimeout(() => confetti(cfg.boss ? 260 : 140), 500);
	if (lvl1 > lvl0) setTimeout(() => { toast(`<b>LEVEL ${lvl1}</b> ${TITLES[Math.min(lvl1 - 1, TITLES.length - 1)]}`, 'levelup'); sfx.level(); confetti(120, 0.5, 0.15); }, 1300);
	const primary = ov.querySelector('.btn.primary') || ov.querySelector('.btn');
	setTimeout(() => primary.focus(), 700);
}

/* ── mode: order ── */

function playOrder() {
	const lines = R.segs[0].model.filter((l) => !l.blank);
	const fix = R.segs[0].fix;
	const cards = lines.filter((l) => !l.auto).map((l, i) => ({ l, i })).sort(() => Math.random() - 0.5);
	R.total = cards.length;
	let idx = 0;
	const stage = document.getElementById('stage');
	stage.innerHTML = `
		<div class="pane"><div class="pane-h">Your code</div><div class="code" id="built"><div class="ln slot"><span class="caret"></span></div></div></div>
		<div class="pane"><div class="pane-h">Which line comes next?</div><div class="pool" id="pool">
			${cards.map((c, n) => `<button class="line-card" data-i="${c.i}" style="--i:${n}"><kbd></kbd><code>${hl(c.l.tokens)}</code></button>`).join('')}
		</div></div>`;
	document.getElementById('keys').innerHTML = '<span><kbd>click</kbd> or <kbd>1</kbd>–<kbd>9</kbd> pick a line</span><span><kbd>Tab</kbd> hint</span><span><kbd>Esc</kbd> quit</span>';
	const built = document.getElementById('built'), pool = document.getElementById('pool');
	// Fix blocks show the whole broken function up front, with holes where the changed lines go.
	if (fix) built.innerHTML = lines.map((l) => (l.auto ? `<div class="${lnCls(l)}">${lineHTML(l)}</div>`
		: `<div class="ln hole"><span class="ind">${l.indent}</span><span class="skel" style="width:${Math.max(2, l.text.length)}ch"></span></div>`)).join('');
	const rowsF = [...built.children];
	const byI = Object.fromEntries(cards.map((c) => [c.i, c.l]));
	const renumber = () => [...pool.children].forEach((b, n) => { b.querySelector('kbd').textContent = n < 9 ? n + 1 : ''; });

	const place = (l, pop) => {
		if (fix) {
			const r = rowsF[lines.indexOf(l)];
			r.className = lnCls(l) + (pop ? ' pop' : '');
			r.innerHTML = lineHTML(l);
			return;
		}
		const d = document.createElement('div');
		d.className = 'ln' + (pop ? ' pop' : '');
		d.innerHTML = lineHTML(l);
		built.insertBefore(d, built.lastElementChild);
		built.lastElementChild.scrollIntoView({ block: 'nearest' });
	};
	const advance = () => {
		if (fix) {
			while (idx < lines.length && lines[idx].auto) idx++;
			if (idx >= lines.length) return setTimeout(finish, 350);
			rowsF[idx].classList.add('cur');
			rowsF[idx].scrollIntoView({ block: 'nearest' });
			return;
		}
		while (idx < lines.length && lines[idx].auto) place(lines[idx++], false);
		if (idx >= lines.length) { built.lastElementChild.remove(); setTimeout(finish, 350); }
	};
	const pick = (btn) => {
		if (!btn || R.over || btn.classList.contains('gone')) return;
		const hit = choices(lines, idx).find((l) => l.text === byI[btn.dataset.i].text);
		if (hit) {
			take(lines, idx, hit);
			const was = lines[idx];
			place(lines[idx++], true);
			good(fix ? rowsF[idx - 1] : built.lastElementChild.previousElementSibling);
			btn.classList.add('gone');
			setTimeout(() => { btn.remove(); renumber(); }, 180);
			advance();
			logic(lines[idx] || null, was, lines[idx] && stepNo(lines, idx));
		} else bad(btn);
	};
	R.onClick = (e) => pick(e.target.closest('.line-card'));
	R.onKey = (e) => {
		if (e.key === 'Tab') {
			e.preventDefault();
			const b = [...pool.children].find((x) => !x.classList.contains('gone') && byI[x.dataset.i].text === lines[idx].text);
			if (b) { hinted(); b.classList.remove('hint'); void b.offsetWidth; b.classList.add('hint'); }
		} else if (/^[1-9]$/.test(e.key)) pick([...pool.children].filter((x) => !x.classList.contains('gone'))[+e.key - 1]);
	};
	renumber();
	advance();
	logic(lines[idx], null, stepNo(lines, idx));
}

/* ── mode: gaps ── */

function playGaps() {
	const lines = R.segs[0].model;
	const cands = [];
	lines.forEach((l, li) => l.tokens.forEach((tok, ti) => {
		if (l.ctx) return;
		const inc = /^#\s*include/.test(l.text);
		if (tok.k === 'ws' || tok.k === 'com') return;
		if (tok.k === 'op' && tok.t.length < 2) return;
		if (inc && (tok.t === 'h' || tok.k === 'pre' || tok.t.length < 2)) return;
		cands.push(li + ':' + ti);
	}));
	const n = Math.max(1, Math.round(cands.length * R.mode.ratio));
	const gaps = new Set(cands.sort(() => Math.random() - 0.5).slice(0, n));
	R.total = gaps.size;
	const stage = document.getElementById('stage');
	stage.innerHTML = `<div class="pane wide"><div class="pane-h">Fill every gap</div><div class="code">${lines.map((l, li) => `<div class="${lnCls(l)}">${l.blank ? ' ' : `<span class="ind">${l.indent}</span>` + l.tokens.map((tok, ti) => (gaps.has(li + ':' + ti)
		? `<input class="gap" data-li="${li}" data-a="${esc(tok.t)}" style="width:${tok.t.length + 1}ch" maxlength="${tok.t.length + 4}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">`
		: tokHTML(tok))).join('')}</div>`).join('')}</div></div>`;
	document.getElementById('keys').innerHTML = '<span>type the missing token — it locks in when correct</span><span><kbd>Tab</kbd> reveal</span><span><kbd>Esc</kbd> quit</span>';

	const lock = (inp, viaHint) => {
		const span = document.createElement('span');
		const tok = tokenize(inp.dataset.a)[0];
		span.className = `t-${tok.k} filled pop ${viaHint ? 'hinted' : ''}`;
		span.textContent = inp.dataset.a;
		const all = [...stage.querySelectorAll('.gap')];
		const next = all[all.indexOf(inp) + 1] || all.find((x) => x !== inp);
		const row = inp.closest('.ln');
		inp.replaceWith(span);
		if (!row.querySelector('.gap')) lastDone = lines[inp.dataset.li];
		if (!next) logic(null, lastDone);
		if (viaHint) { R.done++; hinted(); } else good(span);
		if (next) { next.focus(); sync(next); next.scrollIntoView({ block: 'nearest' }); } else setTimeout(finish, 350);
	};
	let lastDone = null;
	const sync = (inp) => {
		const cur = lines[inp.dataset.li];
		logic(cur, lastDone === cur ? null : lastDone);
	};
	R.onFocus = (e) => { if (e.target.classList.contains('gap')) sync(e.target); };
	R.onInput = (e) => {
		const inp = e.target;
		if (!inp.classList.contains('gap')) return;
		const v = inp.value.trim(), a = inp.dataset.a;
		if (v === a) return lock(inp, false);
		const wrong = !a.startsWith(v);
		if (wrong && !inp.classList.contains('wrong')) bad(inp);
		inp.classList.toggle('wrong', wrong);
	};
	R.onKey = (e) => {
		if (e.key !== 'Tab') return;
		e.preventDefault();
		const inp = document.activeElement.classList.contains('gap') ? document.activeElement : stage.querySelector('.gap');
		if (inp) lock(inp, true);
	};
	stage.querySelector('.gap').focus();
	sync(stage.querySelector('.gap'));
}

/* ── mode: recall (and boss) ── */

function playRecall() {
	const stage = document.getElementById('stage');
	const boss = R.cfg.boss;
	const flat = [];
	stage.innerHTML = `<div class="pane wide"><div class="pane-h">${boss ? 'Write the whole file from memory' : 'Type each line from memory'}</div><div class="code recall">${R.segs.map((seg) => {
		const rows = seg.model.map((l) => {
			flat.push(l);
			if (l.ctx) return `<div class="${lnCls(l)}">${lineHTML(l)}</div>`;
			return `<div class="ln future">${l.blank ? ' ' : `<span class="ind">${l.indent}</span><span class="skel" style="width:${boss ? 6 : Math.max(2, l.text.length)}ch"></span>`}</div>`;
		}).join('');
		return (R.segs.length > 1 ? `<div class="seg-h">${esc(seg.title)}</div>` : '') + rows;
	}).join('')}</div></div>`;
	document.getElementById('keys').innerHTML = '<span>spacing is free — every token has to match</span><span><kbd>Tab</kbd> reveal next token</span><span><kbd>Esc</kbd> quit</span>';
	const rows = [...stage.querySelectorAll('.ln')];
	R.total = flat.filter((l) => !l.blank && !l.auto).length;
	let idx = 0, input = null, wrong = false, slips = 0, lastDone = null;

	const reveal = (i, pop) => { rows[i].className = lnCls(flat[i]) + (pop ? ' pop' : ''); rows[i].innerHTML = lineHTML(flat[i]); };
	const advance = () => {
		while (idx < flat.length && (flat[idx].blank || flat[idx].auto)) reveal(idx++, false);
		if (idx >= flat.length) { input = null; logic(null, lastDone); return setTimeout(finish, 350); }
		const l = flat[idx];
		logic(l, lastDone && lastDone.chunk === l.chunk ? lastDone : null, stepNo(flat, idx));
		rows[idx].className = 'ln cur';
		rows[idx].innerHTML = `<span class="ind">${l.indent}</span><input class="type" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"><span class="nudge"></span>`;
		input = rows[idx].querySelector('input');
		wrong = false; slips = 0;
		input.focus();
		rows[idx].scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
	};
	const accept = () => {
		const row = rows[idx];
		lastDone = flat[idx];
		reveal(idx++, true);
		good(row);
		advance();
	};
	// Judge the line only when it is finished: on ';' (once it has as many
	// semicolons as the answer) or on Enter. Mid-line typing is never marked.
	const semis = (s) => (s.match(/;/g) || []).length;
	const check = (lineEnd) => {
		const l = flat[idx], c = canon(input.value);
		const hit = choices(flat, idx).find((x) => x.canon === c);
		if (hit) {
			if (hit !== l) {
				take(flat, idx, hit);
				// The skeletons after this line now stand for different lines.
				for (let k = idx + 1; flat[k] && flat[k].grp === hit.grp; k++) {
					const sk = rows[k].querySelector('.skel');
					if (sk && !boss) sk.style.width = Math.max(2, flat[k].text.length) + 'ch';
				}
			}
			return accept();
		}
		const finished = lineEnd || (c.endsWith(';') && semis(c) >= semis(l.canon));
		if (!finished || wrong) return;
		bad(input);
		if (++slips >= 2) rows[idx].querySelector('.nudge').textContent = 'Tab ⇥ for a hint';
		wrong = true;
		input.classList.add('wrong');
	};
	R.onInput = (e) => { if (e.target === input) check(false); };
	R.onKey = (e) => {
		if (!input) return;
		if (e.key === 'Tab') {
			e.preventDefault();
			const c = canonRaw(input.value);
			const lcp = (h) => { let k = 0; while (k < c.length && k < h.length && c[k] === h[k]) k++; return k; };
			const l = choices(flat, idx).reduce((a, b) => (lcp(b.hint) > lcp(a.hint) ? b : a));
			const k = lcp(l.hint);
			const tok = l.tokens.find((t) => t.k !== 'ws' && canonRaw(l.text.slice(0, t.end)).length > k);
			if (!tok) return;
			hinted();
			input.value = l.text.slice(0, tok.end);
			wrong = false;
			input.classList.remove('wrong');
			input.classList.remove('hintflash'); void input.offsetWidth; input.classList.add('hintflash');
			check(false);
		} else if (e.key === 'Enter' && input.value.trim()) {
			check(true);
		}
	};
	R.onClick = (e) => { if (input && !e.target.closest('button')) input.focus(); };
	advance();
}

/* ───────────────────────── events ───────────────────────── */

function go(cfg) { sfx.click(); startRound(cfg); }

const ACTIONS = {
	home: () => renderHome(),
	mute: () => { S.mute = !S.mute; save(); if (view.name === 'ex') renderEx(view.exId, view.tab); else renderHome(); sfx.click(); },
	ex: (d) => { sfx.click(); renderEx(d.ex); },
	tab: (d) => renderEx(view.exId, d.tab),
	play: (d) => go({ exId: view.exId, chunkId: d.chunk, mode: d.mode }),
	boss: () => go({ exId: view.exId, boss: true }),
	continue: () => { const nx = nextCell(EXS[view.exId]); go(nx.boss ? { exId: view.exId, boss: true } : { exId: view.exId, chunkId: nx.chunk, mode: nx.mode }); },
	review: () => { const q = dueList(); if (q.length) go({ ...q[0], mode: 'recall', review: true, queue: q.slice(1) }); },
	logic: () => {
		S.noLogic = !S.noLogic; save();
		const box = document.getElementById('logic');
		box.classList.toggle('off', S.noLogic);
		box.querySelector('[data-act]').textContent = S.noLogic ? 'show' : 'hide';
		const t = document.querySelector('.type, .gap');
		if (t) t.focus();
	},
	quit: () => { const c = R.cfg; if (c.review) renderHome(); else renderEx(c.exId); },
	retry: () => go({ ...R.cfg }),
	done: () => ACTIONS.quit(),
	next: () => { const c = R.cfg, nx = nextCell(EXS[c.exId]); go(nx.boss ? { exId: c.exId, boss: true } : { exId: c.exId, chunkId: nx.chunk, mode: nx.mode }); },
	'next-review': () => { const q = R.cfg.queue; go({ ...q[0], mode: 'recall', review: true, queue: q.slice(1) }); },
	reset: () => { if (confirm('Erase all XP, stars and review data?')) { S = fresh(); save(); renderHome(); } },
};

document.addEventListener('click', (e) => {
	const b = e.target.closest('[data-act]');
	if (b && !b.disabled) return ACTIONS[b.dataset.act](b.dataset);
	if (R && !R.over && R.onClick) R.onClick(e);
});
document.addEventListener('focusin', (e) => { if (R && !R.over && R.onFocus) R.onFocus(e); });
document.addEventListener('input', (e) => { if (R && !R.over && R.onInput) R.onInput(e); });
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		if (view.name === 'play') ACTIONS.quit();
		else if (view.name === 'ex') renderHome();
		return;
	}
	if (R && !R.over && R.onKey) R.onKey(e);
});
document.addEventListener('paste', (e) => { if (R && e.target.matches('.gap, .type')) e.preventDefault(); });

renderHome();
})();
