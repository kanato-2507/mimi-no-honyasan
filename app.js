// 聴く本棚（ポラ版）
// 本のデータは data.js（window.BOOK_DATA）。保存版の記事と完成記事から作ったもの。
(function () {
  'use strict';

  const BOOKS = window.BOOK_DATA || [];

  // 気分。色は背表紙の色にもなる
  const MOODS = [
    { id: 'warm',    label: 'ほっとしたい',   ic: '☕', color: '#c98a2b' },
    { id: 'moving',  label: 'じんわりしたい', ic: '🥲', color: '#c4675c' },
    { id: 'fun',     label: 'クスッと笑いたい', ic: '😊', color: '#d9822b' },
    { id: 'mystery', label: '謎を楽しみたい', ic: '🔍', color: '#3d6c8c' },
    { id: 'ghost',   label: '怪談でゾクッと', ic: '👻', color: '#5d5487' },
    { id: 'dark',    label: '人の怖さにゾワッ', ic: '🌀', color: '#7a3b3b' },
    { id: 'world',   label: '別世界に浸りたい', ic: '🌏', color: '#2f6f5a' },
  ];
  const RANK = {
    A: '家事や通勤をしながらでも楽しめました',
    B: 'ところどころ聴き直すと楽しめました',
    C: '人物や内容をメモしながら聴くと楽しめました',
  };
  const RANK_SHORT = { A: 'ながら聴きOK', B: 'ときどき聴き直し', C: 'メモしながら' };

  // いまの推し（保存版「今、私がAudibleで推したい2つのシリーズ」より）
  const OSHI = [
    { series: '十二国記', title: '月の影 影の海', open: '月の影 影の海',
      pop: '続きが気になって、どんどん先へ進みたくなる' },
    { series: 'アンデッドガール・マーダーファルス', title: 'アンデッドガール・マーダーファルス', open: 'アンデッドガール・マーダーファルス 1',
      pop: '掛け合いと声の演じ分けが楽しい' },
  ];

  const state = { mood: null, rank: 'all', lastDrawn: null };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const moodOf = (id) => MOODS.find((m) => m.id === id);
  const byTitle = (t) => BOOKS.find((b) => b.title === t);

  // 背表紙の色：最初の気分の色を、本ごとに少しだけ明るさを変える
  function spineColor(b, i) {
    const base = moodOf(b.moods[0]).color;
    const shift = [0, 10, -8, 5, -4][i % 5];
    return `color-mix(in srgb, ${base} ${100 - Math.abs(shift) * 2}%, ${shift > 0 ? '#fff' : '#000'})`;
  }
  // 背表紙の高さ：題名の長さで変える（棚が揃いすぎないように）
  function spineHeight(b, i) {
    if (b.series === '十二国記') return 196;
    const len = shortTitle(b).length;
    const h = len > 8 ? 150 + Math.min(len, 18) * 2 : 120 + len * 9;
    return Math.min(196, Math.max(140, h)) - (i % 3) * 6;
  }
  // 背表紙に載せる題名（長い題とシリーズの巻数を整理）
  function shortTitle(b) {
    let t = b.title.replace(/ \d+$/, '');
    if (t.startsWith('入居条件')) t = '入居条件';
    if (t.startsWith('うるはしみにくし')) t = 'うるはしみにくし';
    return t;
  }
  function volume(b) {
    const m = b.title.match(/ (\d+)$/);
    if (m) return m[1];
    if (b.title.startsWith('入居条件')) return '1';
    return '';
  }
  const isSequel = (b) => b.startTitle && b.startTitle !== b.title;

  // ---------- 気分ボタン ----------
  function renderMoods() {
    $('#moods').innerHTML = `<button type="button" class="mood" role="radio" aria-checked="true" data-mood="" style="--mc:#8a7a6a">
         <span class="ic" aria-hidden="true">🎲</span>おまかせ</button>` + MOODS.map((m) =>
      `<button type="button" class="mood" role="radio" aria-checked="false" data-mood="${m.id}" style="--mc:${m.color}">
         <span class="ic" aria-hidden="true">${m.ic}</span>${esc(m.label)}</button>`).join('');
    $('#moods').addEventListener('click', (e) => {
      const btn = e.target.closest('.mood');
      if (!btn) return;
      state.mood = btn.dataset.mood || null;
      updateMoods();
      updateShelf();
      const m = moodOf(state.mood);
      setBird(m ? 'runrun' : 'nikkori', m ? `${m.label}日ですね` : '今日は、どんな気分？');
    });
  }
  function updateMoods() {
    document.querySelectorAll('.mood').forEach((b) => b.setAttribute('aria-checked', String((b.dataset.mood || null) === state.mood)));
    const m = moodOf(state.mood);
    $('#draw-sub').textContent = m ? `「${m.label}」から選びます` : '棚の中から、おまかせで選びます';
  }

  // ---------- インコ ----------
  function setBird(face, words) {
    const bird = $('#bird');
    bird.src = `img/${face}.png`;
    bird.classList.remove('hop'); void bird.offsetWidth; bird.classList.add('hop');
    if (words) $('#bubble').textContent = words;
  }

  // ---------- 1冊引く ----------
  function candidates() {
    return BOOKS.filter((b) => !isSequel(b) && (!state.mood || b.moods.includes(state.mood)));
  }
  function draw() {
    const list = candidates();
    const pool = list.length > 1 ? list.filter((b) => b.title !== state.lastDrawn) : list;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const btn = $('#draw-btn');
    btn.disabled = true;
    setBird('kyorokyoro', 'どれにしようかな…');

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minis = list.slice(0, 7).map((b, i) =>
      `<span class="mini" style="height:${90 + (i % 3) * 22}px;background:${spineColor(b, i)};animation-delay:${i * 60}ms"></span>`).join('');
    $('#result').innerHTML = `<div class="shuffle" aria-hidden="true">${minis}</div>`;

    setTimeout(() => {
      state.lastDrawn = pick.title;
      showResult(pick, list.length);
      setBird('kiraan', 'これ、どう？');
      btn.disabled = false;
      highlightSpine(pick);
    }, reduce ? 0 : 1100);
  }
  function showResult(b, total) {
    const m = moodOf(state.mood);
    const label = m ? `「${m.label}」日の1冊` : 'おまかせの1冊';
    const again = total > 1 ? `<button type="button" class="btn ghost" id="again">もう1冊ひく</button>` : '';
    $('#result').innerHTML = `
      <article class="pop">
        <p class="pop-label">${esc(label)}</p>
        <p class="pop-catch">${esc(b.brief)}</p>
        <h3 class="pop-title">『${esc(b.title)}』</h3>
        <p class="pop-author">${esc(b.author)}</p>
        <span class="rank-badge"><span class="dot ${b.rank}">${b.rank}</span>${RANK_SHORT[b.rank]}</span>
        <div class="pop-actions">
          <button type="button" class="btn" id="read">かなとの感想を読む</button>
          ${again}
        </div>
      </article>`;
    $('#read').addEventListener('click', () => openSheet(b));
    const a = $('#again');
    if (a) a.addEventListener('click', draw);
    if (total === 1) $('#bubble').textContent = 'この気分は、いまこの1冊です';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('.pop').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }

  // ---------- 平台 ----------
  function renderOshi() {
    $('#hira').innerHTML = OSHI.map((o) => {
      const b = byTitle(o.open);
      const color = moodOf('world').color;
      const deep = o.series === '十二国記' ? '#2f5f63' : '#4b3b6b';
      return `<button type="button" class="face" data-open="${esc(o.open)}" aria-label="${esc(o.series)}の感想を読む">
        <span class="cover" style="background:linear-gradient(160deg,${color},${deep})">
          <span class="cover-series">${o.series === '十二国記' ? '十二国記シリーズ' : 'シリーズ1巻から'}</span>
          <span class="cover-author">${esc(b.author)}</span>
          <span class="cover-title">${esc(o.title)}</span>
        </span>
        <span class="face-pop">${esc(o.pop)}</span>
      </button>`;
    }).join('');
    $('#hira').addEventListener('click', (e) => {
      const f = e.target.closest('.face');
      if (f) openSheet(byTitle(f.dataset.open));
    });
  }

  // ---------- 棚 ----------
  function renderRankFilter() {
    const opts = [['all', 'ぜんぶ'], ['A', RANK_SHORT.A], ['B', RANK_SHORT.B], ['C', RANK_SHORT.C]];
    $('#rank-filter').innerHTML = opts.map(([v, l]) =>
      `<button type="button" class="rf ${v === 'all' ? 'all' : ''}" role="radio" aria-checked="${v === state.rank}" data-rank="${v}">
        ${v === 'all' ? '' : `<span class="dot ${v}">${v}</span>`}${l}</button>`).join('');
    $('#rank-filter').addEventListener('click', (e) => {
      const btn = e.target.closest('.rf');
      if (!btn) return;
      state.rank = btn.dataset.rank;
      document.querySelectorAll('.rf').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.rank === state.rank)));
      updateShelf();
    });
  }
  function renderShelf() {
    $('#bookcase').innerHTML = BOOKS.map((b, i) => {
      const vol = volume(b);
      return `<div class="slot"><button type="button" class="spine" data-i="${i}"
          style="height:${spineHeight(b, i)}px;background:${spineColor(b, i)}"
          aria-label="${b.series === '十二国記' ? '十二国記 ' : ''}『${esc(b.title)}』${esc(b.author)}、聴きやすさ${b.rank}。感想を読む">
          <span class="dot ${b.rank}" aria-hidden="true">${b.rank}</span>
          <span class="spine-title${shortTitle(b).length > 8 ? ' long' : ''}${b.series === '十二国記' ? ' in-series' : ''}" aria-hidden="true">${b.series === '十二国記' ? esc(shortTitle(b)).replace(' ', '<br>') : esc(shortTitle(b))}</span>
          ${vol ? `<span class="spine-vol" aria-hidden="true">${vol}</span>` : ''}
          ${b.series === '十二国記' ? '<span class="spine-series" aria-hidden="true">十二国記</span>' : ''}
        </button></div>`;
    }).join('');
    $('#bookcase').addEventListener('click', (e) => {
      const s = e.target.closest('.spine');
      if (s) openSheet(BOOKS[+s.dataset.i]);
    });
  }
  function updateShelf() {
    const active = state.mood || state.rank !== 'all';
    let n = 0;
    document.querySelectorAll('.spine').forEach((s) => {
      const b = BOOKS[+s.dataset.i];
      const hit = (!state.mood || b.moods.includes(state.mood)) && (state.rank === 'all' || b.rank === state.rank);
      if (hit) n++;
      s.classList.toggle('on', active && hit);
      s.classList.toggle('off', active && !hit);
    });
    const parts = [];
    if (state.mood) parts.push(`「${moodOf(state.mood).label}」`);
    if (state.rank !== 'all') parts.push(`聴きやすさ${state.rank}`);
    $('#shelf-status').innerHTML = active
      ? `${esc(parts.join('・'))}の本が <b>${n}冊</b>、前に出ています`
      : `全${BOOKS.length}冊。上で気分を選ぶと、合う本が前に出てきます`;
  }
  function highlightSpine(b) {
    const i = BOOKS.indexOf(b);
    const s = document.querySelector(`.spine[data-i="${i}"]`);
    if (!s) return;
    s.classList.remove('picked'); void s.offsetWidth; s.classList.add('picked');
  }

  // ---------- 感想シート ----------
  function formatParagraphs(ps) {
    let html = '', list = [];
    const flush = () => { if (list.length) { html += `<ul>${list.join('')}</ul>`; list = []; } };
    // 「こんな人におすすめ ✅…✅…」が1段落につながっている本もあるので、先に分ける
    ps = ps.flatMap((p) => {
      const at = p.indexOf('こんな人におすすめ');
      if (at < 0 || !p.includes('✅')) return [p];
      const before = p.slice(0, at).trim();
      const [head, ...items] = p.slice(at).split('✅').map((x) => x.trim());
      return [before, head, ...items.filter(Boolean).map((x) => '✅ ' + x)].filter(Boolean);
    });
    ps.forEach((p, idx) => {
      const lines = p.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.every((l) => /^(✅|- )/.test(l))) {
        lines.forEach((l) => list.push(`<li>${esc(l.replace(/^(✅\s*|- )/, ''))}</li>`));
        return;
      }
      flush();
      if (/^こんな人におすすめ/.test(p)) { html += `<h4>${esc(p)}</h4>`; return; }
      const body = lines.map(esc).join('<br>');
      html += `<p${idx === 0 && /^「/.test(p) ? ' class="quote"' : ''}>${body}</p>`;
    });
    flush();
    return html;
  }
  function openSheet(b) {
    const i = BOOKS.indexOf(b);
    let series = '';
    if (isSequel(b)) {
      series = `<p class="series-note">シリーズものです。はじめての方は
        <button type="button" data-goto="${esc(b.startTitle)}">『${esc(b.startTitle)}』</button> からどうぞ。</p>`;
    }
    $('#sheet-body').innerHTML = `
      <div class="sheet-band" style="background:${spineColor(b, i)}"></div>
      <div class="sheet-head">
        <span class="rank-badge"><span class="dot ${b.rank}">${b.rank}</span>${RANK[b.rank]}</span>
        <h3 id="sheet-title">『${esc(b.title)}』</h3>
        <p class="author">${esc(b.author)}</p>
      </div>
      <p class="sheet-catch">${esc(b.brief)}</p>
      ${series}
      <div class="sheet-text">${formatParagraphs(b.paragraphs)}</div>
      <div class="sheet-foot">
        <a class="btn" href="${esc(b.url)}" target="_blank" rel="noopener">紹介した週のnote記事へ</a>
      </div>
      <div class="voice">
        <p>あなたは、どうでした？</p>
        <small>聴きやすさは、私が聴いたときの感じです。<br>「私はBだった」「ながら聴きでいけた」など、<br>noteのコメントで教えてもらえるとうれしいです。</small>
        <a class="btn" href="${esc(b.url)}" target="_blank" rel="noopener">noteにコメントしに行く</a>
      </div>
      <div class="sheet-foot">
        <small>note記事には広告・アフィリエイトリンクが含まれます。</small>
      </div>`;
    const d = $('#sheet');
    if (!d.open) d.showModal();
    d.querySelector('.sheet-inner').scrollTop = 0;
    const g = d.querySelector('[data-goto]');
    if (g) g.addEventListener('click', () => openSheet(byTitle(g.dataset.goto)));
  }
  function setupSheet() {
    const d = $('#sheet');
    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
  }

  // ---------- はじめ ----------
  function init() {
    $('#count').textContent = BOOKS.length;
    renderMoods();
    renderOshi();
    renderRankFilter();
    renderShelf();
    updateShelf();
    setupSheet();
    $('#draw-btn').addEventListener('click', draw);
  }
  init();
})();
