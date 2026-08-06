/* core.js — 순수 헬퍼. DOM도 스토리지도 건드리지 않는다.
   브라우저에서는 window.Gym, node에서는 module.exports 로 노출돼서
   `node test.js` 로 그대로 단위 테스트할 수 있다. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Gym = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BAR_KG = 20;
  var EPS = 0.001;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  var MAX_NAME = 60;
  var MAX_UNIT = 12;
  var MAX_REPS = 24;
  var MAX_SETS = 20;
  var MAX_REST = 900;
  var MAX_LOAD = 999;
  var MAX_REPS_VALUE = 9999;

  var PLATES = [
    { kg: 25,   color: '#B72B27', h: 32, lt: false },
    { kg: 20,   color: '#23528F', h: 30, lt: false },
    { kg: 15,   color: '#C89614', h: 27, lt: false },
    { kg: 10,   color: '#22754A', h: 24, lt: false },
    { kg: 5,    color: '#D9D6D0', h: 19, lt: true  },
    { kg: 2.5,  color: '#B72B27', h: 15, lt: false },
    { kg: 1.25, color: '#B4BAC1', h: 12, lt: true  }
  ];

  /* ---------- 문자열 · 날짜 ---------- */

  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function dateKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayKey() { return dateKey(new Date()); }

  function shortDate(key) { return String(key).slice(5).replace('-', '/'); }

  function isDateKey(v) { return typeof v === 'string' && DATE_RE.test(v); }

  /* ---------- 원판 계산 ---------- */

  function loadout(total, bar) {
    var barKg = bar == null ? BAR_KG : bar;
    var per = ((Number(total) || 0) - barKg) / 2;
    var out = [];
    if (!(per > 0)) return out;
    PLATES.forEach(function (p) {
      while (per >= p.kg - EPS) { out.push(p); per -= p.kg; }
    });
    return out;
  }

  function platesHTML(total, bar) {
    var side = loadout(total, bar);
    if (!side.length) return '';
    var barKg = bar == null ? BAR_KG : bar;
    var h = '<div class="plates"><span class="bar"></span>';
    side.slice().reverse().forEach(function (p) {
      h += '<span class="plate' + (p.lt ? ' lt' : '') + '" style="background:' + p.color +
           ';height:' + p.h + 'px"><b>' + p.kg + '</b></span>';
    });
    h += '<span class="collar"></span><span class="plabel">봉 ' + barKg + 'kg + 한쪽 ' +
         side.map(function (p) { return p.kg; }).join(' + ') + '</span></div>';
    return h;
  }

  /* ---------- 기록 조회 ---------- */

  function entryFor(logs, exId, date) {
    var arr = (logs && logs[exId]) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].date === date) return arr[i];
    return null;
  }

  function blankSet() { return { w: null, r: null, done: false }; }

  /* 렌더 전용. 저장된 게 없으면 빈 세트를 만들어 주지만 logs 에는 쓰지 않는다. */
  function viewSets(entry, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var s = entry && entry.sets ? entry.sets[i] : null;
      out.push(s || blankSet());
    }
    return out;
  }

  function isEmptyEntry(e) {
    if (!e || !Array.isArray(e.sets)) return true;
    return !e.sets.some(function (s) {
      return s && (s.w != null || s.r != null || s.done);
    });
  }

  /* 값이 하나도 없는 엔트리를 걷어낸 새 logs 를 돌려준다. 원본은 건드리지 않는다. */
  function pruneLogs(logs) {
    var out = {};
    var removed = 0;
    Object.keys(logs || {}).forEach(function (id) {
      var arr = logs[id];
      if (!Array.isArray(arr)) { removed++; return; }
      var kept = arr.filter(function (e) { return !isEmptyEntry(e); });
      removed += arr.length - kept.length;
      if (kept.length) out[id] = kept;
    });
    return { logs: out, removed: removed };
  }

  function prevEntry(logs, exId, date) {
    var arr = (logs && logs[exId]) || [];
    var best = null;
    arr.forEach(function (e) {
      if (!e || e.date >= date) return;
      if (!e.sets.some(function (s) { return s.w != null || s.r != null; })) return;
      if (!best || e.date > best.date) best = e;
    });
    return best;
  }

  function topSet(e) {
    var m = null;
    if (!e || !Array.isArray(e.sets)) return null;
    e.sets.forEach(function (s) {
      if (s && s.w != null && (m === null || s.w > m)) m = s.w;
    });
    return m;
  }

  function formatPrev(e) {
    if (!e) return null;
    var used = e.sets.filter(function (s) { return s.w != null || s.r != null; });
    if (!used.length) return null;
    var w = used[0].w;
    var same = used.every(function (s) { return s.w === w; });
    var reps = used.map(function (s) { return s.r == null ? '-' : s.r; }).join(',');
    return shortDate(e.date) + ' · ' + (same ? (w == null ? '' : w + 'kg × ') : '') + reps + (same ? '' : '회');
  }

  /* ---------- 백업 검증 · 병합 ---------- */

  function num(v, max) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    if (!isFinite(n)) return null;
    if (n < 0 || n > max) return null;
    return n;
  }

  function str(v, max, fallback) {
    if (typeof v !== 'string') return fallback;
    var s = v.trim().slice(0, max);
    return s || fallback;
  }

  function sanitizeLogs(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (id) {
      var arr = raw[id];
      if (!Array.isArray(arr)) return;
      var entries = [];
      arr.forEach(function (e) {
        if (!e || !isDateKey(e.date) || !Array.isArray(e.sets)) return;
        var sets = e.sets.slice(0, MAX_SETS).map(function (s) {
          return {
            w: s ? num(s.w, MAX_LOAD) : null,
            r: s ? num(s.r, MAX_REPS_VALUE) : null,
            done: !!(s && s.done)
          };
        });
        var entry = { date: e.date, sets: sets };
        if (!isEmptyEntry(entry)) entries.push(entry);
      });
      if (entries.length) out[String(id)] = entries;
    });
    return out;
  }

  function sanitizeCustom(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (dayId) {
      var arr = raw[dayId];
      if (!Array.isArray(arr)) return;
      var list = [];
      arr.forEach(function (ex) {
        if (!ex || typeof ex.id !== 'string' || !ex.id) return;
        var name = str(ex.name, MAX_NAME, null);
        if (!name) return;
        list.push({
          id: ex.id.slice(0, MAX_NAME),
          name: name,
          load: num(ex.load, MAX_LOAD) || 0,
          unit: str(ex.unit, MAX_UNIT, 'kg'),
          sets: Math.min(MAX_SETS, Math.max(1, parseInt(ex.sets, 10) || 3)),
          reps: str(ex.reps, MAX_REPS, '10-12회'),
          rest: Math.min(MAX_REST, Math.max(0, parseInt(ex.rest, 10) || 60))
        });
      });
      if (list.length) out[String(dayId)] = list;
    });
    return out;
  }

  /* 같은 (종목, 날짜) 는 들여온 쪽이 이긴다. 새 객체를 돌려준다. */
  function mergeLogs(base, incoming) {
    var out = {};
    Object.keys(base || {}).forEach(function (id) { out[id] = (base[id] || []).slice(); });
    Object.keys(incoming || {}).forEach(function (id) {
      var arr = out[id] || (out[id] = []);
      incoming[id].forEach(function (e) {
        var idx = -1;
        for (var i = 0; i < arr.length; i++) if (arr[i].date === e.date) { idx = i; break; }
        if (idx >= 0) arr[idx] = e; else arr.push(e);
      });
      arr.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    });
    return out;
  }

  function mergeCustom(base, incoming) {
    var out = {};
    Object.keys(base || {}).forEach(function (d) { out[d] = (base[d] || []).slice(); });
    Object.keys(incoming || {}).forEach(function (d) {
      var arr = out[d] || (out[d] = []);
      incoming[d].forEach(function (ex) {
        var idx = -1;
        for (var i = 0; i < arr.length; i++) if (arr[i].id === ex.id) { idx = i; break; }
        if (idx >= 0) arr[idx] = ex; else arr.push(ex);
      });
    });
    return out;
  }

  /* ---------- 그래프 ---------- */

  function chartSVG(series) {
    var W = 320, H = 170, PL = 38, PR = 10, PT = 12, PB = 26;
    if (!series || series.length < 2) {
      return '<div class="empty">기록이 2회 이상 쌓이면<br>그래프가 나와.</div>';
    }
    var vals = series.map(function (p) { return p.v; });
    var mn = Math.min.apply(null, vals);
    var mx = Math.max.apply(null, vals);
    if (mx === mn) { mx = mn + 5; mn = Math.max(0, mn - 5); }
    var pad = (mx - mn) * 0.15;
    mn = Math.max(0, mn - pad);
    mx = mx + pad;

    var x = function (i) { return PL + (W - PL - PR) * (i / (series.length - 1)); };
    var y = function (v) { return PT + (H - PT - PB) * (1 - (v - mn) / (mx - mn)); };

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" xmlns="http://www.w3.org/2000/svg" ' +
            'role="img" aria-label="최고 세트 중량 추이" font-family="JetBrains Mono, monospace">';
    [0, 0.5, 1].forEach(function (f) {
      var v = mn + (mx - mn) * f, yy = y(v);
      s += '<line x1="' + PL + '" y1="' + yy + '" x2="' + (W - PR) + '" y2="' + yy + '" stroke="#D6D4CF" stroke-width="1"/>';
      s += '<text x="' + (PL - 6) + '" y="' + (yy + 3.5) + '" font-size="9" fill="#616973" text-anchor="end">' + Math.round(v) + '</text>';
    });
    var d = series.map(function (p, i) {
      return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1);
    }).join(' ');
    s += '<path d="' + d + '" fill="none" stroke="#B72B27" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    series.forEach(function (p, i) {
      s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="3.5" fill="#fff" stroke="#B72B27" stroke-width="2"/>';
    });
    var step = Math.ceil(series.length / 5);
    series.forEach(function (p, i) {
      if (i % step === 0 || i === series.length - 1) {
        s += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" font-size="9" fill="#616973" text-anchor="middle">' +
             esc(shortDate(p.d)) + '</text>';
      }
    });
    s += '</svg>';
    return s;
  }

  return {
    BAR_KG: BAR_KG,
    PLATES: PLATES,
    esc: esc,
    dateKey: dateKey,
    todayKey: todayKey,
    shortDate: shortDate,
    isDateKey: isDateKey,
    loadout: loadout,
    platesHTML: platesHTML,
    entryFor: entryFor,
    blankSet: blankSet,
    viewSets: viewSets,
    isEmptyEntry: isEmptyEntry,
    pruneLogs: pruneLogs,
    prevEntry: prevEntry,
    topSet: topSet,
    formatPrev: formatPrev,
    sanitizeLogs: sanitizeLogs,
    sanitizeCustom: sanitizeCustom,
    mergeLogs: mergeLogs,
    mergeCustom: mergeCustom,
    chartSVG: chartSVG
  };
});
