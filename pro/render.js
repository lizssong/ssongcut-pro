/* 쏭컷 스튜디오 PRO — 캔버스 렌더러 (미디어·색감·자막 모션·전환)
   studio.js의 drawMedia/drawText/composite 검증 코드를 멀티트랙 타임라인용으로 옮기고 확장했다. */
(function () {
  'use strict';
  const SC = window.SC;
  const R = (SC.Render = {});
  const clamp = SC.clamp, eOut = SC.eOut, eInOut = SC.eInOut, eBack = SC.eBack, spring = SC.spring, hash = SC.hash;

  const bufCache = new Map();
  function bufs(w, h) {
    const k = w + 'x' + h;
    if (!bufCache.has(k)) bufCache.set(k, { a: SC.mk(w, h), b: SC.mk(w, h), bg: SC.mk(Math.ceil(w / 8), Math.ceil(h / 8)) });
    return bufCache.get(k);
  }

  const GRAIN = (function () {
    const c = SC.mk(200, 200), x = c.getContext('2d'), img = x.createImageData(200, 200);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.random() * 140;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 30;
    }
    x.putImageData(img, 0, 0); return c;
  })();

  R.mediaOf = (p, id) => p.media.find((m) => m.id === id) || null;

  /* ---------- 자막: 글자 배치 ---------- */
  function parseChars(text, bracket) {
    const chars = [];
    let acc = false;
    for (const ch of text) {
      if (ch === '*') {
        if (bracket && bracket !== 'none') chars.push({ ch: acc ? ']' : '[', acc: true });
        acc = !acc; continue;
      }
      chars.push({ ch: ch, acc: acc });
    }
    if (acc && bracket && bracket !== 'none') chars.push({ ch: ']', acc: true });
    return chars;
  }
  function wrapChars(ctx, chars, maxW) {
    const lines = []; let cur = [];
    const width = (a) => ctx.measureText(a.map((c) => c.ch).join('')).width;
    const push = () => { while (cur.length && cur[cur.length - 1].ch === ' ') cur.pop(); while (cur.length && cur[0].ch === ' ') cur.shift(); lines.push(cur); cur = []; };
    const toks = []; let tok = [];
    for (const c of chars) {
      if (c.ch === '\n') { if (tok.length) toks.push(tok); toks.push('\n'); tok = []; }
      else if (c.ch === ' ') { if (tok.length) toks.push(tok); toks.push([c]); tok = []; }
      else tok.push(c);
    }
    if (tok.length) toks.push(tok);
    for (const t of toks) {
      if (t === '\n') { push(); continue; }
      if (!cur.length || width(cur.concat(t)) <= maxW) cur = cur.concat(t);
      else { push(); if (t[0].ch !== ' ') cur = t.slice(); }
    }
    push();
    while (lines.length > 1 && !lines[lines.length - 1].length) lines.pop();
    return lines.map((cs) => { const xs = [0]; let s = ''; for (const c of cs) { s += c.ch; xs.push(ctx.measureText(s).width); } return { cs: cs, w: xs[cs.length] || 0, xs: xs }; });
  }
  function layout(ctx, L, k, maxW) {
    const chars = parseChars(L.text, L.bracket);
    let size = L.size * k, lines;
    for (let n = 0; n < 18; n++) {
      ctx.font = SC.fontStr(L.font, L.weight, size);
      try { ctx.letterSpacing = ((L.ls || 0) * size / 100).toFixed(2) + 'px'; } catch (_) { /* noop */ }
      lines = wrapChars(ctx, chars, maxW);
      if (lines.every((l) => l.w <= maxW + 1) && lines.length <= (L.maxLines || 4)) break;
      size *= 0.93;
    }
    try { ctx.letterSpacing = '0px'; } catch (_) { /* noop */ }
    return { size: size, lines: lines };
  }

  /* ---------- 자막: 그리기 ---------- */
  function drawTextClip(ctx, W, H, L, lt, dur, opt) {
    if (!L.text || !L.text.trim()) return;
    const k = Math.min(W, H) / 1080, tt = lt;
    if (tt < 0 || tt > dur + 1e-6) return;
    const A = L.anim || 'none';
    const maxW = (W - 150 * k) * (L.maxW || 1);
    ctx.save();
    const lay = layout(ctx, L, k, maxW);
    const size = lay.size, lh = size * (L.lh || 1.34), lines = lay.lines;
    const bh = Math.max(1, lines.length * lh);
    const bw = Math.max(1, ...lines.map((l) => l.w));
    const hasBox = L.bg && L.bg !== 'none';
    const padX = size * 0.36, padY = size * 0.2;
    const half = bw / 2 + (hasBox ? padX : 0);
    const cx = half * 2 > W - 40 * k ? W / 2 : clamp((L.x == null ? 0.5 : L.x) * W, half + 20 * k, W - half - 20 * k);
    const sc = L.scale || 1;
    const top = clamp((L.y == null ? 0.5 : L.y) * H - bh / 2, 20 * k + padY, Math.max(20 * k + padY, H - 20 * k - padY - bh));
    const lineX = (l) => (L.align === 'left' ? cx - bw / 2 : L.align === 'right' ? cx + bw / 2 - l.w : cx - l.w / 2);
    const box = { x: cx - bw / 2 - padX, y: top - padY, w: bw + padX * 2, h: bh + padY * 2 };
    L._bb = { x: box.x * sc, y: box.y * sc, w: box.w * sc, h: box.h * sc, f: opt && opt.frameNo };
    const exitFade = dur - tt < 0.24 ? clamp((dur - tt) / 0.24) : 1;

    ctx.globalAlpha *= exitFade;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    if (A === 'fade' || A === 'count') { const p = eOut(tt / 0.5); ctx.globalAlpha *= p; ctx.translate(0, (1 - p) * 24 * k); }
    else if (A === 'rise') { const p = eOut(tt / 0.55); ctx.globalAlpha *= p; ctx.translate(0, (1 - p) * 34 * k); }
    else if (A === 'slide') { const p = eOut(tt / 0.5); ctx.globalAlpha *= p; ctx.translate(-(1 - p) * W * 0.3, 0); }
    else if (A === 'punch') { const p = clamp(tt / 0.34), s = 1.35 - 0.35 * eBack(p); ctx.globalAlpha *= clamp(p * 5); ctx.translate(cx, top + bh / 2); ctx.scale(s, s); ctx.translate(-cx, -(top + bh / 2)); }
    if (sc !== 1) { ctx.translate(cx, top + bh / 2); ctx.scale(sc, sc); ctx.translate(-cx, -(top + bh / 2)); }

    /* 배경 */
    if (hasBox) {
      ctx.save();
      ctx.globalAlpha *= (L.bgAlpha == null ? 1 : L.bgAlpha);
      ctx.fillStyle = L.bgColor || '#000000';
      if (L.bg === 'band') ctx.fillRect(-W, top - padY * 1.9, W * 3, bh + padY * 3.8);
      else if (L.bg === 'box') { SC.rrect(ctx, box.x, box.y, box.w, box.h, size * 0.26); ctx.fill(); }
      else if (L.bg === 'pill') lines.forEach((l, i) => { if (!l.w) return; const x = lineX(l), y = top + i * lh; SC.rrect(ctx, x - padX, y + lh * 0.06, l.w + padX * 2, lh * 0.9, lh * 0.45); ctx.fill(); });
      else if (L.bg === 'highlight') lines.forEach((l, i) => { if (!l.w) return; const x = lineX(l), y = top + i * lh; ctx.fillRect(x - size * 0.12, y + lh * 0.52, l.w + size * 0.24, lh * 0.42); });
      else if (L.bg === 'line') { ctx.fillRect(cx - bw / 2, box.y + box.h + size * 0.1, bw, Math.max(2 * k, size * 0.06)); }
      ctx.restore();
    }

    /* 조각 단위 모션 */
    const mode = A === 'type' ? 'char' : A === 'word' ? 'word' : 'run';
    const units = []; let ci = 0;
    lines.forEach((l, li) => {
      const x0 = lineX(l), y = top + li * lh + lh / 2, n = l.cs.length;
      const add = (j, e) => units.push({ str: l.cs.slice(j, e).map((c) => c.ch).join(''), x: x0 + l.xs[j], w: l.xs[e] - l.xs[j], y: y, li: li, lineTop: top + li * lh, i: ci++, col: l.cs[j].acc ? L.accent : L.color, acc: l.cs[j].acc });
      let j = 0;
      while (j < n) {
        if (mode !== 'run' && l.cs[j].ch === ' ') { j++; continue; }
        let e = j + 1;
        if (mode === 'run') while (e < n && l.cs[e].acc === l.cs[j].acc) e++;
        else if (mode === 'word') while (e < n && l.cs[e].ch !== ' ') e++;
        add(j, e); j = e;
      }
    });
    const n = units.length || 1;
    const wordIv = clamp(dur * 0.55 / n, 0.12, 0.4), typeIv = Math.min(0.07, 1.4 / n);
    const fx = (u) => {
      switch (A) {
        case 'bounce': { const tp = (tt - u.i * Math.min(0.05, 0.8 / n)) / 0.55; if (tp <= 0) return null; const s = spring(tp); return { a: clamp(tp * 5), dy: -(1 - s) * size * 1.1, sy: 1 - Math.max(0, s - 1) * 1.3 }; }
        case 'type': return tt >= u.i * typeIv ? {} : null;
        case 'word': { const ap = u.i * wordIv; if (tt < ap) return null; const p = clamp((tt - ap) / 0.18), now = tt < ap + wordIv * (u.i === n - 1 ? 1.6 : 1); return { s: 1.22 - 0.22 * eOut(p), col: now || u.acc ? L.accent : L.color }; }
        case 'glitch': { const p = clamp(tt / 0.45); return p < 1 ? { g: p } : {}; }
        default: return {};
      }
    };
    const sw = size * (L.strokeW || 12) / 100;
    const paint = (str, x, y, col, pass) => {
      if (pass === 'stroke') {
        if (!L.stroke) return;
        ctx.save();
        if (L.shadow === 1) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = size * 0.24; ctx.shadowOffsetY = size * 0.04; }
        ctx.lineWidth = sw; ctx.strokeStyle = L.strokeColor || '#000000'; ctx.strokeText(str, x, y);
        ctx.restore();
      } else {
        ctx.save();
        if (L.shadow === 2) { ctx.shadowColor = L.accent; ctx.shadowBlur = size * 0.45; }
        else if (L.shadow === 1) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = size * 0.26; ctx.shadowOffsetY = size * 0.04; }
        ctx.fillStyle = col; ctx.fillText(str, x, y);
        ctx.restore();
      }
    };
    if (A === 'glitch' && tt < 0.45) {
      const step = Math.floor(tt * 24), off = (1 - tt / 0.45) * 20 * k * (hash(step) > 0.5 ? 1 : -1);
      for (const pair of [['#ff2d55', off], ['#22d3ee', -off]]) {
        ctx.save(); ctx.globalAlpha *= 0.8; ctx.fillStyle = pair[0];
        units.forEach((u) => ctx.fillText(u.str, u.x + pair[1], u.y + (hash(step + u.i * 7) - 0.5) * off * 0.5));
        ctx.restore();
      }
    }
    let lastShown = null;
    for (const pass of L.stroke ? ['stroke', 'fill'] : ['fill']) {
      for (const u of units) {
        const f = fx(u); if (!f) continue; lastShown = u;
        ctx.save();
        if (f.a != null) ctx.globalAlpha *= f.a;
        ctx.translate(u.x + u.w / 2, u.y + (f.dy || 0));
        if (f.s || f.sy) ctx.scale(f.s || 1, (f.s || 1) * (f.sy || 1));
        paint(u.str, -u.w / 2, 0, f.col || u.col, pass);
        ctx.restore();
      }
    }
    if (A === 'type' && tt < n * typeIv + 0.8 && Math.floor(tt * 2.6) % 2 === 0) {
      const u = lastShown || units[0];
      if (u) { ctx.fillStyle = L.color; ctx.fillRect(lastShown ? u.x + u.w + size * 0.06 : u.x, u.y - size * 0.42, Math.max(3 * k, size * 0.06), size * 0.84); }
    }
    ctx.restore();

    if (opt && opt.preview && opt.selectedTextId === L.id && !opt.playing) {
      ctx.save(); ctx.setLineDash([12 * k, 9 * k]); ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(52,211,153,.95)';
      ctx.strokeRect(L._bb.x, L._bb.y, L._bb.w, L._bb.h); ctx.restore();
    }
  }

  /* ---------- 미디어 그리기 ---------- */
  function drawMedia(ctx, p, clip, lt, W, H, dur) {
    const k = Math.min(W, H) / 1080;
    const m = R.mediaOf(p, clip.mediaId);
    ctx.save(); ctx.filter = 'none'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, W, H);
    if (!m) { drawMissing(ctx, W, H, k); ctx.restore(); return; }

    const isV = m.type === 'video';
    const src = m.el;
    const sw = isV ? (src.videoWidth || m.w) : (src.width || m.w);
    const sh = isV ? (src.videoHeight || m.h) : (src.height || m.h);
    const ready = sw > 0 && sh > 0 && (!isV || src.readyState >= 2);
    const f = SC.filterCss(clip, k);
    const fit = clip.fit || 'cover';

    if (fit === 'blur' && ready) {
      const bgc = bufs(W, H).bg, bx = bgc.getContext('2d');
      const bw = bgc.width, bh = bgc.height, cv = Math.max(bw / sw, bh / sh);
      bx.clearRect(0, 0, bw, bh);
      bx.save(); bx.filter = (f === 'none' ? '' : f + ' ') + 'blur(2px) brightness(.6)';
      bx.drawImage(src, (bw - sw * cv) / 2, (bh - sh * cv) / 2, sw * cv, sh * cv); bx.restore();
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bgc, 0, 0, bw, bh, 0, 0, W, H);
    }

    if (!ready) { drawMissing(ctx, W, H, k); ctx.restore(); return; }

    const box = [0, 0, W, H];
    const cover = fit !== 'contain';
    const base = cover ? Math.max(box[2] / sw, box[3] / sh) : Math.min(box[2] / sw, box[3] / sh);
    const pr = dur > 0 ? clamp(lt / dur) : 0;
    let mo = clip.motion || 'none';
    if (mo === 'auto') mo = 'in';
    let mz = 1, mx = 0, my = 0;
    if (mo === 'in') { mz = 1 + 0.09 * pr; }
    else if (mo === 'out') { mz = 1.09 - 0.09 * pr; }
    else if (mo === 'left') { mz = 1.1; mx = (0.5 - pr) * 0.08 * W; }
    else if (mo === 'right') { mz = 1.1; mx = (pr - 0.5) * 0.08 * W; }
    else if (mo === 'up') { mz = 1.1; my = (0.5 - pr) * 0.08 * H; }
    else if (mo === 'down') { mz = 1.1; my = (pr - 0.5) * 0.08 * H; }
    else if (mo === 'pulse') { mz = 1.03 + 0.025 * Math.sin(lt * Math.PI * 2 * 1.2); }
    const z = base * (clip.zoom || 1) * mz, dw = sw * z, dh = sh * z;
    const ox = (clip.px || 0) * Math.abs(dw - W) / 2 + mx;
    const oy = (clip.py || 0) * Math.abs(dh - H) / 2 + my;

    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.translate(W / 2 + ox, H / 2 + oy);
    ctx.filter = f; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, -sw * z / 2, -sh * z / 2, sw * z, sh * z);
    ctx.restore();

    /* 색온도·비네트는 화면 전체에 덧칠 */
    const warm = (clip.warm || 0) + (clip.look === 'cool' ? -20 : 0);
    if (warm) {
      ctx.save(); ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = warm > 0 ? 'rgba(255,150,40,' + Math.min(1, warm / 100) * 0.5 + ')' : 'rgba(50,140,255,' + Math.min(1, -warm / 100) * 0.5 + ')';
      ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    if (clip.vig) {
      const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.hypot(W, H) * 0.56);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,' + (clip.vig / 100 * 0.8) + ')');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    if (clip.grain) {
      ctx.save(); ctx.globalAlpha = clip.grain / 100 * 0.5; ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat');
      ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    if (clip.letterbox) {
      const bar = H * 0.09; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    }
    ctx.restore();
  }
  function drawMissing(ctx, W, H, k) {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#161622'); g.addColorStop(1, '#0b0b12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = '700 ' + (34 * k) + 'px "Pretendard Variable",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('미디어를 기다리는 중', W / 2, H / 2);
  }

  /* ---------- 전환 ---------- */
  function composite(ctx, W, H, p, type) {
    const { a: cA, b: cB } = bufs(W, H), e = eInOut(p);
    ctx.save(); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    switch (type) {
      case 'fade': ctx.drawImage(cA, 0, 0); ctx.globalAlpha = e; ctx.drawImage(cB, 0, 0); break;
      case 'slide': ctx.drawImage(cA, -e * W, 0); ctx.drawImage(cB, (1 - e) * W, 0); break;
      case 'up': ctx.drawImage(cA, 0, -e * H); ctx.drawImage(cB, 0, (1 - e) * H); break;
      case 'zoom': {
        const s = 1 + 0.22 * e; ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.drawImage(cA, -W / 2, -H / 2); ctx.restore();
        const s2 = 0.88 + 0.12 * e; ctx.globalAlpha = e; ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s2, s2); ctx.drawImage(cB, -W / 2, -H / 2); ctx.restore(); break;
      }
      case 'wipe': ctx.drawImage(cA, 0, 0); ctx.beginPath(); ctx.rect(0, 0, W * e, H); ctx.clip(); ctx.drawImage(cB, 0, 0); break;
      case 'flash': ctx.drawImage(p < 0.5 ? cA : cB, 0, 0); ctx.fillStyle = 'rgba(255,255,255,' + (1 - Math.abs(p - 0.5) * 2) * 0.92 + ')'; ctx.fillRect(0, 0, W, H); break;
      case 'dip': ctx.drawImage(p < 0.5 ? cA : cB, 0, 0); ctx.fillStyle = 'rgba(0,0,0,' + (p < 0.5 ? p * 2 : (1 - p) * 2) + ')'; ctx.fillRect(0, 0, W, H); break;
      case 'circle': ctx.drawImage(cA, 0, 0); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(1, e * Math.hypot(W, H) / 2), 0, Math.PI * 2); ctx.clip(); ctx.drawImage(cB, 0, 0); ctx.restore(); break;
      case 'blurzoom': {
        const k = Math.min(W, H) / 1080, a = p < 0.5, q = a ? p * 2 : (1 - p) * 2, s = 1 + 0.3 * eInOut(q);
        ctx.save(); ctx.filter = 'blur(' + (q * 16 * k).toFixed(1) + 'px)'; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.drawImage(a ? cA : cB, -W / 2, -H / 2); ctx.restore(); break;
      }
      case 'whip': {
        const x = eInOut(p);
        for (let g = 3; g >= 0; g--) { const o = g * 0.04 * W * Math.sin(Math.PI * p); ctx.globalAlpha = g ? 0.2 : 1; ctx.drawImage(cA, -x * W - o, 0); ctx.drawImage(cB, (1 - x) * W - o, 0); }
        break;
      }
      default: ctx.drawImage(cA, 0, 0); break;
    }
    ctx.restore();
  }

  /* ---------- 프레임 ---------- */
  R.frame = function (ctx, p, t, opt) {
    opt = opt || {};
    const W = p.w, H = p.h;
    ctx.save(); ctx.filter = 'none'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    const clips = p.tracks.video.clips.slice().sort((a, b) => a.start - b.start);
    let cur = null, curIdx = -1;
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      if (t >= c.start - 1e-6 && t < c.start + c.dur - 1e-6) { cur = c; curIdx = i; }
    }
    const prev = curIdx > 0 ? clips[curIdx - 1] : null;
    const tr = cur ? (cur.transition || 'none') : 'none';
    const td = Math.min(cur ? (cur.transDur == null ? 0.45 : cur.transDur) : 0, cur ? cur.dur * 0.45 : 0);
    const adjacent = cur && prev && Math.abs(prev.start + prev.dur - cur.start) < 0.08;

    if (cur && tr !== 'none' && adjacent && (t - cur.start) < td && td > 0.02) {
      const { a: cA, b: cB } = bufs(W, H);
      drawMedia(cA.getContext('2d'), p, prev, prev.dur - 0.001, W, H, prev.dur);
      drawMedia(cB.getContext('2d'), p, cur, t - cur.start, W, H, cur.dur);
      composite(ctx, W, H, (t - cur.start) / td, tr);
    } else if (cur) {
      drawMedia(ctx, p, cur, t - cur.start, W, H, cur.dur);
    }

    /* 자막 */
    const texts = p.tracks.text.clips.filter((c) => t >= c.start - 1e-6 && t < c.start + c.dur);
    texts.sort((a, b) => a.start - b.start);
    for (const L of texts) drawTextClip(ctx, W, H, L, t - L.start, L.dur, Object.assign({ preview: opt.preview, playing: opt.playing, selectedTextId: opt.selectedTextId }, { frameNo: opt.frameNo }));

    /* 계정 표시 */
    if (p.brandOn !== false && p.brand) {
      const k = Math.min(W, H) / 1080, port = H > W * 1.2;
      ctx.save(); ctx.globalAlpha = 0.86;
      ctx.font = '700 ' + (30 * k) + 'px "Pretendard Variable",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 12 * k;
      ctx.fillText(p.brand, W / 2, port ? H * 0.955 : H * 0.94);
      ctx.restore();
    }

    /* 안전 영역 */
    if (opt.preview && opt.safe) {
      const k = Math.min(W, H) / 1080, port = H > W * 1.2;
      const x = W * 0.06, y = H * (port ? 0.1 : 0.06), w = W * 0.88, h = H * (port ? 0.74 : 0.88);
      ctx.save(); ctx.setLineDash([16 * k, 11 * k]); ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(52,211,153,.85)';
      ctx.strokeRect(x, y, w, h);
      ctx.font = '700 ' + (24 * k) + 'px "Pretendard Variable",sans-serif'; ctx.fillStyle = 'rgba(52,211,153,.95)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('안전 영역', x + 12 * k, y + 10 * k);
      ctx.restore();
    }
    ctx.restore();
  };

  R.duration = function (p) {
    let end = 0;
    for (const key of ['video', 'text', 'audio']) for (const c of p.tracks[key].clips) end = Math.max(end, c.start + c.dur);
    return Math.max(0, end);
  };
})();
