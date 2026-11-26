/* 쏭컷 스튜디오 PRO — 편집기 (상태·타임라인·인스펙터·마법사·내보내기) */
(function () {
  'use strict';
  const SC = window.SC, $ = SC.$, $$ = SC.$$;
  const clamp = SC.clamp;

  window.__scErrors = [];
  window.addEventListener('error', (e) => window.__scErrors.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => window.__scErrors.push('promise: ' + String(e.reason)));

  const S = {
    project: null, media: [], sel: null, playhead: 0, pxPerSec: 72, playing: false,
    undo: [], redo: [], editSnap: null, raf: 0, t0: 0, tab: 'media',
    tplSel: 'signature', bgmSel: 0, exportOpts: { ratio: '9:16', quality: 1080, sound: true },
    audio: { ctx: null, gain: null, dest: null, node: null, el: null, curSrc: '', ready: false },
    exporting: false
  };
  window.__SC = S;

  const view = $('#view'), vctx = view.getContext('2d');
  const bgmEl = new Audio();
  bgmEl.preload = 'auto';
  bgmEl.loop = false;
  bgmEl.crossOrigin = 'anonymous';

  /* ================= 유틸 ================= */
  const toast = (() => { let t; return (msg, ms) => { const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(t); t = setTimeout(() => el.classList.add('hidden'), ms || 2600); }; })();
  const dur = () => (S.project ? SC.Render.duration(S.project) : 0);
  const clipOf = (track, id) => { if (!S.project) return null; return S.project.tracks[track].clips.find((c) => c.id === id) || null; };
  const selClip = () => (S.sel ? clipOf(S.sel.track, S.sel.id) : null);
  const selTrack = () => (S.sel ? S.sel.track : null);
  const mediaOf = (id) => S.media.find((m) => m.id === id) || null;

  function snapshot() {
    if (!S.project) return '{}';
    return JSON.stringify({ name: S.project.name, ratio: S.project.ratio, template: S.project.template, brand: S.project.brand, brandOn: S.project.brandOn,
      v: S.project.tracks.video.clips, t: S.project.tracks.text.clips, a: S.project.tracks.audio.clips });
  }
  function pushUndo(snap) {
    if (!S.project) return;
    const s = snap || snapshot();
    if (S.undo[S.undo.length - 1] === s) return;
    S.undo.push(s);
    if (S.undo.length > 60) S.undo.shift();
    S.redo.length = 0;
    syncUndoButtons();
  }
  function restore(json) {
    const d = JSON.parse(json);
    S.project.ratio = d.ratio; S.project.w = SC.RATIOS[d.ratio][0]; S.project.h = SC.RATIOS[d.ratio][1];
    S.project.name = d.name; S.project.template = d.template; S.project.brand = d.brand; S.project.brandOn = d.brandOn;
    S.project.tracks.video.clips = d.v; S.project.tracks.text.clips = d.t; S.project.tracks.audio.clips = d.a;
    S.sel = null;
    syncRatio(); renderTimeline(); renderInspector(); updateTransport(); draw();
  }
  function undo() { if (!S.undo.length) return; S.redo.push(snapshot()); restore(S.undo.pop()); syncUndoButtons(); toast('되돌렸어요'); }
  function redo() { if (!S.redo.length) return; S.undo.push(snapshot()); restore(S.redo.pop()); syncUndoButtons(); }
  function syncUndoButtons() { $('#btnUndo').disabled = !S.undo.length; $('#btnRedo').disabled = !S.redo.length; $('#btnUndo').style.opacity = S.undo.length ? 1 : 0.45; $('#btnRedo').style.opacity = S.redo.length ? 1 : 0.45; }

  /* ================= 프로젝트 ================= */
  function emptyProject(ratio, media) {
    const [w, h] = SC.RATIOS[ratio || '9:16'];
    return { name: '새 프로젝트', ratio: ratio || '9:16', w: w, h: h, template: '', brand: '@ssongliz', brandOn: true,
      media: media || S.media, tracks: { video: { clips: [] }, text: { clips: [] }, audio: { clips: [] } } };
  }
  function applyProject(p, opts) {
    if (!p) return;
    S.project = p;
    S.project.media = S.media;
    S.sel = null; S.playhead = 0; S.playing = false;
    S.undo.length = 0; S.redo.length = 0; syncUndoButtons();
    if (opts && opts.templateId) S.tplSel = opts.templateId;
    syncRatio();
    renderAll();
    setPlayhead(0);
    stopPlayback();
  }

  /** 템플릿으로 만들기: 지금 미디어(없으면 샘플) */
  function applyTemplate(tpl, mediaPool, o) {
    const pool = (mediaPool && mediaPool.length ? mediaPool : S.media.filter((m) => m.sample === 'lecture'));
    const p = SC.buildFromTemplate(tpl, pool, o || {});
    if (!p) { toast('사진이나 영상을 먼저 올려 주세요'); return null; }
    applyProject(p, { templateId: tpl.id });
    draw();
    return p;
  }
  function currentMediaPool() {
    const ids = [];
    if (S.project) for (const c of S.project.tracks.video.clips) if (c.mediaId && ids.indexOf(c.mediaId) < 0) ids.push(c.mediaId);
    const list = ids.map(mediaOf).filter(Boolean);
    return list.length ? list : S.media.filter((m) => m.sample === 'lecture');
  }

  /* ================= 재생 ================= */
  function setPlayhead(t, quiet) {
    const d = dur();
    S.playhead = clamp(t, 0, Math.max(0, d));
    $('#seekBar').value = d ? Math.round(S.playhead / d * 1000) : 0;
    $('#timeText').textContent = SC.fmt(S.playhead) + ' / ' + SC.fmt(d);
    const ph = $('#playhead');
    if (ph) ph.style.left = (S.playhead * S.pxPerSec) + 'px';
    if (!quiet) { alignToPlayhead(); }
  }
  function draw() {
    if (!S.project) return;
    SC.Render.frame(vctx, S.project, S.playhead, { preview: true, playing: S.playing, safe: $('#safeChk').checked, selectedTextId: S.sel && S.sel.track === 'text' ? S.sel.id : null, frameNo: (draw.n = (draw.n || 0) + 1) });
  }
  const scheduleDraw = SC.debounce(draw, 30);

  function syncVideos(t, forcePlay) {
    if (!S.project) return;
    const clips = S.project.tracks.video.clips;
    const used = new Set();
    for (const c of clips) {
      const m = mediaOf(c.mediaId);
      if (!m || mu(m) !== 'video') continue;
      const el = m.el;
      const inside = t >= c.start - 1e-6 && t < c.start + c.dur + 1e-6;
      if (!inside) continue;
      used.add(m.id);
      const want = (c.in || 0) + (t - c.start) * (c.speed || 1);
      el.muted = true;
      if (Math.abs(el.currentTime - want) > 0.3) { try { el.currentTime = Math.max(0, Math.min(want, (el.duration || m.dur) - 0.05)); } catch (_) { /* noop */ } }
      if (S.playing || forcePlay) {
        el.playbackRate = clamp(c.speed || 1, 0.25, 3);
        if (el.paused) el.play().catch(() => {});
      } else if (!el.paused) el.pause();
    }
    for (const m of S.media) {
      if (mu(m) === 'video' && !used.has(m.id) && !m.el.paused) m.el.pause();
    }
  }
  const mu = (m) => (m.type === 'video' ? 'video' : 'image');

  function ensureAudio() {
    if (S.audio.ready) return S.audio;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const node = ctx.createMediaElementSource(bgmEl);
      const gain = ctx.createGain(); gain.gain.value = 0.6;
      const dest = ctx.createMediaStreamDestination();
      node.connect(gain); gain.connect(dest); gain.connect(ctx.destination);
      S.audio = { ctx: ctx, node: node, gain: gain, dest: dest, el: bgmEl, ready: true };
    } catch (e) { /* 오디오를 못 만들면 영상만 재생 */ }
    return S.audio;
  }
  function activeAudio(t) {
    if (!S.project) return null;
    const list = S.project.tracks.audio.clips.filter((c) => t >= c.start - 1e-9 && t < c.start + c.dur);
    return list.length ? list[list.length - 1] : null;
  }
  function audioGainAt(c, t) {
    if (!c) return 0;
    const lt = t - c.start, k = 1;
    let g = c.volume == null ? 0.6 : c.volume;
    const fi = c.fadeIn || 0, fo = c.fadeOut || 0;
    if (fi > 0 && lt < fi) g *= lt / fi;
    if (fo > 0 && c.dur - lt < fo) g *= Math.max(0, (c.dur - lt) / fo);
    return g * k;
  }
  function syncAudio(t) {
    if (!S.project) return;
    const c = activeAudio(t);
    if (!c) { if (!bgmEl.paused) bgmEl.pause(); return; }
    if (S.audio.curSrc !== c.src) {
      S.audio.curSrc = c.src; bgmEl.src = c.src; bgmEl.load();
    }
    const a = ensureAudio();
    if (a.gain) a.gain.gain.value = audioGainAt(c, t);
    const want = (c.in || 0) + (t - c.start);
    if (Math.abs(bgmEl.currentTime - want) > (S.playing ? 0.45 : 0.08)) {
      try { bgmEl.currentTime = Math.max(0, want); } catch (_) { /* noop */ }
    }
    if (S.playing) { if (bgmEl.paused) bgmEl.play().catch(() => {}); }
    else if (!bgmEl.paused) bgmEl.pause();
  }

  function play() {
    const d = dur();
    if (!d) { toast('먼저 미디어를 넣어 주세요'); return; }
    if (S.playhead >= d - 0.02) S.playhead = 0;
    ensureAudio();
    if (S.audio.ctx && S.audio.ctx.state === 'suspended') S.audio.ctx.resume().catch(() => {});
    S.playing = true;
    $('#btnPlay').textContent = '❚❚';
    S.t0 = performance.now() - S.playhead * 1000;
    syncVideos(S.playhead, true);
    syncAudio(S.playhead);
    if (bgmEl.paused) bgmEl.play().catch(() => {});
    cancelAnimationFrame(S.raf);
    const tick = () => {
      if (!S.playing) return;
      const t = (performance.now() - S.t0) / 1000;
      if (t >= dur()) { setPlayhead(dur()); stopPlayback(); return; }
      setPlayhead(t, true);
      syncVideos(t);
      syncAudio(t);
      draw();
      S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }
  function stopPlayback() {
    S.playing = false;
    $('#btnPlay').textContent = '▶';
    cancelAnimationFrame(S.raf);
    if (!bgmEl.paused) bgmEl.pause();
    syncVideos(S.playhead, false);
    draw();
  }
  function togglePlay() { if (S.playing) stopPlayback(); else play(); }

  function alignToPlayhead() {
    // 재생 위치가 보이도록 타임라인 스크롤을 맞춘다
    const sc = $('#tlScroll'); if (!sc) return;
    const x = S.playhead * S.pxPerSec;
    if (x < sc.scrollLeft + 20 || x > sc.scrollLeft + sc.clientWidth - 40) sc.scrollLeft = Math.max(0, x - sc.clientWidth * 0.35);
  }

  /* ================= 파일 업로드 ================= */
  function readFiles(files) {
    const arr = Array.from(files || []).filter((f) => /^(image|video)\//.test(f.type));
    if (!arr.length) return Promise.resolve([]);
    return Promise.all(arr.map((f) => new Promise((resolve) => {
      const url = URL.createObjectURL(f);
      if (/^video\//.test(f.type)) {
        const v = document.createElement('video');
        v.preload = 'auto'; v.muted = true; v.playsInline = true; v.src = url;
        const done = () => {
          const dur0 = isFinite(v.duration) ? v.duration : 0;
          const thumb = thumbFromVideo(v);
          resolve({ id: SC.uid('m'), name: f.name.replace(/\.[^.]+$/, ''), type: 'video', el: v, w: v.videoWidth, h: v.videoHeight, dur: dur0, thumb: thumb, size: f.size });
        };
        v.addEventListener('loadeddata', () => { try { v.currentTime = Math.min(0.2, (v.duration || 1) / 3); } catch (_) { } });
        v.addEventListener('seeked', done, { once: true });
        setTimeout(() => { if (!v.dataset.done) { v.dataset.done = '1'; v.readyState >= 2 ? done() : resolve(null); } }, 4000);
        v.addEventListener('error', () => resolve(null), { once: true });
      } else {
        const img = new Image();
        img.onload = () => resolve({ id: SC.uid('m'), name: f.name.replace(/\.[^.]+$/, ''), type: 'image', el: img, w: img.naturalWidth, h: img.naturalHeight, dur: 0, thumb: thumbFromImage(img), size: f.size });
        img.onerror = () => resolve(null);
        img.src = url;
      }
    }))).then((list) => list.filter(Boolean));
  }
  function thumbFromImage(img) {
    const c = SC.mk(180, 180), x = c.getContext('2d'), s = Math.max(180 / img.width, 180 / img.height);
    x.drawImage(img, (180 - img.width * s) / 2, (180 - img.height * s) / 2, img.width * s, img.height * s);
    return c.toDataURL('image/jpeg', 0.72);
  }
  function thumbFromVideo(v) {
    const c = SC.mk(180, 180), x = c.getContext('2d');
    try {
      const s = Math.max(180 / (v.videoWidth || 1), 180 / (v.videoHeight || 1));
      x.drawImage(v, (180 - v.videoWidth * s) / 2, (180 - v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s);
      return c.toDataURL('image/jpeg', 0.7);
    } catch (_) { return ''; }
  }
  async function addFiles(files) {
    const list = await readFiles(files);
    if (!list.length) { toast('사진·영상 파일만 올릴 수 있어요'); return; }
    S.media = S.media.concat(list);
    if (S.project) S.project.media = S.media;
    renderMedia();
    toast(list.length + '개를 올렸어요 · 미디어를 눌러 타임라인에 넣으세요');
  }

  /* ================= 타임라인 ================= */
  function trackClips(track) { return S.project ? S.project.tracks[track].clips : []; }
  function timelineDuration() { return Math.max(dur() + 2, 10); }

  function clipEl(track, c) {
    const px = S.pxPerSec;
    const el = document.createElement('div');
    const kind = track === 'video' ? 'v' : track === 'text' ? 't' : 'a';
    el.className = 'clip ' + kind + (S.sel && S.sel.track === track && S.sel.id === c.id ? ' sel' : '');
    el.dataset.track = track; el.dataset.id = c.id;
    el.style.left = (c.start * px) + 'px';
    el.style.width = Math.max(8, c.dur * px) + 'px';
    if (track === 'video') {
      const m = mediaOf(c.mediaId);
      if (m && m.thumb) { const im = document.createElement('img'); im.src = m.thumb; im.alt = ''; el.appendChild(im); }
      const lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = (c.label || (m && m.name) || '영상'); el.appendChild(lb);
      const d = document.createElement('div'); d.className = 'dur'; d.textContent = c.dur.toFixed(1) + 's'; el.appendChild(d);
    } else if (track === 'text') {
      const lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = (c.text || '').replace(/\*/g, '').slice(0, 26) || '자막'; el.appendChild(lb);
    } else {
      const lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = '음악 · ' + (c.name || 'BGM'); el.appendChild(lb);
    }
    const hl = document.createElement('div'); hl.className = 'h l'; el.appendChild(hl);
    const hr = document.createElement('div'); hr.className = 'h r'; el.appendChild(hr);
    return el;
  }

  function renderTimeline() {
    if (!S.project) return;
    const px = S.pxPerSec, total = timelineDuration();
    const width = total * px + 260;
    const ruler = $('#ruler'), tracks = $('#tracks');
    ruler.style.width = width + 'px';
    tracks.style.width = width + 'px';
    tracks.style.height = '170px';

    const step = px >= 90 ? 1 : px >= 45 ? 2 : px >= 22 ? 5 : 10;
    let html = '';
    for (let s = 0; s <= total; s += step) {
      html += '<div class="tick" style="left:' + (s * px) + 'px">' + SC.fmt(s) + '</div>';
    }
    html += '<div class="tick" style="left:' + (total * px) + 'px"></div>';
    ruler.innerHTML = html;

    const rows = [
      { k: 'video', cls: 't-video', h: 64, empty: '사진·영상을 끌어다 놓거나 미디어를 눌러 넣으세요' },
      { k: 'text', cls: 't-text', h: 48, empty: '자막 클립이 이 줄에 놓여요' },
      { k: 'audio', cls: 't-audio', h: 46, empty: '배경음악이 이 줄에 놓여요' }
    ];
    tracks.innerHTML = rows.map((r) => {
      const clips = trackClips(r.k);
      const el = document.createElement('div');
      el.className = 'track ' + r.cls;
      el.style.height = r.h + 'px';
      el.dataset.track = r.k;
      const lane = document.createElement('div'); lane.className = 'lane';
      if (!clips.length) lane.dataset.empty = r.empty;
      clips.forEach((c) => lane.appendChild(clipEl(r.k, c)));
      el.appendChild(lane);
      return el;
    }).reduce((acc, el) => acc + el.outerHTML, '');

    // heads
    $('#tlHeads').innerHTML =
      '<div class="h">TIME</div>' +
      '<div class="tl-head" style="height:64px"><i style="background:#8b8ba8"></i>영상·사진</div>' +
      '<div class="tl-head" style="height:48px"><i style="background:#34d399"></i>자막</div>' +
      '<div class="tl-head" style="height:46px"><i style="background:#c4b5fd"></i>음악</div>';

    const ph = $('#playhead');
    ph.style.left = (S.playhead * px) + 'px';
    $('#tlInfo').textContent = trackClips('video').length + '컷 · 자막 ' + trackClips('text').length + '개 · ' + SC.fmt(dur());
  }

  /* 드래그·트림 */
  function snapTime(t, ignore) {
    let best = t, bd = 8 / S.pxPerSec;
    for (const key of ['video', 'text', 'audio']) for (const c of trackClips(key)) {
      if (ignore && c.id === ignore.id && key === ignore.track) continue;
      for (const e of [c.start, c.start + c.dur]) {
        if (Math.abs(e - t) < bd) { bd = Math.abs(e - t); best = e; }
      }
    }
    if (Math.abs(S.playhead - t) < bd) best = S.playhead;
    return Math.round(best * 20) / 20;
  }

  function initTimelineEvents() {
    const tracks = $('#tracks');
    let drag = null;

    tracks.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.clip');
      if (!el) {
        S.sel = null; renderTimeline(); renderInspector(); draw(); return;
      }
      const track = el.dataset.track, id = el.dataset.id, c = clipOf(track, id);
      if (!c) return;
      S.sel = { track: track, id: id };
      renderTimeline(); renderInspector();
      const el2 = document.querySelector('.clip[data-id="' + id + '"]');
      const handle = e.target.classList.contains('h') ? (e.target.classList.contains('l') ? 'l' : 'r') : 'move';
      const snap = snapshot();
      drag = { track: track, clip: c, el: el2 || el, handle: handle, x0: e.clientX, orig: { start: c.start, dur: c.dur, in: c.in || 0 }, snap: snap, moved: false };
      try { (el2 || el).setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dt = (e.clientX - drag.x0) / S.pxPerSec;
      const c = drag.clip;
      if (Math.abs(dt) > 0.002) drag.moved = true;
      if (drag.handle === 'move') {
        c.start = Math.max(0, snapTime(drag.orig.start + dt, { id: c.id, track: drag.track }));
      } else if (drag.handle === 'l') {
        const maxStart = drag.orig.start + drag.orig.dur - 0.3;
        let ns = clamp(snapTime(drag.orig.start + dt, { id: c.id, track: drag.track }), 0, maxStart);
        const delta = ns - drag.orig.start;
        c.start = +ns.toFixed(2);
        c.dur = +(drag.orig.dur - delta).toFixed(2);
        if (drag.track === 'video' || drag.track === 'audio') {
          const m = drag.track === 'video' ? mediaOf(c.mediaId) : null;
          const sp = c.speed || 1;
          c.in = Math.max(0, (drag.orig.in || 0) + delta * sp);
          if (m && m.type === 'video' && m.dur) c.in = Math.min(c.in, Math.max(0, m.dur - c.dur * sp));
        }
      } else {
        let nd = Math.max(0.3, drag.orig.dur + dt);
        if (drag.track === 'video') {
          const m = mediaOf(c.mediaId);
          if (m && m.type === 'video' && m.dur) nd = Math.min(nd, Math.max(0.3, (m.dur - (c.in || 0)) / (c.speed || 1)));
        }
        c.dur = +Math.min(600, nd).toFixed(2);
      }
      if (drag.el) {
        drag.el.style.left = (c.start * S.pxPerSec) + 'px';
        drag.el.style.width = Math.max(8, c.dur * S.pxPerSec) + 'px';
        const d = drag.el.querySelector('.dur'); if (d) d.textContent = c.dur.toFixed(1) + 's';
      }
      draw(); updateTransport();
    });

    window.addEventListener('pointerup', () => {
      if (!drag) return;
      if (drag.moved) { pushUndo(drag.snap); }
      drag = null;
      renderTimeline(); renderInspector(); draw();
    });

    // 재생 위치: 눈금·빈 곳 클릭
    const seekFromEvent = (e) => {
      const sc = $('#tlScroll');
      const rect = sc.getBoundingClientRect();
      const x = e.clientX - rect.left + sc.scrollLeft;
      setPlayhead(x / S.pxPerSec, true);
      dragPlay = true;
      draw();
    };
    let dragPlay = false;
    $('#ruler').addEventListener('pointerdown', (e) => { seekFromEvent(e); try { e.target.setPointerCapture(e.pointerId); } catch (_) {} });
    window.addEventListener('pointermove', (e) => { if (dragPlay) seekFromEvent(e); });
    window.addEventListener('pointerup', () => { dragPlay = false; });

    // 더블클릭: 자막 텍스트 편집으로
    tracks.addEventListener('dblclick', (e) => {
      const el = e.target.closest('.clip');
      if (!el) return;
      if (el.dataset.track === 'text') { S.sel = { track: 'text', id: el.dataset.id }; renderInspector(); const t = $('#inspector textarea'); if (t) t.focus(); }
    });
  }



  /* ================= 선택 ================= */
  function select(track, id) {
    S.sel = { track: track, id: id };
    renderTimeline(); renderInspector(); draw();
    const c = clipOf(track, id); if (c && !S.playing) setPlayhead(Math.max(c.start, Math.min(S.playhead, c.start + c.dur - 0.01)), true);
  }

  function addMediaClip(m) {
    if (!S.project) applyProject(emptyProject('9:16', S.media));
    let start = S.playhead;
    // 겹치면 뒤로 밀기
    let guard = 0;
    while (guard++ < 30) {
      const hit = S.project.tracks.video.clips.some((c) => start < c.start + c.dur - 0.01 && start + (m.type === 'video' ? Math.min(m.dur, 4) : 3) > c.start + 0.01);
      if (!hit) break;
      start = Math.max.apply(null, S.project.tracks.video.clips.map((c) => c.start + c.dur));
    }
    const d0 = m.type === 'video' ? Math.min(Math.max(m.dur, 1.2), 5) : 3;
    const clip = {
      id: SC.uid('v'), mediaId: m.id, start: +start.toFixed(2), dur: +d0.toFixed(2), in: 0, speed: 1,
      fit: 'cover', zoom: 1, px: 0, py: 0, motion: 'in', look: 'natural',
      bright: 0, contrast: 0, sat: 0, warm: 0, vig: 0, grain: 0, blur: 0,
      transition: S.project.tracks.video.clips.length ? 'fade' : 'none', transDur: 0.45, volume: 0, letterbox: false, label: m.name
    };
    pushUndo();
    S.project.tracks.video.clips.push(clip);
    S.project.tracks.video.clips.sort((a, b) => a.start - b.start);
    select('video', clip.id);
    updateTransport();
  }

  function addTextClip() {
    if (!S.project) applyProject(emptyProject('9:16', S.media));
    const tpl = SC.tplById(S.project.template || 'signature');
    const st = tpl.text || SC.TEXT_PRESETS[0].style;
    const start = S.playhead;
    const c = Object.assign({ id: SC.uid('t'), text: '여기에 자막을 써 보세요', start: +start.toFixed(2), dur: 3, x: 0.5, y: 0.5, align: 'center', maxLines: 3, maxW: 1, scale: 1, anim: 'fade' }, st);
    pushUndo();
    S.project.tracks.text.clips.push(c);
    select('text', c.id);
    updateTransport();
    const ta = $('#inspector textarea'); if (ta) { ta.focus(); ta.select(); }
  }

  function currentBgmClip() { return S.project ? S.project.tracks.audio.clips[0] : null; }

  function splitAtPlayhead() {
    const c = selClip();
    if (!c) { toast('먼저 자를 클립을 골라 주세요'); return; }
    const t = S.playhead;
    const left = t - c.start, right = c.start + c.dur - t;
    if (left < 0.25 || right < 0.25) { toast('재생 위치를 클립 안쪽으로 옮겨 주세요'); return; }
    const track = S.sel.track;
    pushUndo();
    const clone = JSON.parse(JSON.stringify(c));
    clone.id = SC.uid(track === 'video' ? 'v' : track === 'text' ? 't' : 'a');
    clone.start = +t.toFixed(2); clone.dur = +right.toFixed(2);
    if (track === 'video') clone.in = +((c.in || 0) + left * (c.speed || 1)).toFixed(3);
    if (track === 'audio') clone.in = +((c.in || 0) + left).toFixed(2);
    c.dur = +left.toFixed(2);
    S.project.tracks[track].clips.push(clone);
    S.project.tracks[track].clips.sort((a, b) => a.start - b.start);
    S.sel = { track: track, id: clone.id };
    renderTimeline(); renderInspector(); draw(); updateTransport();
    toast('재생 위치에서 분할했어요');
  }
  function duplicateSel() {
    const c = selClip(); if (!c) return;
    pushUndo();
    const clone = JSON.parse(JSON.stringify(c));
    clone.id = SC.uid(S.sel.track[0]);
    clone.start = +(c.start + c.dur).toFixed(2);
    S.project.tracks[S.sel.track].clips.push(clone);
    S.project.tracks[S.sel.track].clips.sort((a, b) => a.start - b.start);
    S.sel = { track: S.sel.track, id: clone.id };
    renderTimeline(); renderInspector(); draw(); updateTransport();
  }
  function deleteSel() {
    if (!S.sel) return;
    pushUndo();
    const arr = S.project.tracks[S.sel.track].clips;
    const i = arr.findIndex((c) => c.id === S.sel.id);
    if (i >= 0) arr.splice(i, 1);
    S.sel = null;
    renderTimeline(); renderInspector(); draw(); updateTransport();
  }

  /* ================= 왼쪽 패널 ================= */
  function renderMedia() {
    $('#mediaCount').textContent = S.media.filter((m) => !m.sample).length ? '내 파일 ' + S.media.filter((m) => !m.sample).length + '개' : '';
    const own = S.media.filter((m) => !m.sample);
    const samples = S.media.filter((m) => m.sample);
    const grid = $('#mediaGrid');
    const items = own.concat(samples);
    grid.innerHTML = items.length ? '' : '<div class="empty">아직 올린 파일이 없어요. 위에 끌어다 놓거나 샘플로 시작해 보세요.</div>';
    items.forEach((m) => {
      const d = document.createElement('div');
      d.className = 'mitem'; d.dataset.id = m.id;
      d.title = m.name + ' · ' + Math.round(m.w) + '×' + Math.round(m.h) + (m.type === 'video' ? ' · ' + m.dur.toFixed(1) + '초' : '');
      const tag = m.type === 'video' ? '영상' : m.sample === 'lecture' ? '강의' : m.sample === 'vlog' ? '브이로그' : m.sample === 'product' ? '전자책' : '사진';
      d.innerHTML = '<img alt="" src="' + (m.thumb || '') + '"><span class="tag">' + tag + '</span><span class="add">＋</span>';
      d.addEventListener('click', () => addMediaClip(m));
      grid.appendChild(d);
    });

    const sl = $('#sampleList');
    sl.innerHTML = '';
    const map = { lecture: '민경 님 시그니처', vlog: 'Edits 감성 심플', product: '캡컷 다이나믹' };
    SC.SAMPLES.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'sample'; b.dataset.key = s.key;
      b.innerHTML = '<span class="th" style="background-image:url(' + s.thumb + ')"></span><span class="tt"><b>' + s.name + '</b><span>' + s.desc + ' · ' + map[s.key] + '</span></span>';
      b.addEventListener('click', () => applySample(s.key));
      sl.appendChild(b);
    });
  }

  function applySample(key) {
    const tplId = key === 'lecture' ? 'signature' : key === 'vlog' ? 'edits' : 'capcut';
    const media = S.media.filter((m) => m.sample === key);
    const tpl = SC.tplById(tplId);
    const o = Object.assign(SC.defaultsFor(key), { sampleKey: key });
    applyTemplate(tpl, media, o);
    $$('.sample').forEach((x) => x.classList.toggle('on', x.dataset.key === key));
    toast(SC.SAMPLES.find((s) => s.key === key).name + ' 샘플로 만들었어요 · ▶ 재생');
  }

  function renderTemplates(box, sub) {
    const host = box || $('#tplGrid');
    host.innerHTML = '';
    SC.TEMPLATES.forEach((t) => {
      const b = document.createElement('button');
      b.className = 'tplcard' + (S.tplSel === t.id ? ' on' : '');
      b.dataset.id = t.id;
      const g1 = t.accent, g2 = t.accent2;
      const swatch = t.text.bg === 'pill'
        ? '<span class="type" style="font-family:\'Gowun Dodum\',sans-serif;color:' + t.text.color + ';background:' + t.text.bgColor + ';border-radius:99px;padding:2px 10px;font-size:12px">가나다 Aa</span>'
        : '<span class="type" style="font-family:\'' + (t.text.font || 'sans-serif') + '\',serif;font-weight:' + (t.text.weight || 400) + ';color:' + (t.text.color || '#fff') + '">' + (t.id === 'signature' ? '[가나다]' : '가나다 Aa') + '</span>';
      b.innerHTML =
        '<div class="prev" style="background:linear-gradient(120deg,' + g1 + ',' + g2 + ')">' +
        swatch +
        '<span class="badge">' + t.tag + '</span></div>' +
        '<div class="body"><b>' + t.name + '</b><span>' + t.desc + '</span></div>';
      b.addEventListener('click', () => {
        S.tplSel = t.id;
        $$('.tplcard').forEach((x) => x.classList.toggle('on', x.dataset.id === t.id));
        if (sub) return;
        const pool = currentMediaPool();
        const o = Object.assign(SC.defaultsFor(pool[0] && pool[0].sample || 'mine'), { sampleKey: pool[0] && pool[0].sample });
        applyTemplate(t, pool, o);
        toast(t.name + ' 템플릿으로 만들었어요');
      });
      host.appendChild(b);
    });
  }

  function renderTextPresets() {
    const host = $('#textPresetGrid');
    host.innerHTML = '';
    SC.TEXT_PRESETS.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'tpreset'; b.dataset.key = p.key;
      b.innerHTML = '<span><b>' + p.name + '</b><em>' + p.hint + '</em></span><span class="sw" style="' + p.sw + '">가나다 Aa</span>';
      b.addEventListener('click', () => {
        const c = selClip();
        if (!c || S.sel.track !== 'text') { toast('자막 클립을 먼저 골라 주세요'); return; }
        pushUndo();
        Object.assign(c, p.style);
        renderInspector(); draw(); renderTimeline();
        toast(p.name + ' 스타일을 적용했어요');
      });
      host.appendChild(b);
    });
  }

  function renderLooks() {
    const host = $('#lookGrid');
    host.innerHTML = '';
    SC.LOOK_ORDER.forEach((key) => {
      const L = SC.LOOKS[key];
      const b = document.createElement('button');
      b.className = 'look'; b.dataset.look = key;
      b.innerHTML = '<i style="background:linear-gradient(135deg,' + L.sw[0] + ',' + L.sw[1] + ')"></i><b>' + L.n + '</b>';
      b.addEventListener('click', () => {
        const c = selClip();
        if (!c || S.sel.track !== 'video') { toast('영상 클립을 먼저 골라 주세요'); return; }
        pushUndo(); c.look = key; markLooks(); draw(); renderInspector();
      });
      host.appendChild(b);
    });
    markLooks();
  }
  function markLooks() {
    const c = selClip();
    $$('#lookGrid .look').forEach((b) => b.classList.toggle('on', c && S.sel.track === 'video' && c.look === b.dataset.look));
  }

  function renderBgm() {
    const host = $('#bgmList');
    host.innerHTML = '';
    SC.BGM.forEach((b, i) => {
      const d = document.createElement('button');
      d.className = 'bgm' + (S.bgmSel === i ? ' on' : '');
      d.innerHTML = '<span class="ico"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M9 18V6l10-2v10.5a2.5 2.5 0 1 1-2-2.45V7.4l-6 1.2V18a2.5 2.5 0 1 1-2-2.45z"/></svg></span><span><b>' + b.name + '</b><span>' + b.mood + '</span></span>';
      d.addEventListener('click', () => { S.bgmSel = i; S.audio.curSrc = ''; renderBgm(); previewBgm(b.file); });
      host.appendChild(d);
    });
  }
  function previewBgm(file) {
    if (!S.project) return;
    // 미리듣기: 3초 재생
    ensureAudio();
    S.audio.curSrc = file;
    bgmEl.src = file; bgmEl.currentTime = 0;
    if (S.audio.gain) S.audio.gain.gain.value = +$('#bgmVol').value;
    bgmEl.play().then(() => setTimeout(() => { if (!S.playing) bgmEl.pause(); }, 3000)).catch(() => toast('음악을 불러오지 못했어요(파일 경로 확인)'));
  }
  function addBgm() {
    if (!S.project) return;
    const b = SC.BGM[S.bgmSel];
    const total = Math.max(dur(), 4);
    pushUndo();
    S.project.tracks.audio.clips = [{ id: SC.uid('a'), src: b.file, name: b.name, start: 0, dur: +total.toFixed(2), volume: +$('#bgmVol').value, fadeIn: 0.5, fadeOut: 0.8 }];
    S.audio.curSrc = '';
    renderTimeline(); updateTransport();
    toast(b.name + ' 음악을 넣었어요');
  }

  /* ================= 인스펙터 ================= */
  const HEAD = (k, title, sub) => '<div class="ins-head"><h3>' + title + ' <span class="k">' + k + '</span></h3><p>' + sub + '</p></div>';
  function sl(label, prop, val, min, max, step, unit) {
    return '<div class="field"><label>' + label + ' <span data-v="' + prop + '">' + val + (unit || '') + '</span></label>' +
      '<input type="range" data-prop="' + prop + '" data-type="n" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"></div>';
  }
  function selx(label, prop, opts, val, type) {
    return '<div class="field"><label>' + label + '</label><select data-prop="' + prop + '" data-type="' + (type || 's') + '">' +
      opts.map((o) => '<option value="' + o[0] + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';
  }
  function seg(label, prop, opts, val) {
    return '<div class="field"><label>' + label + '</label><div class="seg" data-seg="' + prop + '">' +
      opts.map((o) => '<button type="button" data-val="' + o[0] + '" class="' + (String(val) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div></div>';
  }
  const TRANS = [['none', '없음'], ['fade', '페이드'], ['slide', '슬라이드'], ['zoom', '줌'], ['wipe', '와이프'], ['flash', '플래시'], ['dip', '암전'], ['circle', '원형'], ['blurzoom', '블러 줌'], ['whip', '휙']];
  const MOTION = [['none', '고정'], ['in', '천천히 다가가기'], ['out', '천천히 멀어지기'], ['left', '왼쪽으로'], ['right', '오른쪽으로'], ['up', '위로'], ['pulse', '두근두근']];

  function renderInspector() {
    const host = $('#inspector');
    if (!S.project) { host.innerHTML = '<div class="ins-empty">프로젝트를 불러오는 중…</div>'; return; }
    const c = selClip();
    if (!c) {
      host.innerHTML = HEAD('인스펙터', '무엇을 고를까요', '클립을 누르면 세밀한 설정이 열려요') +
        '<div class="ins-body"><div class="ins-empty"><b>타임라인에서 클립을 골라 주세요</b>영상은 색감·속도·전환, 자막은 폰트·위치·대괄호 강조를 바꿀 수 있어요.<br><br>' +
        '<span class="kbd">Space</span> 재생 · <span class="kbd">S</span> 분할 · <span class="kbd">Del</span> 삭제 · <span class="kbd">Ctrl+Z</span> 되돌리기</div>' +
        '<div class="ins-sec"><h4>프로젝트 <em>' + SC.esc(S.project.ratio) + '</em></h4>' +
        '<div class="field"><label>계정·상호 표시</label><input type="text" data-prop="brand" data-type="proj" maxlength="30" value="' + SC.esc(S.project.brand || '') + '"></div>' +
        '<p class="ins-note">프로젝트 전체 길이 ' + SC.fmt(dur()) + ' · 영상 ' + S.project.tracks.video.clips.length + '컷 · 자막 ' + S.project.tracks.text.clips.length + '개</p></div></div>';
      return;
    }
    if (S.sel.track === 'video') { host.innerHTML = videoInspector(c); return; }
    if (S.sel.track === 'text') { host.innerHTML = textInspector(c); return; }
    host.innerHTML = audioInspector(c);
  }

  function videoInspector(c) {
    const m = mediaOf(c.mediaId) || { name: '영상', dur: 4, type: 'image' };
    const fonts = '';
    return HEAD('영상', SC.esc(c.label || m.name || '영상'), Math.round(m.w || 0) + '×' + Math.round(m.h || 0) + ' · ' + (m.type === 'video' ? m.dur.toFixed(1) + '초 원본' : '사진')) +
      '<div class="ins-body">' +
      '<div class="ins-sec"><h4>길이·속도</h4>' +
      sl('이 클립 길이', 'dur', c.dur.toFixed(1), 0.3, Math.max(12, c.dur + 4), 0.1, '초') +
      sl('속도', 'speed', c.speed || 1, 0.5, 2, 0.1, '×') +
      (m.type === 'video' ? sl('시작 지점', 'in', +(c.in || 0).toFixed(1), 0, Math.max(0.1, (m.dur || 4) - 0.5), 0.1, '초') : '') +
      '<div class="row3"><button class="btn small" data-act="nudge" data-dir="-1">◀ 0.1초</button><button class="btn small" data-act="nudge" data-dir="1">0.1초 ▶</button><button class="btn small" data-act="dup">복제</button></div></div>' +
      '<div class="ins-sec"><h4>화면 맞춤</h4>' +
      seg('채우기', 'fit', [['cover', '꽉 채우기'], ['contain', '전체 보이기'], ['blur', '흐린 배경']], c.fit) +
      selx('움직임 (Ken Burns)', 'motion', MOTION, c.motion) +
      sl('확대', 'zoom', +(c.zoom || 1).toFixed(2), 1, 2.5, 0.02, '×') +
      '<div class="row2">' + sl('좌우', 'px', c.px || 0, -1, 1, 0.02) + sl('위아래', 'py', c.py || 0, -1, 1, 0.02) + '</div></div>' +
      '<div class="ins-sec"><h4>색감 <em>LUT ' + (SC.LOOKS[c.look] || SC.LOOKS.none).n + '</em></h4>' +
      '<div class="swatch">' + SC.LOOK_ORDER.map((k) => '<button class="btn small" data-act="look" data-val="' + k + '" style="' + (c.look === k ? 'border-color:#34d399;color:#6ee7b7' : '') + '">' + SC.LOOKS[k].n + '</button>').join('') + '</div>' +
      '<div style="height:8px"></div>' +
      sl('밝기', 'bright', c.bright || 0, -60, 60, 1) + sl('대비', 'contrast', c.contrast || 0, -60, 60, 1) +
      sl('채도', 'sat', c.sat || 0, -60, 60, 1) + sl('따뜻함', 'warm', c.warm || 0, -60, 60, 1) +
      '<div class="row2">' + sl('비네트', 'vig', c.vig || 0, 0, 100, 1) + sl('그레인', 'grain', c.grain || 0, 0, 100, 1) + '</div>' +
      sl('흐리게', 'blur', c.blur || 0, 0, 60, 1) +
      '<button class="btn small wide jade" data-act="apply-look">현재 필터를 모든 클립에 일괄 적용</button></div>' +
      '<div class="ins-sec"><h4>전환</h4>' +
      selx('이 클립으로 바뀔 때', 'transition', TRANS, c.transition || 'none') +
      sl('전환 시간', 'transDur', c.transDur == null ? 0.45 : c.transDur, 0.1, 1.2, 0.05, '초') +
      '<button class="btn small wide jade" data-act="apply-trans">현재 전환을 모든 클립에 일괄 적용</button>' +
      '<p class="ins-note">전환은 앞 클립과 붙어 있을 때만 보여요. 클립을 옆으로 붙이면 자동으로 이어져요.</p></div>' +
      '<div class="ins-sec"><h4>정리</h4><div class="row2"><button class="btn small" data-act="split">분할</button><button class="btn small danger" data-act="del">삭제</button></div></div>' +
      '</div>';
  }

  function textInspector(c) {
    const fontOpts = ['명조', '고딕', '둥근체', '제목', '손글씨'].map((g) => '<optgroup label="' + g + '">' +
      SC.FONTS.filter((f) => f.g === g).map((f) => '<option value="' + f.f + '"' + (c.font === f.f ? ' selected' : '') + '>' + f.n + '</option>').join('') + '</optgroup>').join('');
    const weights = (SC.FONT(c.font).w || [400, 700]);
    return HEAD('자막', '자막 편집', '강조할 말은 *별표*로 감싸면 민트색이 돼요') +
      '<div class="ins-body">' +
      '<div class="ins-sec"><h4>내용</h4><div class="field"><textarea data-prop="text" data-type="s" rows="3" maxlength="200">' + SC.esc(c.text) + '</textarea></div>' +
      '<div class="row2">' + sl('시작', 'start', +c.start.toFixed(1), 0, Math.max(10, dur()), 0.1, '초') + sl('길이', 'dur', +c.dur.toFixed(1), 0.4, 20, 0.1, '초') + '</div></div>' +
      '<div class="ins-sec"><h4>스타일 프리셋</h4><div class="tpresets">' + SC.TEXT_PRESETS.map((p) => '<button class="tpreset" data-act="preset" data-val="' + p.key + '"><span><b>' + p.name + '</b><em>' + p.hint + '</em></span><span class="sw" style="' + p.sw + '">가나다</span></button>').join('') + '</div></div>' +
      '<div class="ins-sec"><h4>글꼴</h4>' +
      '<div class="field"><label>폰트</label><select data-prop="font" data-type="font">' + fontOpts + '</select></div>' +
      '<div class="row2"><div class="field"><label>굵기</label><select data-prop="weight" data-type="n">' + weights.map((w) => '<option value="' + w + '"' + (c.weight === w ? ' selected' : '') + '>' + w + '</option>').join('') + '</select></div>' +
      sl('자간', 'ls', c.ls || 0, -5, 20, 0.5) + '</div>' +
      sl('크기', 'size', c.size || 54, 22, 140, 1) + '</div>' +
      '<div class="ins-sec"><h4>색·강조</h4>' +
      '<div class="row2"><div class="field"><label>글자색</label><input type="color" data-prop="color" data-type="s" value="' + (c.color || '#ffffff') + '"></div>' +
      '<div class="field"><label>강조색</label><input type="color" data-prop="accent" data-type="s" value="' + (c.accent || '#34d399') + '"></div></div>' +
      seg('대괄호 강조', 'bracket', [['none', '없음'], ['mint', '[민트]']], c.bracket || 'none') +
      '</div>' +
      '<div class="ins-sec"><h4>위치</h4>' +
      seg('자리', 'pos', [['top', '위'], ['mid', '가운데'], ['bottom', '아래']], c.y < 0.36 ? 'top' : c.y > 0.64 ? 'bottom' : 'mid') +
      sl('위아래', 'y', +c.y.toFixed(2), 0.05, 0.95, 0.01) + sl('좌우', 'x', +c.x.toFixed(2), 0.1, 0.9, 0.01) +
      sl('크기 배율', 'scale', +(c.scale || 1).toFixed(2), 0.6, 1.8, 0.02, '×') + '</div>' +
      '<div class="ins-sec"><h4>배경·테두리</h4>' +
      seg('배경', 'bg', [['none', '없음'], ['pill', '알약'], ['box', '박스'], ['band', '띠'], ['highlight', '형광펜']], c.bg || 'none') +
      '<div class="row2"><div class="field"><label>배경색</label><input type="color" data-prop="bgColor" data-type="s" value="' + (c.bgColor || '#000000') + '"></div>' +
      sl('배경 진하기', 'bgAlpha', c.bgAlpha == null ? 0.9 : c.bgAlpha, 0.1, 1, 0.05) + '</div>' +
      selx('그림자', 'shadow', [[0, '없음'], [1, '은은하게'], [2, '발광']], c.shadow || 0, 'n') +
      seg('외곽선', 'stroke', [[0, '없음'], [1, '있음']], c.stroke ? 1 : 0) + '</div>' +
      '<div class="ins-sec"><h4>움직임</h4>' +
      selx('등장', 'anim', [['none', '없음'], ['fade', '살며시'], ['rise', '아래에서'], ['punch', '쾅'], ['type', '타자기'], ['word', '단어 강조'], ['bounce', '통통'], ['glitch', '글리치']], c.anim || 'none') +
      '<div class="row3"><button class="btn small" data-act="nudge" data-dir="-1">◀</button><button class="btn small" data-act="nudge" data-dir="1">▶</button><button class="btn small" data-act="dup">복제</button></div></div>' +
      '<div class="ins-sec"><h4>모든 자막에</h4>' +
      '<button class="btn small wide jade" data-act="apply-text">현재 스타일 모든 자막에 일괄 적용</button>' +
      '<p class="ins-note">폰트·색·크기·배경·대괄호·움직임·자리가 ' + (S.project.tracks.text.clips.length) + '개 자막에 한 번에 적용돼요.</p></div>' +
      '<div class="ins-sec"><div class="row2"><button class="btn small" data-act="split">분할</button><button class="btn small danger" data-act="del">삭제</button></div></div>' +
      '</div>';
  }

  function audioInspector(c) {
    return HEAD('음악', SC.esc(c.name || '배경음악'), '상업용 무료(CC0) 음원 · 프로젝트 길이에 맞춰 잘려요') +
      '<div class="ins-body">' +
      '<div class="ins-sec">' + sl('볼륨', 'volume', +(c.volume == null ? 0.6 : c.volume).toFixed(2), 0, 1, 0.02) +
      sl('시작', 'start', +c.start.toFixed(1), 0, Math.max(10, dur()), 0.1, '초') +
      sl('길이', 'dur', +c.dur.toFixed(1), 0.5, 300, 0.1, '초') +
      '<div class="row2">' + sl('페이드 인', 'fadeIn', +(c.fadeIn || 0).toFixed(1), 0, 3, 0.1, '초') + sl('페이드 아웃', 'fadeOut', +(c.fadeOut || 0).toFixed(1), 0, 3, 0.1, '초') + '</div></div>' +
      '<div class="ins-sec"><div class="row2"><button class="btn small" data-act="split">분할</button><button class="btn small danger" data-act="del">삭제</button></div></div>' +
      '</div>';
  }

  function afterLocalEdit(prop) {
    if (S.sel && S.sel.track === 'text') {
      const c = selClip();
      const el = document.querySelector('.clip[data-id="' + c.id + '"] .lb');
      if (el) el.textContent = (c.text || '').replace(/\*/g, '').slice(0, 26) || '자막';
    }
    if (prop === 'dur' || prop === 'start' || prop === 'speed') renderTimeline();
    draw(); updateTransport();
  }

  function initInspectorEvents() {
    const host = $('#inspector');
    let editKey = null;
    host.addEventListener('pointerdown', (e) => {
      const t = e.target;
      if (t.matches('input,select,textarea') && t.type !== 'color') { S.editSnap = S.editSnap || snapshot(); }
    });
    host.addEventListener('focusin', (e) => {
      if (e.target.matches('textarea,input[type=text]')) S.editSnap = S.editSnap || snapshot();
    });

    host.addEventListener('input', (e) => {
      const t = e.target;
      const prop = t.dataset.prop; if (!prop) return;
      const type = t.dataset.type;
      const c = selClip();
      if (prop === 'brand') { S.project.brand = t.value; draw(); return; }
      if (!c) return;
      let v = t.value;
      if (type === 'n' || type === 'font') v = type === 'n' ? parseFloat(t.value) : t.value;
      else if (type === 'b') v = !!t.checked;
      c[prop] = v;
      if (S.editSnap) { pushUndo(S.editSnap); S.editSnap = null; }
      const label = host.querySelector('[data-v="' + prop + '"]');
      if (label) {
        const unit = /dur|start|transDur|fadeIn|fadeOut/.test(prop) ? '초' : prop === 'speed' || prop === 'zoom' || prop === 'scale' ? '×' : '';
        label.textContent = (type === 'n' && typeof v === 'number' ? (Math.abs(v) < 3 && prop !== 'bright' && prop !== 'contrast' && prop !== 'sat' && prop !== 'warm' && prop !== 'vig' && prop !== 'grain' && prop !== 'blur' && prop !== 'ls' ? v.toFixed(2) : Math.round(v)) : v) + unit;
      }
      if (prop === 'font') { renderInspector(); }
      afterLocalEdit(prop);
    });

    host.addEventListener('change', () => { S.editSnap = null; });

    host.addEventListener('click', (e) => {
      const segBtn = e.target.closest('.seg button[data-val]');
      if (segBtn) {
        const segEl = segBtn.closest('.seg');
        const prop = segEl.dataset.seg;
        const c = selClip();
        if (c && prop) {
          pushUndo();
          const v = segBtn.dataset.val;
          if (prop === 'pos') { c.y = v === 'top' ? 0.22 : v === 'bottom' ? 0.8 : 0.5; }
          else if (prop === 'stroke') { c.stroke = v === '1' ? 1 : 0; if (c.stroke && !c.strokeW) c.strokeW = 12; }
          else if (prop === 'bracket') { c.bracket = v; }
          else c[prop] = isNaN(+v) ? v : +v;
          renderInspector(); draw();
        }
        return;
      }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act, c = selClip();
      if (act === 'look' && c) { pushUndo(); c.look = b.dataset.val; draw(); renderInspector(); markLooks(); return; }
      if (act === 'preset' && c) { const p = SC.TEXT_PRESETS.find((x) => x.key === b.dataset.val); if (p) { pushUndo(); Object.assign(c, p.style); renderInspector(); draw(); } return; }
      if (act === 'apply-text') { applyTextStyleAll(); return; }
      if (act === 'apply-look') { applyFilterAll(); return; }
      if (act === 'apply-trans') { applyTransitionAll(); return; }
      if (act === 'split') { splitAtPlayhead(); return; }
      if (act === 'del') { deleteSel(); return; }
      if (act === 'dup') { duplicateSel(); return; }
      if (act === 'nudge' && c) { pushUndo(); c.start = Math.max(0, +(c.start + 0.1 * +b.dataset.dir).toFixed(2)); renderTimeline(); renderInspector(); draw(); updateTransport(); return; }
    });
  }

  /* 일괄 적용 */
  const TEXT_KEYS = ['font', 'weight', 'size', 'color', 'accent', 'bracket', 'bg', 'bgColor', 'bgAlpha', 'shadow', 'stroke', 'strokeW', 'strokeColor', 'ls', 'lh', 'align', 'anim', 'scale', 'maxLines'];
  const FILTER_KEYS = ['look', 'bright', 'contrast', 'sat', 'warm', 'vig', 'grain', 'blur'];
  function applyTextStyleAll() {
    const c = selClip();
    if (!c || S.sel.track !== 'text') { toast('자막 클립을 먼저 골라 주세요'); return; }
    pushUndo();
    const all = S.project.tracks.text.clips;
    all.forEach((t) => { if (t.id === c.id) return; TEXT_KEYS.forEach((k) => { if (c[k] !== undefined) t[k] = c[k]; }); });
    renderAll();
    toast('자막 ' + all.length + '개에 같은 스타일을 적용했어요');
  }
  function applyFilterAll() {
    const c = selClip();
    if (!c || S.sel.track !== 'video') { toast('영상 클립을 먼저 골라 주세요'); return; }
    pushUndo();
    const all = S.project.tracks.video.clips;
    all.forEach((v) => { if (v.id === c.id) return; FILTER_KEYS.forEach((k) => { v[k] = c[k]; }); });
    renderAll();
    toast('필터를 ' + all.length + '컷에 일괄 적용했어요');
  }
  function applyTransitionAll() {
    const c = selClip();
    if (!c || S.sel.track !== 'video') { toast('영상 클립을 먼저 골라 주세요'); return; }
    pushUndo();
    S.project.tracks.video.clips.forEach((v, i) => { if (i === 0) return; v.transition = c.transition; v.transDur = c.transDur; });
    renderAll();
    toast('전환을 모든 컷에 일괄 적용했어요');
  }

  /* ================= 상단·좌측 이벤트 ================= */
  function syncRatio() {
    if (!S.project) return;
    const r = S.project.ratio;
    $$('#ratioSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === r));
    $('#stageBadge').textContent = r + ' · ' + S.project.w + '×' + S.project.h;
    view.style.aspectRatio = S.project.w + ' / ' + S.project.h;
    view.width = S.project.w; view.height = S.project.h;
    view.style.width = '';
    view.style.height = '';
  }
  function setRatio(r) {
    if (!S.project) return;
    pushUndo();
    S.project.ratio = r;
    const [w, h] = SC.RATIOS[r];
    S.project.w = w; S.project.h = h;
    syncRatio(); renderTimeline(); renderInspector(); draw();
    toast(r + ' 화면으로 바꿨어요');
  }
  function updateTransport() {
    const d = dur();
    $('#timeText').textContent = SC.fmt(S.playhead) + ' / ' + SC.fmt(d);
    $('#seekBar').value = d ? Math.round(S.playhead / d * 1000) : 0;
    $('#tlInfo').textContent = (S.project ? S.project.tracks.video.clips.length : 0) + '컷 · 자막 ' + (S.project ? S.project.tracks.text.clips.length : 0) + '개 · ' + SC.fmt(d);
  }

  function renderAll() { renderMedia(); renderTemplates(); renderTextPresets(); renderLooks(); renderBgm(); renderTimeline(); renderInspector(); updateTransport(); draw(); }

  function initTop() {
    $('#ratioSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setRatio(b.dataset.v); });
    $('#btnUndo').addEventListener('click', undo);
    $('#btnRedo').addEventListener('click', redo);
    $('#btnTpl').addEventListener('click', () => { showTab('templates'); toast('템플릿을 누르면 지금 미디어로 바로 만들어져요'); });
    $('#btnWizard').addEventListener('click', openWizard);
    $('#btnExport').addEventListener('click', openExport);
    $('#btnPlay').addEventListener('click', togglePlay);
    $('#btnStop').addEventListener('click', () => { stopPlayback(); setPlayhead(0); draw(); });
    $('#seekBar').addEventListener('input', (e) => { stopPlayback(); setPlayhead(dur() * (+e.target.value / 1000), true); draw(); });
    $('#safeChk').addEventListener('change', draw);
    $('#brandChk').addEventListener('change', (e) => { if (S.project) { S.project.brandOn = e.target.checked; draw(); } });
    $('#btnSplit').addEventListener('click', splitAtPlayhead);
    $('#btnDup').addEventListener('click', duplicateSel);
    $('#btnDel').addEventListener('click', deleteSel);
    $('#tlZoom').addEventListener('input', (e) => { S.pxPerSec = +e.target.value; renderTimeline(); draw(); });
    $('#btnAddText').addEventListener('click', addTextClip);
    $('#btnApplyLookAll').addEventListener('click', applyFilterAll);
    $('#btnApplyTransAll').addEventListener('click', applyTransitionAll);
    $('#btnBgmAdd').addEventListener('click', addBgm);
    $('#btnBgmClear').addEventListener('click', () => { if (!S.project) return; pushUndo(); S.project.tracks.audio.clips = []; bgmEl.pause(); renderTimeline(); updateTransport(); toast('음악을 뺐어요'); });
    $('#bgmVol').addEventListener('input', (e) => { $('#bgmVolV').textContent = Math.round(e.target.value * 100) + '%'; const c = currentBgmClip(); if (c) c.volume = +e.target.value; if (S.audio.gain) S.audio.gain.gain.value = +e.target.value; });
    $('#bgmVolV').textContent = '60%';

    $('#leftTabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); });

    // 미디어 업로드
    const fi = $('#fileInput');
    fi.addEventListener('change', () => { addFiles(fi.files); fi.value = ''; });
    const dz = $('#dropZone');
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
    const stage = $('#stage');
    ['dragenter', 'dragover'].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.remove('drag'); }));
    stage.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });

    window.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.code === 'Space' && !typing) { e.preventDefault(); togglePlay(); return; }
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); splitAtPlayhead(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSel(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stopPlayback(); setPlayhead(S.playhead - (e.shiftKey ? 1 : 1 / 30), true); draw(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); stopPlayback(); setPlayhead(S.playhead + (e.shiftKey ? 1 : 1 / 30), true); draw(); }
    });

    window.addEventListener('resize', SC.debounce(() => { syncRatio(); renderTimeline(); draw(); }, 150));
  }

  function showTab(t) {
    S.tab = t;
    $$('#leftTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    $$('.pane').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== t));
  }

  /* ================= 마법사 ================= */
  function openWizard() {
    $('#wizard').classList.remove('hidden');
    renderTemplates($('#wizTpl'), true);
    const own = S.media.filter((m) => !m.sample);
    $('#wizMineCount').textContent = own.length ? own.length + '개 올림' : '올린 파일 없음';
    $$('#wizTpl .tplcard').forEach((el) => el.addEventListener('click', () => {
      S.tplSel = el.dataset.id; $$('#wizTpl .tplcard').forEach((x) => x.classList.toggle('on', x.dataset.id === el.dataset.id));
    }));
    const mine = $('#wizMedia input[value="mine"]');
    if (!own.length) { mine.checked = false; $('#wizMedia input[value="sample-lecture"]').checked = true; }
  }
  function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.add('hidden'); if (id === 'exportModal' && S.exporting && window.SC.Exporter.cancel) SC.Exporter.cancel(); }

  function wizardMedia() {
    const v = ($('#wizMedia input:checked') || {}).value || 'mine';
    if (v === 'sample-lecture') return { media: S.media.filter((m) => m.sample === 'lecture'), key: 'lecture' };
    if (v === 'sample-vlog') return { media: S.media.filter((m) => m.sample === 'vlog'), key: 'vlog' };
    if (v === 'sample-product') return { media: S.media.filter((m) => m.sample === 'product'), key: 'product' };
    if (v === 'file') return { media: S.media.filter((m) => !m.sample), key: 'mine', needFile: true };
    return { media: S.media.filter((m) => !m.sample), key: 'mine' };
  }
  async function goWizard() {
    const picked = wizardMedia();
    if (picked.needFile || (picked.key === 'mine' && !picked.media.length)) {
      toast('사진·영상을 먼저 올려 주세요'); showTab('media'); $('#fileInput').click(); return;
    }
    const tpl = SC.tplById(S.tplSel);
    const line = $('#wizLine').value.trim();
    const topic = $('#wizTopic').value.trim();
    const cta = $('#wizCta').value.trim();
    const o = Object.assign(SC.defaultsFor(picked.key), { line: line || undefined, topic: topic || undefined, cta: cta || undefined, sampleKey: picked.key });
    const p = SC.buildFromTemplate(tpl, picked.media, o);
    if (!p) { toast('미디어가 필요해요'); return; }
    applyProject(p, { templateId: tpl.id });
    closeModal('wizard');
    play();
    toast(tpl.name + ' 템플릿으로 완성! 마음에 안 드는 부분은 클릭해서 고치세요');
  }

  /* ================= 내보내기 ================= */
  function openExport() {
    if (!S.project || !S.project.tracks.video.clips.length) { toast('먼저 영상 컷을 만들어 주세요'); return; }
    S.exportOpts.ratio = S.project.ratio;
    $$('#expRatio button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.project.ratio));
    $('#expProg').classList.add('hidden'); $('#expDone').classList.add('hidden'); $('#expHint').classList.remove('hidden');
    $('#expVideo').removeAttribute('src');
    $('#exportModal').classList.remove('hidden');
  }
  async function startExport() {
    if (S.exporting) return;
    if (!SC.Exporter.supported()) { toast('이 브라우저는 영상 저장을 지원하지 않아요. 크롬·엣지에서 열어 주세요'); return; }
    stopPlayback();
    const ratio = S.exportOpts.ratio, quality = S.exportOpts.quality;
    const sound = $('#expSound').checked;
    if (ratio !== S.project.ratio) { setRatio(ratio); }
    const [W, H] = SC.RATIOS[ratio];
    const scale = quality / 1080;
    const ew = Math.round(W * scale / 2) * 2, eh = Math.round(H * scale / 2) * 2;
    const ec = SC.mk(ew, eh), ectx = ec.getContext('2d');
    const eproj = Object.assign({}, S.project, { w: ew, h: eh });
    const total = dur();
    S.exporting = true;
    $('#btnExpStart').disabled = true; $('#btnExpStart').textContent = '내보내는 중…';
    $('#expProg').classList.remove('hidden'); $('#expDone').classList.add('hidden'); $('#expHint').classList.add('hidden');
    $('#expBar').style.width = '0%'; $('#expPct').textContent = '0%'; $('#expStatus').textContent = '준비 중…';

    let audioStream = null;
    if (sound) {
      ensureAudio();
      if (S.audio.ctx && S.audio.ctx.state === 'suspended') { try { await S.audio.ctx.resume(); } catch (_) { /* noop */ } }
      audioStream = S.audio.dest ? S.audio.dest.stream : null;
      const a = activeAudio(0);
      if (a) {
        S.audio.curSrc = a.src; bgmEl.src = a.src;
        try { bgmEl.currentTime = a.in || 0; } catch (_) { /* noop */ }
        if (S.audio.gain) S.audio.gain.gain.value = audioGainAt(a, 0);
        bgmEl.play().catch(() => {});
      }
    }
    // 영상 요소를 미리 재생 대기
    S.playing = true;
    syncVideos(0, true);

    try {
      const res = await SC.Exporter.record({
        canvas: ec, audioStream: audioStream, duration: total, fps: 30,
        bitrate: quality >= 1080 ? 10000000 : 6000000,
        onFrame: (t) => {
          SC.Render.frame(ectx, eproj, Math.min(t, total - 0.001), { preview: false, playing: true });
          syncVideos(Math.min(t, total), true);
          syncAudioForExport(t);
        },
        onProgress: (p) => {
          const pc = Math.round(p * 100);
          $('#expBar').style.width = pc + '%'; $('#expPct').textContent = pc + '%';
          $('#expStatus').textContent = '녹화 중… ' + SC.fmt(p * total) + ' / ' + SC.fmt(total);
        }
      });
      S.exporting = false; S.playing = false;
      if (bgmEl && !bgmEl.paused) bgmEl.pause();
      syncVideos(0, false);
      $('#btnExpStart').disabled = false; $('#btnExpStart').textContent = '다시 내보내기';
      if (res && res.blob) {
        const url = URL.createObjectURL(res.blob);
        const v = $('#expVideo'); v.src = url; v.loop = true;
        $('#expDl').href = url;
        $('#expDl').download = 'ssongcut-pro-' + ratio.replace(':', 'x') + '-' + Date.now() + '.' + res.ext;
        $('#expDone').classList.remove('hidden');
        $('#expMeta').textContent = ew + '×' + eh + ' · ' + SC.fmt(res.duration) + ' · ' + SC.Exporter.sizeText(res.blob.size) + ' · ' + res.ext.toUpperCase();
        $('#expProg').classList.add('hidden');
        $('#expStatus').textContent = '완성!';
        window.__lastExport = { size: res.blob.size, mime: res.mime, duration: res.duration, w: ew, h: eh };
        toast('영상이 완성됐어요 · 파일 저장을 눌러 주세요');
      } else {
        $('#expStatus').textContent = '취소됐어요';
      }
    } catch (err) {
      S.exporting = false; S.playing = false;
      $('#btnExpStart').disabled = false; $('#btnExpStart').textContent = '내보내기 시작';
      $('#expStatus').textContent = '실패: ' + (err && err.message ? err.message : err);
      toast('내보내기에 실패했어요: ' + (err && err.message ? err.message : err));
    }
  }
  function syncAudioForExport(t) {
    const c = activeAudio(t);
    if (!c) { if (!bgmEl.paused) bgmEl.pause(); return; }
    if (S.audio.curSrc !== c.src) { S.audio.curSrc = c.src; bgmEl.src = c.src; bgmEl.load(); }
    const want = (c.in || 0) + (t - c.start);
    if (Math.abs(bgmEl.currentTime - want) > 0.35) { try { bgmEl.currentTime = Math.max(0, want); } catch (_) { /* noop */ } }
    if (S.audio.gain) S.audio.gain.gain.value = audioGainAt(c, t);
    if (bgmEl.paused) bgmEl.play().catch(() => {});
  }

  /* ================= 시작 ================= */
  function init() {
    SC.loadFonts();
    SC.ensureFont('Noto Serif KR', 600, '다함께 가나다');
    S.media = SC.makeSampleMedia();

    initTop();
    initTimelineEvents();
    initInspectorEvents();

    // 첫 화면: 샘플 강의로 채운 프로젝트
    const tpl = SC.tplById('signature');
    const media = S.media.filter((m) => m.sample === 'lecture');
    const p = SC.buildFromTemplate(tpl, media, Object.assign(SC.defaultsFor('lecture'), { sampleKey: 'lecture' }));
    applyProject(p, { templateId: 'signature' });
    $$('.sample').forEach((x) => x.classList.toggle('on', x.dataset.key === 'lecture'));
    syncRatio();
    setPlayhead(0.9);
    draw();

    $('#wizard').addEventListener('click', (e) => { if (e.target.id === 'wizard') closeModal('wizard'); });
    $('#exportModal').addEventListener('click', (e) => { if (e.target.id === 'exportModal') closeModal('exportModal'); });
    $$('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.close)));
    $('#btnWizGo').addEventListener('click', goWizard);
    $('#expRatio').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.exportOpts.ratio = b.dataset.v; $$('#expRatio button').forEach((x) => x.classList.toggle('on', x === b)); });
    $('#expQuality').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.exportOpts.quality = +b.dataset.v; $$('#expQuality button').forEach((x) => x.classList.toggle('on', x === b)); });
    $('#btnExpStart').addEventListener('click', startExport);
    $('#wizSrc') && $('#wizSrc').addEventListener('change', () => {});
    $$('#wizMedia input').forEach((r) => r.addEventListener('change', () => {
      if (r.value === 'file' && r.checked) { $('#fileInput').click(); setTimeout(() => { const own = S.media.filter((m) => !m.sample); if (own.length) { $('#wizMedia input[value="mine"]').checked = true; $('#wizMineCount').textContent = own.length + '개 올림'; } }, 1200); }
    }));

    // 글꼴이 늦게 와도 다시 그린다
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { draw(); });
    setTimeout(() => { try { syncRatio(); draw(); } catch (_) { /* noop */ } }, 400);
    window.addEventListener('beforeunload', () => { if (S.exporting) SC.Exporter.cancel && SC.Exporter.cancel(); });

    // QA·디버그용 읽기 전용 상태
    window.__scStatus = () => ({
      ratio: S.project && S.project.ratio,
      dur: +dur().toFixed(2),
      video: S.project.tracks.video.clips.length,
      text: S.project.tracks.text.clips.length,
      audio: S.project.tracks.audio.clips.length,
      sel: S.sel,
      playhead: +S.playhead.toFixed(2),
      errors: window.__scErrors.slice(),
      textClips: S.project.tracks.text.clips.map((c) => ({ id: c.id, start: c.start, dur: c.dur, font: c.font, color: c.color, size: c.size, bracket: c.bracket, text: c.text })),
      videoClips: S.project.tracks.video.clips.map((c) => ({ id: c.id, start: c.start, dur: c.dur, look: c.look, transition: c.transition, bright: c.bright }))
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
