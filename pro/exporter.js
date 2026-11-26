/* 쏭컷 스튜디오 PRO — 실제 영상 파일 내보내기 (Canvas captureStream + MediaRecorder) */
(function () {
  'use strict';
  const SC = window.SC;
  const EX = (SC.Exporter = {});

  EX.mime = function () {
    if (!window.MediaRecorder) return '';
    const list = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    for (const m of list) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (_) { /* noop */ } }
    return '';
  };
  EX.supported = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && EX.mime());

  /* opts: {canvas, audioStream|null, duration, fps, bitrate, onFrame(t), onProgress(p)} */
  EX.record = function (opts) {
    return new Promise((resolve, reject) => {
      const mime = EX.mime();
      if (!mime) { reject(new Error('이 브라우저는 영상 저장(MediaRecorder)을 지원하지 않아요. 크롬·엣지에서 열어 주세요.')); return; }
      let vstream;
      try { vstream = opts.canvas.captureStream(opts.fps || 30); } catch (e) { reject(e); return; }
      const tracks = vstream.getVideoTracks().slice();
      if (opts.audioStream) tracks.push.apply(tracks, opts.audioStream.getAudioTracks());
      const stream = new MediaStream(tracks);
      let rec;
      try {
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: opts.bitrate || 9000000, audioBitsPerSecond: 128000 });
      } catch (e) { reject(e); return; }
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onerror = (e) => reject(e.error || new Error('녹화 중 오류'));
      const stopped = new Promise((res) => { rec.onstop = res; });
      let cancelled = false;

      const t0 = performance.now();
      const dur = Math.max(0.4, opts.duration || 1);
      rec.start(200);
      opts.onProgress && opts.onProgress(0);

      const loop = () => {
        if (cancelled) return;
        const t = (performance.now() - t0) / 1000;
        const tt = Math.min(t, dur);
        try { opts.onFrame(tt); } catch (err) { /* 프레임 하나가 실패해도 계속 */ }
        opts.onProgress && opts.onProgress(Math.min(0.999, tt / dur));
        if (t >= dur + 0.05) { finish(); return; }
        requestAnimationFrame(loop);
      };
      const finish = () => {
        try { rec.stop(); } catch (_) { /* noop */ }
        stopped.then(() => {
          tracks.forEach((tr) => { try { tr.stop(); } catch (_) { /* noop */ } });
          if (cancelled) { resolve({ cancelled: true }); return; }
          const blob = new Blob(chunks, { type: mime.split(';')[0] });
          resolve({ blob: blob, mime: mime, ext: mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm', duration: dur });
        });
      };
      requestAnimationFrame(loop);
      EX.cancel = () => { cancelled = true; try { rec.stop(); } catch (_) { /* noop */ } };
    });
  };

  EX.sizeText = function (bytes) {
    if (!bytes) return '0 MB';
    if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  };
})();
