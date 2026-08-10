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

  var WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
  var MS_PER_DAY = 86400000;

  function parseKey(key) {
    var p = String(key).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  /* 월·연 경계를 Date 에 맡긴다. '2026-08-31' + 1 → '2026-09-01' */
  function shiftDate(key, delta) {
    var p = String(key).split('-');
    return dateKey(new Date(+p[0], +p[1] - 1, +p[2] + delta));
  }

  /* from → to 가 며칠인지. 서머타임에 흔들리지 않게 UTC 로 센다. */
  function dayDiff(fromKey, toKey) {
    var a = String(fromKey).split('-');
    var b = String(toKey).split('-');
    var t1 = Date.UTC(+a[0], +a[1] - 1, +a[2]);
    var t2 = Date.UTC(+b[0], +b[1] - 1, +b[2]);
    return Math.round((t2 - t1) / MS_PER_DAY);
  }

  function weekday(key) { return WEEKDAY[parseKey(key).getDay()]; }

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
        var item = {
          id: ex.id.slice(0, MAX_NAME),
          name: name,
          load: num(ex.load, MAX_LOAD) || 0,
          unit: str(ex.unit, MAX_UNIT, 'kg'),
          sets: Math.min(MAX_SETS, Math.max(1, parseInt(ex.sets, 10) || 3)),
          reps: str(ex.reps, MAX_REPS, '10-12회'),
          rest: Math.min(MAX_REST, Math.max(0, parseInt(ex.rest, 10) || 60))
        };
        /* 부위 태그와 원판 표시 여부는 백업 왕복에서 잃지 않는다. */
        var cat = str(ex.cat, MAX_UNIT, null);
        if (cat) item.cat = cat;
        if (ex.plates) item.plates = true;
        list.push(item);
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

  /* ---------- 종목 검색 (초성 지원) ---------- */

  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  var HANGUL_FIRST = 0xac00;
  var HANGUL_LAST = 0xd7a3;
  var SYLLABLES_PER_CHO = 588;
  var CHOSUNG_ONLY = /^[ㄱ-ㅎ]+$/;
  var DEFAULT_LIMIT = 12;

  /* '벤치프레스' → 'ㅂㅊㅍㄹㅅ'. 한글이 아닌 글자는 그대로 둔다. */
  function chosung(s) {
    var src = String(s == null ? '' : s);
    var out = '';
    for (var i = 0; i < src.length; i++) {
      var code = src.charCodeAt(i);
      if (code >= HANGUL_FIRST && code <= HANGUL_LAST) {
        out += CHO.charAt(Math.floor((code - HANGUL_FIRST) / SYLLABLES_PER_CHO));
      } else {
        out += src.charAt(i);
      }
    }
    return out;
  }

  function isChosungQuery(q) { return CHOSUNG_ONLY.test(q); }

  /* 순위: 같은 단어로 이어지는 앞부분 일치 > 단어 경계 앞부분 일치 > 중간 일치 > 영문 별칭.
     '벤치' 로 검색하면 '벤치프레스' 가 '벤치 딥스' 보다 먼저 나와야 한다. */
  var HIT_PREFIX_WORD = 0;
  var HIT_PREFIX_BREAK = 1;
  var HIT_CONTAINS = 2;
  var HIT_ALIAS = 3;

  function prefixScore(haystack, q) {
    var next = haystack.charAt(q.length);
    return next === '' || next === ' ' ? HIT_PREFIX_BREAK : HIT_PREFIX_WORD;
  }

  function searchExercises(list, query, catId, limit) {
    var pool = (list || []).filter(function (e) {
      return !catId || e.cat === catId;
    });
    var q = String(query == null ? '' : query).trim().toLowerCase();
    var max = limit || DEFAULT_LIMIT;
    if (!q) return pool.slice(0, max);

    var byChosung = isChosungQuery(q);
    var hits = [];
    pool.forEach(function (e) {
      var score = -1;
      if (byChosung) {
        var cho = chosung(e.name);
        var ci = cho.indexOf(q);
        if (ci === 0) score = prefixScore(cho, q);
        else if (ci > 0) score = HIT_CONTAINS;
      } else {
        var name = e.name.toLowerCase();
        var ni = name.indexOf(q);
        if (ni === 0) score = prefixScore(name, q);
        else if (ni > 0) score = HIT_CONTAINS;
        else if (e.alias && e.alias.toLowerCase().indexOf(q) >= 0) score = HIT_ALIAS;
      }
      if (score >= 0) hits.push({ e: e, score: score });
    });
    hits.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      if (a.e.name.length !== b.e.name.length) return a.e.name.length - b.e.name.length;
      return a.e.name < b.e.name ? -1 : 1;
    });
    return hits.slice(0, max).map(function (h) { return h.e; });
  }

  /* ---------- 캘린더 ---------- */

  function setVolume(s) {
    return s && s.w != null && s.r != null ? s.w * s.r : 0;
  }

  /* 종목별로 흩어진 logs 를 날짜별로 뒤집는다. { '2026-08-07': {count, sets, volume, exercises} } */
  function buildCalendar(logs) {
    var out = {};
    Object.keys(logs || {}).forEach(function (exId) {
      var arr = logs[exId];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (e) {
        if (!e || !isDateKey(e.date) || !Array.isArray(e.sets)) return;
        var used = e.sets.filter(function (s) {
          return s && (s.w != null || s.r != null || s.done);
        });
        if (!used.length) return;
        var vol = used.reduce(function (a, s) { return a + setVolume(s); }, 0);
        var day = out[e.date] || (out[e.date] = {
          date: e.date, exercises: [], count: 0, sets: 0, volume: 0
        });
        day.exercises.push({ id: exId, sets: used, volume: vol, top: topSet(e) });
        day.count += 1;
        day.sets += used.length;
        day.volume += vol;
      });
    });
    return out;
  }

  /* 달력 격자. 앞뒤 빈 칸은 null. month 는 0-based. */
  function monthMatrix(year, month) {
    var startDow = new Date(year, month, 1).getDay();
    var total = new Date(year, month + 1, 0).getDate();
    var cells = [];
    for (var i = 0; i < startDow; i++) cells.push(null);
    for (var d = 1; d <= total; d++) cells.push(dateKey(new Date(year, month, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    var weeks = [];
    for (var j = 0; j < cells.length; j += 7) weeks.push(cells.slice(j, j + 7));
    return weeks;
  }

  function shiftMonth(year, month, delta) {
    var d = new Date(year, month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }

  function monthLabel(year, month) { return year + '년 ' + (month + 1) + '월'; }

  function monthStats(cal, year, month) {
    var prefix = year + '-' + pad2(month + 1) + '-';
    var days = 0, volume = 0, sets = 0;
    Object.keys(cal || {}).forEach(function (k) {
      if (k.indexOf(prefix) !== 0) return;
      days += 1;
      volume += cal[k].volume;
      sets += cal[k].sets;
    });
    return { days: days, volume: volume, sets: sets };
  }

  /* 한쪽만 있으면 '-×12' 대신 단위를 붙여 읽히게 쓴다. */
  function formatSetLine(sets) {
    return (sets || []).map(function (s) {
      if (s.w == null && s.r == null) return '✓';
      if (s.w == null) return s.r + '회';
      if (s.r == null) return s.w + 'kg';
      return s.w + '×' + s.r;
    }).join(', ');
  }

  var BYTE_UNITS = ['B', 'KB', 'MB', 'GB'];

  function formatBytes(n) {
    var v = Number(n);
    if (!isFinite(v) || v <= 0) return '0 B';
    var i = 0;
    while (v >= 1024 && i < BYTE_UNITS.length - 1) { v /= 1024; i += 1; }
    return (i === 0 ? Math.round(v) : v.toFixed(1)) + ' ' + BYTE_UNITS[i];
  }

  function formatNumber(n) {
    return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
    shiftDate: shiftDate,
    dayDiff: dayDiff,
    weekday: weekday,
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
    chosung: chosung,
    isChosungQuery: isChosungQuery,
    searchExercises: searchExercises,
    buildCalendar: buildCalendar,
    monthMatrix: monthMatrix,
    shiftMonth: shiftMonth,
    monthLabel: monthLabel,
    monthStats: monthStats,
    formatSetLine: formatSetLine,
    formatNumber: formatNumber,
    formatBytes: formatBytes,
    chartSVG: chartSVG
  };
});
