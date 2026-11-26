/* 쏭컷 스튜디오 PRO — 내장 샘플 미디어 3종 (파일 없이 바로 체험)
   사진을 올리지 않아도 되도록, 캔버스로 그린 '강의 현장 / 감성 브이로그 / 전자책' 장면을 쓴다. */
(function () {
  'use strict';
  const SC = window.SC;
  const W = 1080, H = 1440;

  const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

  let noiseTile = null;
  function noise(ctx, w, h, alpha) {
    if (!noiseTile) {
      noiseTile = SC.mk(180, 180);
      const nx = noiseTile.getContext('2d');
      const img = nx.createImageData(180, 180);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 120 + Math.random() * 135;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 26;
      }
      nx.putImageData(img, 0, 0);
    }
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.35 : alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function scrim(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,.34)'); g.addColorStop(.28, 'rgba(0,0,0,.06)');
    g.addColorStop(.6, 'rgba(0,0,0,0)'); g.addColorStop(.82, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  function vignette(ctx, w, h, a) {
    const g = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.22, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (a == null ? 0.55 : a) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  function glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + (a == null ? 0.5 : a) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function frame(fn) { const c = SC.mk(W, H); const ctx = c.getContext('2d'); fn(ctx); return c; }

  /* 1) 강의 현장 — 민트 톤 */
  function lecture(i) {
    return frame((ctx) => {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0c3d35'); g.addColorStop(0.55, '#072520'); g.addColorStop(1, '#041310');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.78, H * 0.12, W * 0.85, '52,211,153', 0.3);

      if (i === 0) { /* 스크린 + 강의실 실루엣 */
        ctx.save(); ctx.shadowColor = 'rgba(52,211,153,.5)'; ctx.shadowBlur = 110;
        const sg = ctx.createLinearGradient(130, 250, 950, 770);
        sg.addColorStop(0, 'rgba(206,250,236,.9)'); sg.addColorStop(.55, 'rgba(150,222,201,.86)'); sg.addColorStop(1, 'rgba(88,168,146,.84)');
        ctx.fillStyle = sg; SC.rrect(ctx, 130, 250, 820, 520, 22); ctx.fill(); ctx.restore();
        /* 유리 반사 */
        ctx.save(); SC.rrect(ctx, 130, 250, 820, 520, 22); ctx.clip();
        const gl = ctx.createLinearGradient(130, 250, 620, 770);
        gl.addColorStop(0, 'rgba(255,255,255,.42)'); gl.addColorStop(.42, 'rgba(255,255,255,.06)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(130, 250, 520, 520); ctx.restore();
        ctx.save(); ctx.filter = 'blur(1.4px)';
        ctx.fillStyle = 'rgba(15,90,74,.5)';
        SC.rrect(ctx, 200, 340, 300, 30, 8); ctx.fill();
        SC.rrect(ctx, 200, 400, 620, 16, 8); ctx.fill();
        SC.rrect(ctx, 200, 438, 520, 16, 8); ctx.fill();
        ctx.fillStyle = 'rgba(30,180,140,.8)';
        SC.rrect(ctx, 200, 520, 250, 90, 12); ctx.fill();
        ctx.fillStyle = 'rgba(15,90,74,.35)';
        SC.rrect(ctx, 480, 520, 340, 90, 12); ctx.fill();
        ctx.restore();
        /* 사람들 */
        for (let k = 0; k < 6; k++) {
          const x = 90 + k * 175, y = 1120 + (k % 3) * 36, r = 62 + (k % 2) * 8;
          ctx.fillStyle = 'rgba(2,18,15,.94)';
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          SC.rrect(ctx, x - r * 1.5, y + r * 0.72, r * 3, r * 2.4, r * 0.9); ctx.fill();
          ctx.strokeStyle = 'rgba(110,231,183,.22)'; ctx.lineWidth = 3; ctx.stroke();
        }
        const beam = ctx.createLinearGradient(0, 780, 0, 1250);
        beam.addColorStop(0, 'rgba(180,250,230,.22)'); beam.addColorStop(1, 'rgba(180,250,230,0)');
        ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(130, 780); ctx.lineTo(950, 780); ctx.lineTo(1120, 1440); ctx.lineTo(-40, 1440); ctx.closePath(); ctx.fill();
      } else if (i === 1) { /* 스마트폰 들고 배우는 손 */
        ctx.save(); ctx.translate(W / 2 - 40, H * 0.5); ctx.rotate(-0.06);
        ctx.fillStyle = 'rgba(4,20,17,.9)'; SC.rrect(ctx, -210, -330, 460, 660, 52); ctx.fill();
        const sg = ctx.createLinearGradient(-180, -300, 200, 300);
        sg.addColorStop(0, '#eafff8'); sg.addColorStop(1, '#9ce7cf');
        ctx.fillStyle = sg; SC.rrect(ctx, -180, -290, 400, 580, 20); ctx.fill();
        ctx.fillStyle = 'rgba(15,90,74,.55)'; SC.rrect(ctx, -140, -230, 320, 44, 10); ctx.fill();
        ctx.fillStyle = 'rgba(52,211,153,.9)'; SC.rrect(ctx, -140, -150, 200, 200, 18); ctx.fill();
        ctx.fillStyle = 'rgba(15,90,74,.35)'; SC.rrect(ctx, -140, 80, 320, 22, 8); ctx.fill();
        SC.rrect(ctx, -140, 124, 240, 22, 8); ctx.fill();
        ctx.restore();
        /* 손가락 */
        ctx.fillStyle = 'rgba(240,214,190,.92)';
        SC.rrect(ctx, W * 0.5 + 300, H * 0.64, 210, 74, 34); ctx.fill();
        SC.rrect(ctx, W * 0.5 + 360, H * 0.72, 170, 60, 30); ctx.fill();
        glow(ctx, W * 0.3, H * 0.22, W * 0.6, '255,255,255', 0.16);
      } else if (i === 2) { /* 노트북과 차트 */
        ctx.save(); ctx.translate(W / 2, H * 0.56);
        ctx.fillStyle = 'rgba(3,16,14,.9)'; SC.rrect(ctx, -430, -250, 860, 520, 26); ctx.fill();
        const sg = ctx.createLinearGradient(-380, -210, 380, 210);
        sg.addColorStop(0, '#f2fff9'); sg.addColorStop(1, '#b6eeda');
        ctx.fillStyle = sg; SC.rrect(ctx, -380, -210, 760, 440, 12); ctx.fill();
        const bars = [0.42, 0.62, 0.38, 0.78, 0.56, 0.9];
        bars.forEach((b, k) => {
          ctx.fillStyle = k === 5 ? 'rgba(52,211,153,.95)' : 'rgba(13,110,90,.45)';
          const bh = 250 * b, x = -320 + k * 112;
          SC.rrect(ctx, x, 170 - bh, 74, bh, 10); ctx.fill();
        });
        ctx.fillStyle = 'rgba(13,110,90,.3)'; SC.rrect(ctx, -330, -160, 300, 22, 8); ctx.fill();
        ctx.restore();
        glow(ctx, W * 0.5, H * 0.28, W * 0.7, '110,231,183', 0.18);
      } else if (i === 3) { /* 책상 위 소품 */
        ctx.save(); ctx.translate(W / 2, H * 0.58); ctx.rotate(-0.05);
        ctx.fillStyle = 'rgba(250,255,252,.94)'; SC.rrect(ctx, -380, -300, 760, 600, 18); ctx.fill();
        ctx.fillStyle = 'rgba(52,211,153,.85)'; SC.rrect(ctx, -330, -240, 280, 120, 14); ctx.fill();
        ctx.fillStyle = 'rgba(20,60,52,.5)';
        for (let k = 0; k < 4; k++) { SC.rrect(ctx, -330, -70 + k * 52, 620 - k * 60, 18, 8); ctx.fill(); }
        ctx.restore();
        ctx.save(); ctx.translate(W * 0.68, H * 0.72); ctx.rotate(0.5);
        ctx.fillStyle = '#0f3d34'; SC.rrect(ctx, -14, -170, 28, 340, 14); ctx.fill();
        ctx.fillStyle = '#6ee7b7'; SC.rrect(ctx, -14, -190, 28, 46, 12); ctx.fill(); ctx.restore();
        /* 컵 */
        ctx.fillStyle = 'rgba(240,250,246,.9)';
        ctx.beginPath(); ctx.ellipse(W * 0.24, H * 0.76, 96, 34, 0, 0, Math.PI * 2); ctx.fill();
        SC.rrect(ctx, W * 0.24 - 84, H * 0.76 - 8, 168, 150, 16); ctx.fill();
        ctx.fillStyle = 'rgba(60,120,105,.4)';
        ctx.beginPath(); ctx.ellipse(W * 0.24, H * 0.76, 70, 22, 0, 0, Math.PI * 2); ctx.fill();
        glow(ctx, W * 0.3, H * 0.2, W * 0.7, '255,240,210', 0.2);
      } else { /* 수강생 후기 카드 느낌 */
        glow(ctx, W * 0.5, H * 0.42, W * 0.9, '52,211,153', 0.26);
        ctx.fillStyle = 'rgba(255,255,255,.075)'; SC.rrect(ctx, 130, 420, 820, 600, 40); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        for (let k = 0; k < 3; k++) { SC.rrect(ctx, 210, 560 + k * 92, 420 + (k === 2 ? -120 : k * 90), 18, 9); ctx.fill(); }
        ctx.fillStyle = 'rgba(52,211,153,.95)';
        ctx.beginPath(); ctx.arc(760, 900, 54, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 40; k++) { ctx.globalAlpha = 0.25 + (k % 5) * 0.12; ctx.beginPath(); ctx.arc(120 + (k * 97) % 840, 180 + (k * 233) % 1080, 2 + (k % 3), 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      scrim(ctx, W, H); noise(ctx, W, H, 0.3); vignette(ctx, W, H, 0.46);
    });
  }

  /* 2) 감성 브이로그 — 노을 */
  function vlog(i) {
    return frame((ctx) => {
      const R = rnd(100 + i * 7);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      if (i % 2 === 0) { g.addColorStop(0, '#f8dcc0'); g.addColorStop(0.45, '#f0b98d'); g.addColorStop(1, '#a2604a'); }
      else { g.addColorStop(0, '#f3e4cf'); g.addColorStop(0.5, '#e6c3a1'); g.addColorStop(1, '#8d6152'); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      if (i === 0) { /* 해와 언덕 */
        glow(ctx, W * 0.72, H * 0.3, 520, '255,236,190', 0.85);
        ctx.fillStyle = 'rgba(255,250,238,.95)'; ctx.beginPath(); ctx.arc(W * 0.72, H * 0.3, 118, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(150,92,70,.55)';
        ctx.beginPath(); ctx.moveTo(0, H * 0.72); ctx.bezierCurveTo(W * 0.25, H * 0.62, W * 0.5, H * 0.78, W, H * 0.66); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(104,62,50,.72)';
        ctx.beginPath(); ctx.moveTo(0, H * 0.84); ctx.bezierCurveTo(W * 0.3, H * 0.76, W * 0.7, H * 0.9, W, H * 0.8); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      } else if (i === 1) { /* 카페 테이블 */
        glow(ctx, W * 0.2, H * 0.16, 700, '255,236,205', 0.5);
        ctx.fillStyle = 'rgba(90,58,44,.35)';
        ctx.beginPath(); ctx.moveTo(0, H * 0.66); ctx.lineTo(W, H * 0.58); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
        /* 컵 */
        ctx.fillStyle = 'rgba(255,252,246,.96)';
        ctx.beginPath(); ctx.ellipse(W * 0.42, H * 0.62, 132, 44, -0.06, 0, Math.PI * 2); ctx.fill();
        SC.rrect(ctx, W * 0.42 - 122, H * 0.62 - 10, 244, 150, 26); ctx.fill();
        ctx.fillStyle = 'rgba(118,72,48,.8)'; ctx.beginPath(); ctx.ellipse(W * 0.42, H * 0.62, 104, 30, -0.06, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 6;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(W * 0.42 + k * 26 - 20, H * 0.55); ctx.bezierCurveTo(W * 0.42 + k * 26, H * 0.5, W * 0.42 + k * 26 + 20, H * 0.46, W * 0.42 + k * 26 + 10, H * 0.42); ctx.stroke(); }
        /* 접시 */
        ctx.fillStyle = 'rgba(250,240,228,.9)'; ctx.beginPath(); ctx.ellipse(W * 0.74, H * 0.72, 150, 50, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(206,140,96,.95)'; SC.rrect(ctx, W * 0.74 - 70, H * 0.72 - 42, 140, 76, 16); ctx.fill();
      } else if (i === 2) { /* 창가 식물 */
        glow(ctx, W * 0.1, H * 0.1, 800, '255,244,214', 0.55);
        ctx.fillStyle = 'rgba(255,251,240,.75)'; ctx.fillRect(W * 0.58, 0, W * 0.42, H * 0.72);
        ctx.strokeStyle = 'rgba(120,88,66,.5)'; ctx.lineWidth = 10; ctx.strokeRect(W * 0.58, 0, W * 0.42, H * 0.72);
        ctx.strokeStyle = 'rgba(74,104,72,.9)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(W * 0.36, H); ctx.bezierCurveTo(W * 0.34, H * 0.7, W * 0.42, H * 0.5, W * 0.38, H * 0.3); ctx.stroke();
        for (let k = 0; k < 11; k++) {
          const t = k / 11, y = H * (0.92 - t * 0.62), x = W * (0.36 + Math.sin(t * 5) * 0.06), dir = k % 2 ? 1 : -1;
          ctx.save(); ctx.translate(x, y); ctx.rotate(dir * (0.7 + k * 0.05)); ctx.fillStyle = 'rgba(' + (58 + k * 3) + ',' + (104 + k * 4) + ',72,.92)';
          ctx.beginPath(); ctx.ellipse(dir * 60, 0, 70, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        ctx.fillStyle = 'rgba(160,104,76,.95)'; SC.rrect(ctx, W * 0.36 - 92, H * 0.9, 184, 160, 22); ctx.fill();
      } else if (i === 3) { /* 골목 */
        glow(ctx, W * 0.5, H * 0.18, W, '255,226,188', 0.5);
        ctx.fillStyle = 'rgba(92,60,48,.82)'; ctx.beginPath(); ctx.moveTo(W * 0.14, 0); ctx.lineTo(W * 0.4, H * 0.52); ctx.lineTo(W * 0.4, H); ctx.lineTo(W * 0.05, H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,80,62,.86)'; ctx.beginPath(); ctx.moveTo(W * 0.86, 0); ctx.lineTo(W * 0.6, H * 0.52); ctx.lineTo(W * 0.6, H); ctx.lineTo(W * 0.95, H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(246,232,212,.9)'; ctx.beginPath(); ctx.moveTo(W * 0.4, H * 0.52); ctx.lineTo(W * 0.6, H * 0.52); ctx.lineTo(W * 0.74, H); ctx.lineTo(W * 0.26, H); ctx.closePath(); ctx.fill();
        for (let k = 0; k < 6; k++) { ctx.strokeStyle = 'rgba(150,120,100,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * 0.4 + k * 20, H * 0.6 + k * 90); ctx.lineTo(W * 0.6 - k * 16, H * 0.6 + k * 90); ctx.stroke(); }
        for (let k = 0; k < 24; k++) { ctx.fillStyle = 'rgba(255,224,180,' + (0.25 + R() * 0.5) + ')'; ctx.beginPath(); ctx.arc(W * 0.1 + R() * W * 0.8, H * 0.35 + R() * H * 0.6, 2 + R() * 4, 0, Math.PI * 2); ctx.fill(); }
      } else { /* 하늘과 구름 */
        glow(ctx, W * 0.3, H * 0.2, 700, '255,248,226', 0.6);
        for (let k = 0; k < 7; k++) {
          const x = W * (0.1 + R() * 0.8), y = H * (0.1 + R() * 0.45), r = 90 + R() * 140;
          ctx.fillStyle = 'rgba(255,250,242,' + (0.18 + R() * 0.28) + ')';
          for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.arc(x + (j - 2) * r * 0.7, y + Math.sin(j) * r * 0.2, r * (0.7 + R() * 0.4), 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.fillStyle = 'rgba(140,92,72,.7)';
        ctx.beginPath(); ctx.moveTo(0, H * 0.86); ctx.bezierCurveTo(W * 0.4, H * 0.78, W * 0.7, H * 0.92, W, H * 0.84); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      }
      /* 보케 */
      const R2 = rnd(500 + i);
      for (let k = 0; k < 16; k++) {
        const x = R2() * W, y = R2() * H, r = 20 + R2() * 90;
        const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
        bg.addColorStop(0, 'rgba(255,240,214,' + (0.1 + R2() * 0.18) + ')'); bg.addColorStop(1, 'rgba(255,240,214,0)');
        ctx.fillStyle = bg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      scrim(ctx, W, H); noise(ctx, W, H, 0.32); vignette(ctx, W, H, 0.38);
    });
  }

  /* 3) 전자책·제품 — 잉크와 금빛 */
  function product(i) {
    return frame((ctx) => {
      const R = rnd(900 + i * 13);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0e1424'); g.addColorStop(0.5, '#0a0f1b'); g.addColorStop(1, '#141018');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.5, H * 0.42, W * 1.1, '176,141,74', 0.26);

      if (i === 0) { /* 표지 */
        ctx.save(); ctx.translate(W / 2, H * 0.5); ctx.rotate(-0.03);
        ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 40;
        const cg = ctx.createLinearGradient(-280, -380, 280, 380);
        cg.addColorStop(0, '#f6efe2'); cg.addColorStop(1, '#d9c9ad');
        ctx.fillStyle = cg; SC.rrect(ctx, -280, -380, 560, 760, 10); ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(20,24,36,.92)'; SC.rrect(ctx, -280, -380, 46, 760, 10); ctx.fill();
        ctx.fillStyle = 'rgba(30,36,50,.9)';
        SC.rrect(ctx, -190, -300, 380, 40, 6); ctx.fill();
        ctx.fillStyle = 'rgba(52,211,153,.95)'; SC.rrect(ctx, -190, -220, 210, 26, 6); ctx.fill();
        ctx.fillStyle = 'rgba(30,36,50,.5)';
        SC.rrect(ctx, -190, 20, 380, 16, 8); ctx.fill(); SC.rrect(ctx, -190, 56, 300, 16, 8); ctx.fill(); SC.rrect(ctx, -190, 92, 340, 16, 8); ctx.fill();
        ctx.fillStyle = 'rgba(176,141,74,.95)'; SC.rrect(ctx, -190, 250, 150, 44, 8); ctx.fill();
        ctx.restore();
        glow(ctx, W * 0.2, H * 0.2, 500, '255,226,170', 0.18);
      } else if (i === 1) { /* 펼친 책 */
        ctx.save(); ctx.translate(W / 2, H * 0.55);
        ctx.fillStyle = 'rgba(246,239,226,.97)';
        ctx.beginPath(); ctx.moveTo(-420, -250); ctx.bezierCurveTo(-220, -290, -40, -230, 0, -200); ctx.lineTo(0, 320); ctx.bezierCurveTo(-60, 290, -240, 250, -420, 300); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(420, -250); ctx.bezierCurveTo(220, -290, 40, -230, 0, -200); ctx.lineTo(0, 320); ctx.bezierCurveTo(60, 290, 240, 250, 420, 300); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(60,66,84,.28)'; ctx.lineWidth = 3;
        for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-360, -190 + k * 56); ctx.lineTo(-40, -170 + k * 52); ctx.stroke(); ctx.beginPath(); ctx.moveTo(40, -170 + k * 52); ctx.lineTo(360, -190 + k * 56); ctx.stroke(); }
        ctx.restore();
        glow(ctx, W * 0.5, H * 0.12, 800, '255,236,200', 0.22);
      } else if (i === 2) { /* 노트북에 띄운 표지 */
        ctx.save(); ctx.translate(W / 2, H * 0.56);
        ctx.fillStyle = '#1b2030'; SC.rrect(ctx, -430, -300, 860, 540, 22); ctx.fill();
        const sg = ctx.createLinearGradient(-390, -260, 390, 220);
        sg.addColorStop(0, '#f6efe2'); sg.addColorStop(1, '#c9b995');
        ctx.fillStyle = sg; SC.rrect(ctx, -390, -260, 780, 460, 8); ctx.fill();
        ctx.fillStyle = 'rgba(22,26,40,.92)'; SC.rrect(ctx, -330, -200, 330, 24, 6); ctx.fill();
        ctx.fillStyle = 'rgba(52,211,153,.95)'; SC.rrect(ctx, -330, -150, 180, 30, 6); ctx.fill();
        ctx.fillStyle = 'rgba(22,26,40,.45)';
        SC.rrect(ctx, -330, 20, 640, 18, 8); ctx.fill(); SC.rrect(ctx, -330, 58, 520, 18, 8); ctx.fill();
        ctx.fillStyle = 'rgba(176,141,74,.95)'; SC.rrect(ctx, 220, 110, 160, 46, 8); ctx.fill();
        ctx.restore();
      } else { /* 겹친 카드 3장 */
        ctx.save(); ctx.translate(W / 2, H * 0.5);
        for (let k = 2; k >= 0; k--) {
          ctx.save(); ctx.rotate((k - 1) * 0.09); ctx.translate((k - 1) * 26, (k - 1) * -34);
          const cg = ctx.createLinearGradient(-240, -330, 240, 330);
          cg.addColorStop(0, k === 0 ? '#f7f1e6' : '#d9cdb6'); cg.addColorStop(1, k === 0 ? '#d8c8ac' : '#b6a78d');
          ctx.fillStyle = cg; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 22;
          SC.rrect(ctx, -240, -330, 480, 660, 12); ctx.fill(); ctx.shadowColor = 'transparent';
          ctx.fillStyle = 'rgba(24,28,42,.9)'; SC.rrect(ctx, -180, -250, 300, 26, 6); ctx.fill();
          ctx.fillStyle = 'rgba(52,211,153,.95)'; SC.rrect(ctx, -180, -190, 150, 20, 5); ctx.fill();
          ctx.fillStyle = 'rgba(24,28,42,.4)'; SC.rrect(ctx, -180, 40, 340, 14, 7); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        glow(ctx, W * 0.5, H * 0.2, 700, '255,232,190', 0.22);
      }
      for (let k = 0; k < 26; k++) {
        ctx.fillStyle = 'rgba(255,226,178,' + (0.15 + R() * 0.45) + ')';
        ctx.beginPath(); ctx.arc(R() * W, R() * H, 1.5 + R() * 3.2, 0, Math.PI * 2); ctx.fill();
      }
      scrim(ctx, W, H); noise(ctx, W, H, 0.3); vignette(ctx, W, H, 0.5);
    });
  }

  const SETS = [
    { key: 'lecture', name: '강의 현장', desc: '스마트폰 수업 · 민트 톤', make: lecture, n: 5 },
    { key: 'vlog', name: '감성 브이로그', desc: '노을 · 카페 · 골목', make: vlog, n: 5 },
    { key: 'product', name: '전자책·제품', desc: '잉크빛 표지 · 금빛', make: product, n: 4 }
  ];

  SC.SAMPLES = SETS.map((s) => {
    const frames = [];
    for (let i = 0; i < s.n; i++) frames.push(s.make(i));
    const t = SC.mk(240, 320); t.getContext('2d').drawImage(frames[0], 0, 0, 240, 320);
    return { id: 'sample-' + s.key, key: s.key, name: s.name, desc: s.desc, frames, thumb: t.toDataURL('image/jpeg', 0.72), framed: true };
  });

  SC.sampleThumb = function (key, i) {
    const s = SC.SAMPLES.find((x) => x.key === key); if (!s) return '';
    const t = SC.mk(180, 240); t.getContext('2d').drawImage(s.frames[(i || 0) % s.frames.length], 0, 0, 180, 240);
    return t.toDataURL('image/jpeg', 0.7);
  };

  /* 샘플을 편집기 미디어로 등록 */
  SC.makeSampleMedia = function () {
    const out = [];
    for (const s of SC.SAMPLES) {
      s.frames.forEach((f, i) => {
        out.push({ id: 'm-' + s.key + '-' + i, name: s.name + ' ' + (i + 1), type: 'image', el: f, w: f.width, h: f.height, dur: 0, sample: s.key, thumb: scThumb(f) });
      });
    }
    return out;
  };
  function scThumb(c) { const t = SC.mk(180, 180); const x = t.getContext('2d'); const s = Math.max(180 / c.width, 180 / c.height); x.drawImage(c, (180 - c.width * s) / 2, (180 - c.height * s) / 2, c.width * s, c.height * s); return t.toDataURL('image/jpeg', 0.7); }
})();
