/* 쏭컷 스튜디오 PRO — 템플릿 6종 + 원클릭 자동 생성 */
(function () {
  'use strict';
  const SC = window.SC;
  const uid = SC.uid;

  const BGM = 'audio/bgm/';
  SC.BGM = [
    { file: BGM + 'hopeful.mp3', name: '기분 좋은 시작', mood: '밝고 신나는 · Rafael Krux (CC0)' },
    { file: BGM + 'lovely-piano.mp3', name: '다정한 피아노', mood: '차분한 피아노 · Rafael Krux (CC0)' },
    { file: BGM + 'landras-dream.mp3', name: '포근한 기타 꿈', mood: '잔잔한 감성 · Rafael Krux (CC0)' },
    { file: BGM + 'happy-ukulele.mp3', name: '휘파람 산책', mood: '밝고 경쾌 · Rafael Krux (CC0)' },
    { file: BGM + 'cafe-ukulele.mp3', name: '카페 우쿨렐레', mood: '어쿠스틱 카페 · Rafael Krux (CC0)' },
    { file: BGM + 'heroic-adventure.mp3', name: '영웅의 모험', mood: '웅장한 시네마틱 · Rafael Krux (CC0)' }
  ];

  /* ---------- 템플릿 ---------- */
  SC.TEMPLATES = [
    {
      id: 'edits', name: 'Edits 감성 심플', tag: 'Edits', accent: '#c9b8a8', accent2: '#3a3530',
      desc: '미니멀 타이포 · 소프트 페이드 · 여백의 미학',
      ratio: '9:16', clipDur: 3.0, transition: 'fade', transDur: 0.5, look: 'pastel', fit: 'blur', motion: 'in',
      adjust: { bright: 3, contrast: -4, sat: -4, warm: 6, vig: 12, grain: 6 },
      text: { font: 'Noto Serif KR', weight: 400, size: 54, color: '#FFFDF8', accent: '#EDE3D4', bracket: 'none', bg: 'none', shadow: 1, stroke: 0, ls: 2, lh: 1.6 },
      bgm: BGM + 'lovely-piano.mp3',
      plan: [
        { role: 'hook', at: 0.12, len: 0.92, y: 0.34, size: 64, weight: 400, anim: 'fade' },
        { role: 'topic', at: 0.38, len: 0.94, y: 0.42, size: 46, weight: 400, anim: 'fade' },
        { role: 'line', at: 0.72, len: 0.9, y: 0.36, size: 44, weight: 400, anim: 'fade' }
      ]
    },
    {
      id: 'signature', name: '민경 님 시그니처', tag: '시그니처', accent: '#34d399', accent2: '#0b3b32',
      desc: '감성 명조 + 민트 대괄호 · 후킹 → 핵심 → CTA',
      ratio: '9:16', clipDur: 3.1, transition: 'zoom', transDur: 0.45, look: 'natural', fit: 'cover', motion: 'in',
      adjust: { bright: 2, contrast: 4, sat: 8, warm: 3, vig: 26, grain: 0 },
      text: { font: 'Noto Serif KR', weight: 600, size: 60, color: '#FFFDF7', accent: '#34D399', bracket: 'mint', bg: 'none', shadow: 1, stroke: 0, ls: 1, lh: 1.42 },
      bgm: BGM + 'hopeful.mp3',
      plan: [
        { role: 'hook', at: 0.1, len: 0.9, y: 0.26, size: 76, weight: 700, anim: 'rise' },
        { role: 'topic', at: 0.35, len: 0.9, y: 0.2, size: 52, weight: 600, anim: 'fade' },
        { role: 'core', at: 0.62, len: 0.86, y: 0.78, size: 54, weight: 600, anim: 'rise' },
        { role: 'cta', at: 0.87, len: 1.0, y: 0.5, size: 58, weight: 700, anim: 'punch' }
      ]
    },
    {
      id: 'vllo', name: '블로 데일리 파스텔', tag: 'VLLO', accent: '#ffd3e4', accent2: '#7b5a86', desc: '둥근 고딕 · 파스텔 말풍선 · 데일리',
      ratio: '9:16', clipDur: 2.8, transition: 'slide', transDur: 0.4, look: 'pastel', fit: 'blur', motion: 'in',
      adjust: { bright: 6, contrast: -6, sat: 4, warm: 4, vig: 10, grain: 0 },
      text: { font: 'Gowun Dodum', weight: 400, size: 52, color: '#4a3b52', accent: '#e26a9a', bracket: 'none', bg: 'pill', bgColor: '#FFE9F2', bgAlpha: 0.95, shadow: 0, stroke: 0, lh: 1.3 },
      bgm: BGM + 'happy-ukulele.mp3',
      plan: [
        { role: 'hook', at: 0.12, len: 0.9, y: 0.24, size: 58, weight: 400, anim: 'bounce' },
        { role: 'topic', at: 0.4, len: 0.9, y: 0.76, size: 50, weight: 400, anim: 'fade' },
        { role: 'line', at: 0.66, len: 0.9, y: 0.28, size: 48, weight: 400, anim: 'bounce' },
        { role: 'cta', at: 0.88, len: 1.0, y: 0.82, size: 46, weight: 400, anim: 'fade' }
      ]
    },
    {
      id: 'capcut', name: '캡컷 다이나믹 비트', tag: 'CapCut', accent: '#22d3ee', accent2: '#141423', desc: '빠른 컷 · 네온 볼드 자막 · 비트감',
      ratio: '9:16', clipDur: 1.8, transition: 'flash', transDur: 0.24, look: 'vivid', fit: 'cover', motion: 'pulse',
      adjust: { bright: 2, contrast: 12, sat: 14, warm: -4, vig: 34, grain: 0 },
      text: { font: 'Black Han Sans', weight: 400, size: 78, color: '#FFFFFF', accent: '#22D3EE', bracket: 'mint', bg: 'none', shadow: 2, stroke: 0, lh: 1.16 },
      bgm: BGM + 'heroic-adventure.mp3',
      plan: [
        { role: 'hook', at: 0.08, len: 0.86, y: 0.5, size: 92, weight: 400, anim: 'punch' },
        { role: 'core', at: 0.36, len: 0.8, y: 0.2, size: 66, weight: 400, anim: 'punch' },
        { role: 'line', at: 0.58, len: 0.8, y: 0.8, size: 60, weight: 400, anim: 'punch' },
        { role: 'cta', at: 0.78, len: 1.0, y: 0.5, size: 80, weight: 400, anim: 'punch' }
      ]
    },
    {
      id: 'premiere', name: '프리미어 시네마틱', tag: 'Premiere', accent: '#e0c08a', accent2: '#1a1712', desc: '레터박스 · 필름 색보정 · 하단 자막',
      ratio: '16:9', clipDur: 3.6, transition: 'dip', transDur: 0.6, look: 'film', fit: 'cover', motion: 'out', letterbox: true,
      adjust: { bright: -2, contrast: 8, sat: -6, warm: 6, vig: 38, grain: 22 },
      text: { font: 'Noto Serif KR', weight: 400, size: 40, color: '#F4EEE2', accent: '#E0C08A', bracket: 'none', bg: 'none', shadow: 1, stroke: 0, ls: 3, lh: 1.5 },
      bgm: BGM + 'heroic-adventure.mp3',
      plan: [
        { role: 'topic', at: 0.14, len: 0.9, y: 0.2, size: 46, weight: 400, anim: 'fade' },
        { role: 'hook', at: 0.42, len: 0.92, y: 0.86, size: 38, weight: 400, anim: 'fade' },
        { role: 'line', at: 0.72, len: 0.9, y: 0.86, size: 38, weight: 400, anim: 'fade' }
      ]
    },
    {
      id: 'brunch', name: '감성 브런치·에세이', tag: 'Brunch', accent: '#e8b98a', accent2: '#2a211b', desc: '세로 감성 자막 · 따뜻한 필름 그레인',
      ratio: '4:5', clipDur: 3.4, transition: 'fade', transDur: 0.7, look: 'warm', fit: 'blur', motion: 'out',
      adjust: { bright: 1, contrast: -2, sat: -2, warm: 12, vig: 20, grain: 16 },
      text: { font: 'Gowun Batang', weight: 400, size: 50, color: '#FFF7EC', accent: '#F6C79A', bracket: 'none', bg: 'none', shadow: 1, stroke: 0, ls: 1, lh: 1.6 },
      bgm: BGM + 'landras-dream.mp3',
      plan: [
        { role: 'hook', at: 0.14, len: 0.9, y: 0.3, size: 56, weight: 400, anim: 'rise' },
        { role: 'topic', at: 0.44, len: 0.9, y: 0.48, size: 46, weight: 400, anim: 'fade' },
        { role: 'line', at: 0.74, len: 0.9, y: 0.7, size: 44, weight: 400, anim: 'fade' }
      ]
    }
  ];
  SC.tplById = (id) => SC.TEMPLATES.find((t) => t.id === id) || SC.TEMPLATES[1];

  /* ---------- 자막 스타일 프리셋 6종 ---------- */
  SC.TEXT_PRESETS = [
    { key: 'serif', name: '감성 명조', hint: '얇고 정갈한 세리프 · 그림자', style: { font: 'Noto Serif KR', weight: 500, size: 58, color: '#FFFDF8', accent: '#EDE3D4', bracket: 'none', bg: 'none', shadow: 1, stroke: 0, ls: 1, lh: 1.5 }, sw: 'font-family:"Noto Serif KR",serif;color:#fffdf8' },
    { key: 'mint', name: '민트 대괄호', hint: '민트 [ ] 강조 · 시그니처', style: { font: 'Noto Serif KR', weight: 600, size: 60, color: '#FFFDF7', accent: '#34D399', bracket: 'mint', bg: 'none', shadow: 1, stroke: 0, ls: 1, lh: 1.42 }, sw: 'font-family:"Noto Serif KR",serif;color:#34d399' },
    { key: 'neon', name: '볼드 네온', hint: '두꺼운 제목 · 시안 발광', style: { font: 'Black Han Sans', weight: 400, size: 82, color: '#FFFFFF', accent: '#22D3EE', bracket: 'none', bg: 'none', shadow: 2, stroke: 0, lh: 1.16 }, sw: 'font-family:"Black Han Sans",sans-serif;color:#22d3ee' },
    { key: 'bubble', name: '파스텔 말풍선', hint: '둥근 고딕 · 핑크 알약', style: { font: 'Gowun Dodum', weight: 400, size: 50, color: '#4A3B52', accent: '#E26A9A', bracket: 'none', bg: 'pill', bgColor: '#FFE9F2', bgAlpha: 0.95, shadow: 0, stroke: 0, lh: 1.3 }, sw: 'font-family:"Gowun Dodum",sans-serif;background:#ffe9f2;color:#4a3b52' },
    { key: 'cinema', name: '시네마틱 하단', hint: '가로 화면 하단 자막', style: { font: 'Noto Serif KR', weight: 400, size: 40, color: '#F4EEE2', accent: '#E0C08A', bracket: 'none', bg: 'none', shadow: 1, stroke: 0, ls: 3, lh: 1.5 }, sw: 'font-family:"Noto Serif KR",serif;color:#f4eee2' },
    { key: 'brunch', name: '브런치 세로', hint: '따뜻한 바탕 · 넉넉한 행간', style: { font: 'Gowun Batang', weight: 400, size: 52, color: '#FFF7EC', accent: '#F6C79A', bracket: 'none', bg: 'none', shadow: 1, stroke: 0, ls: 1, lh: 1.62 }, sw: 'font-family:"Gowun Batang",serif;color:#fff7ec' }
  ];

  /* ---------- 기본 문구 ---------- */
  const DEFAULTS = {
    lecture: { line: '스마트폰 하나면 *충분했어요*', topic: '성수 시니어 스마트폰 수업', core: '천천히, 함께 하면 어렵지 않아요', cta: '자세한 건 프로필 링크에서' },
    vlog: { line: '오늘은 조금 느리게', topic: '노을 지는 잠원동', core: '기록해 두면 오래 남으니까', cta: '다음 주말에 또 만나요' },
    product: { line: '처음 시작하는 사람을 위한', topic: 'AI 프롬프트 50선', core: '그대로 따라 하면 되는 실습형', cta: '프로필 링크에서 만나요' },
    mine: { line: '오늘의 기록', topic: '나의 하루', core: '천천히, 오늘의 속도로', cta: '끝까지 봐 주셔서 고마워요' }
  };
  SC.defaultsFor = (key) => Object.assign({}, DEFAULTS[key] || DEFAULTS.mine);

  function shortTopic(t, n) {
    t = String(t || '').trim();
    if (!t) return '';
    return t.length > (n || 16) ? t.slice(0, n || 16) + '…' : t;
  }

  /* 템플릿별 자막 문구 만들기 */
  function makeCopy(tpl, o, sampleKey) {
    const line = (o.line || '').trim() || SC.defaultsFor(sampleKey).line;
    const topic = (o.topic || '').trim() || SC.defaultsFor(sampleKey).topic;
    const cta = (o.cta || '').trim() || SC.defaultsFor(sampleKey).cta;
    const core = (o.core || '').trim() || SC.defaultsFor(sampleKey).core;
    const T = (s) => s;
    const map = {
      edits: { hook: line, topic: shortTopic(topic, 22), line: T('천천히, 오늘의 속도로'), cta: cta },
      signature: { hook: line, topic: '[' + shortTopic(topic, 20) + ']', core: core, cta: cta },
      vllo: { hook: line, topic: shortTopic(topic, 18), line: T('오늘도 잘 했어요'), cta: cta },
      capcut: { hook: line, core: shortTopic(topic, 14).toUpperCase(), line: T('3초 안에 끝'), cta: cta },
      premiere: { topic: shortTopic(topic, 26), hook: line, line: core },
      brunch: { hook: line, topic: shortTopic(topic, 22), line: core }
    };
    return map[tpl.id] || map.signature;
  }

  /* ---------- 프로젝트 만들기 ---------- */
  SC.buildFromTemplate = function (tpl, media, o) {
    o = o || {};
    const [W, H] = SC.RATIOS[tpl.ratio || '9:16'];
    const list = (media || []).slice(0, o.maxClips || 6);
    if (!list.length) return null;
    const dur = tpl.clipDur || 3;
    const project = {
      name: (o.name || tpl.name + ' 프로젝트'),
      ratio: tpl.ratio || '9:16', w: W, h: H,
      template: tpl.id,
      brand: o.brand !== undefined ? o.brand : '@ssongliz',
      brandOn: true,
      media: o.allMedia || list.slice(),
      tracks: { video: { clips: [] }, text: { clips: [] }, audio: { clips: [] } }
    };
    const adj = tpl.adjust || {};
    list.forEach((m, i) => {
      project.tracks.video.clips.push({
        id: uid('v'), mediaId: m.id, start: +(i * dur).toFixed(2), dur: dur, in: 0, speed: 1,
        fit: tpl.fit || 'cover', zoom: tpl.id === 'capcut' ? 1.06 : 1, px: 0, py: 0,
        motion: tpl.motion || 'none', look: tpl.look || 'none',
        bright: adj.bright || 0, contrast: adj.contrast || 0, sat: adj.sat || 0, warm: adj.warm || 0,
        vig: adj.vig || 0, grain: adj.grain || 0, blur: 0,
        transition: i === 0 ? 'none' : (tpl.transition || 'fade'), transDur: tpl.transDur == null ? 0.45 : tpl.transDur,
        volume: 0, letterbox: !!tpl.letterbox, label: m.name
      });
    });

    const total = list.length * dur;
    const copy = makeCopy(tpl, o, o.sampleKey || (list[0] && list[0].sample) || 'mine');
    const n = list.length;
    tpl.plan.forEach((pl, i) => {
      const text = copy[pl.role] || copy.hook;
      if (!text) return;
      let start, len;
      if (pl.role === 'hook') { start = 0.15; len = Math.min(3.0, total * 0.9); }
      else if (pl.role === 'cta') { len = Math.min(3.2, total * 0.5); start = Math.max(0, total - len - 0.1); }
      else {
        const slot = total / Math.max(1, tpl.plan.length - 1);
        const idx = Math.min(n - 1, Math.max(0, Math.round(pl.at * n)));
        start = Math.min(total - 1.2, pl.at * total + 0.1);
        len = Math.min(pl.len * dur * 1.4, total - start - 0.05);
        start = +(idx * dur + 0.25).toFixed(2);
        len = Math.min(dur - 0.4, Math.max(1.4, len));
      }
      start = Math.max(0, Math.min(total - 0.6, start));
      len = Math.max(0.8, Math.min(len, total - start - 0.05));
      const style = Object.assign({}, tpl.text, {
        size: pl.size || tpl.text.size, weight: pl.weight || tpl.text.weight, anim: pl.anim || 'fade'
      });
      project.tracks.text.clips.push(Object.assign({
        id: uid('t'), text: text, start: +start.toFixed(2), dur: +len.toFixed(2),
        x: 0.5, y: pl.y, align: 'center', maxLines: 3, maxW: 1, scale: 1, role: pl.role
      }, style));
    });

    if (tpl.bgm) {
      project.tracks.audio.clips.push({ id: uid('a'), src: tpl.bgm, name: bgmName(tpl.bgm), start: 0, dur: +total.toFixed(2), volume: 0.55, fadeIn: 0.5, fadeOut: 0.8 });
    }
    return project;
  };

  function bgmName(src) { const b = SC.BGM.find((x) => x.file === src); return b ? b.name : '배경음악'; }
  SC.bgmName = bgmName;
})();
