/* 쏭컷 스튜디오 PRO — 공통 유틸·글꼴·색감 (studio.js의 검증된 조각을 타임라인 모델에 맞게 옮겨 왔다) */
(function () {
  'use strict';
  const SC = window.SC = window.SC || {};

  SC.$ = (s, r) => (r || document).querySelector(s);
  SC.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  SC.clamp = (x, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, x));
  SC.eOut = (x) => 1 - Math.pow(1 - SC.clamp(x), 3);
  SC.eInOut = (x) => { x = SC.clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  SC.eBack = (x) => { x = SC.clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  SC.spring = (x) => (x <= 0 ? 0 : 1 - Math.exp(-7 * x) * Math.cos(11 * x));
  SC.hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  SC.uid = (p) => (p || 'c') + Math.random().toString(36).slice(2, 8);
  SC.fmt = (s) => { s = Math.max(0, s || 0); const m = Math.floor(s / 60); return m + ':' + String(Math.floor(s - m * 60)).padStart(2, '0'); };
  SC.fmt2 = (s) => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  SC.mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  SC.rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  SC.debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments, self = this; t = setTimeout(() => fn.apply(self, a), ms || 120); }; };
  SC.esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  SC.RATIOS = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350] };

  /* ---------- 글꼴 ---------- */
  SC.FONTS = [
    { f: 'Noto Serif KR', n: '노토 세리프', g: '명조', w: [400, 600, 700] },
    { f: 'Nanum Myeongjo', n: '나눔명조', g: '명조', w: [400, 700, 800] },
    { f: 'Gowun Batang', n: '고운바탕', g: '명조', w: [400, 700] },
    { f: 'Pretendard Variable', n: '프리텐다드', g: '고딕', w: [400, 600, 800, 900], local: true },
    { f: 'Noto Sans KR', n: '노토 산스', g: '고딕', w: [400, 700, 900] },
    { f: 'Gowun Dodum', n: '고운돋움', g: '둥근체', w: [400] },
    { f: 'Jua', n: '주아', g: '둥근체', w: [400] },
    { f: 'Do Hyeon', n: '도현', g: '제목', w: [400] },
    { f: 'Black Han Sans', n: '검은고딕', g: '제목', w: [400] },
    { f: 'Nanum Pen Script', n: '나눔 펜글씨', g: '손글씨', w: [400] }
  ];
  SC.FONT = (f) => SC.FONTS.find((x) => x.f === f) || SC.FONTS[4];
  SC.fontStr = (f, weight, size) => weight + ' ' + size + 'px "' + f + '","Pretendard Variable","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
  let fontsLoaded = false;
  SC.loadFonts = function () {
    if (fontsLoaded) return; fontsLoaded = true;
    const fam = SC.FONTS.filter((x) => !x.local).map((x) => 'family=' + x.f.replace(/ /g, '+') + ':wght@' + x.w.join(';')).join('&');
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + fam + '&display=swap';
    l.onerror = () => { /* 오프라인이어도 시스템 글꼴로 그린다 */ };
    document.head.appendChild(l);
  };
  SC.ensureFont = async function (family, weight, sample) {
    try {
      if (!document.fonts || !document.fonts.load) return;
      await document.fonts.load(SC.fontStr(family, weight || 400, 48), sample || '가나다 ABC');
    } catch (_) { /* noop */ }
  };

  /* ---------- 색감(LUT) ---------- */
  SC.LOOKS = {
    none: { n: '원본', css: '', sw: ['#4a4a58', '#2a2a33'] },
    natural: { n: '내추럴', css: ' saturate(1.05)', sw: ['#9fc4b4', '#43665a'] },
    warm: { n: '따뜻한', css: ' sepia(.18) saturate(1.12) brightness(1.02)', sw: ['#f7c79c', '#b56c43'] },
    film: { n: '시네마', css: ' sepia(.24) contrast(.94) saturate(.86)', sw: ['#c8a077', '#3a2c22'] },
    cool: { n: '시원한', css: ' saturate(.96) brightness(1.02)', sw: ['#a6caea', '#2d4a63'] },
    vivid: { n: '선명한', css: ' contrast(1.08) saturate(1.24)', sw: ['#ff9d6b', '#c0345a'] },
    pastel: { n: '파스텔', css: ' brightness(1.07) contrast(.9) saturate(.84)', sw: ['#ffdbe8', '#bcd8ff'] },
    noir: { n: '모노', css: ' grayscale(1) contrast(1.14)', sw: ['#dedee6', '#2b2b34'] }
  };
  SC.LOOK_ORDER = ['none', 'natural', 'warm', 'film', 'cool', 'vivid', 'pastel', 'noir'];

  SC.filterCss = function (clip, k) {
    k = k || 1;
    let b = 1 + (clip.bright || 0) / 200;
    let c = 1 + (clip.contrast || 0) / 200;
    let s = 1 + (clip.sat || 0) / 100;
    let f = '';
    if (Math.abs(b - 1) > 0.004) f += ' brightness(' + b.toFixed(3) + ')';
    if (Math.abs(c - 1) > 0.004) f += ' contrast(' + c.toFixed(3) + ')';
    if (Math.abs(s - 1) > 0.004) f += ' saturate(' + Math.max(0, s).toFixed(3) + ')';
    f += (SC.LOOKS[clip.look] || SC.LOOKS.none).css;
    const blur = clip.blur || 0;
    if (blur > 0) f += ' blur(' + (blur / 100 * 20 * k).toFixed(1) + 'px)';
    return f.trim() || 'none';
  };

  /* ---------- 저장용 직렬화 ---------- */
  SC.serialize = function (project) {
    return JSON.stringify({
      name: project.name, ratio: project.ratio, template: project.template,
      clips: project.tracks.video.clips, texts: project.tracks.text.clips, audio: project.tracks.audio.clips,
      mediaIds: project.media.map((m) => ({ id: m.id, name: m.name, type: m.type, sample: m.sample || null }))
    });
  };
  SC.deserialize = function (json, media) {
    const d = JSON.parse(json);
    const byId = new Map(media.map((m) => [m.id, m]));
    const keep = (id) => byId.has(id);
    return {
      name: d.name, ratio: d.ratio, template: d.template,
      tracks: {
        video: { clips: (d.clips || []).filter((c) => keep(c.mediaId)) },
        text: { clips: d.texts || [] },
        audio: { clips: d.audio || [] }
      }
    };
  };

  SC.isMobile = () => window.matchMedia('(max-width: 860px)').matches;
})();
