/* core.js 단위 테스트. 의존성 없음.
   실행: node test.js  (종료 코드 0 = 통과) */
'use strict';

var Gym = require('./core.js');

var passed = 0;
var failures = [];
var group = '';

function describe(name, fn){ group = name; fn(); }

function check(name, ok, detail){
  if (ok) { passed++; return; }
  failures.push(group + ' › ' + name + (detail ? '\n      ' + detail : ''));
}

function eq(name, actual, expected){
  var a = JSON.stringify(actual), b = JSON.stringify(expected);
  check(name, a === b, 'expected ' + b + '\n      actual   ' + a);
}

function ok(name, value){ check(name, !!value, 'expected truthy, got ' + JSON.stringify(value)); }

function kgs(plates){ return plates.map(function(p){ return p.kg; }); }

/* ---------- esc ---------- */
describe('esc', function(){
  eq('HTML 특수문자를 모두 이스케이프', Gym.esc('<a href="x">&\'</a>'),
     '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  eq('null 은 빈 문자열', Gym.esc(null), '');
  eq('숫자도 문자열로', Gym.esc(42), '42');
});

/* ---------- 날짜 ---------- */
describe('dateKey / shortDate', function(){
  eq('한 자리 월·일에 0 을 붙인다', Gym.dateKey(new Date(2026, 0, 5)), '2026-01-05');
  eq('두 자리는 그대로', Gym.dateKey(new Date(2026, 11, 31)), '2026-12-31');
  eq('연도를 떼고 슬래시로', Gym.shortDate('2026-08-07'), '08/07');
  ok('올바른 키를 통과시킨다', Gym.isDateKey('2026-08-07'));
  check('형식이 다르면 거른다', !Gym.isDateKey('2026-8-7'));
  check('문자열이 아니면 거른다', !Gym.isDateKey(20260807));
});

/* ---------- 날짜 이동 ---------- */
describe('shiftDate / dayDiff / weekday', function(){
  eq('하루 뒤', Gym.shiftDate('2026-08-10', 1), '2026-08-11');
  eq('하루 앞', Gym.shiftDate('2026-08-10', -1), '2026-08-09');
  eq('0 이면 그대로', Gym.shiftDate('2026-08-10', 0), '2026-08-10');
  eq('월 경계를 넘는다', Gym.shiftDate('2026-08-31', 1), '2026-09-01');
  eq('월 경계를 거슬러 넘는다', Gym.shiftDate('2026-09-01', -1), '2026-08-31');
  eq('연 경계를 넘는다', Gym.shiftDate('2026-12-31', 1), '2027-01-01');
  eq('연 경계를 거슬러 넘는다', Gym.shiftDate('2026-01-01', -1), '2025-12-31');
  eq('평년 2월 말', Gym.shiftDate('2026-02-28', 1), '2026-03-01');
  eq('윤년 2월 말', Gym.shiftDate('2024-02-28', 1), '2024-02-29');
  eq('여러 날 이동', Gym.shiftDate('2026-08-10', -40), '2026-07-01');

  eq('같은 날은 0', Gym.dayDiff('2026-08-10', '2026-08-10'), 0);
  eq('사흘 전이면 3', Gym.dayDiff('2026-08-07', '2026-08-10'), 3);
  eq('앞날이면 음수', Gym.dayDiff('2026-08-12', '2026-08-10'), -2);
  eq('월을 걸쳐도 맞는다', Gym.dayDiff('2026-07-31', '2026-08-01'), 1);
  eq('해를 걸쳐도 맞는다', Gym.dayDiff('2025-12-31', '2026-01-01'), 1);
  // 서머타임이 있는 지역에서 23시간/25시간 짜리 날에도 어긋나지 않아야 한다
  eq('봄 서머타임 구간', Gym.dayDiff('2026-03-07', '2026-03-09'), 2);
  eq('가을 서머타임 구간', Gym.dayDiff('2026-10-31', '2026-11-02'), 2);

  eq('2026-08-10 은 월요일', Gym.weekday('2026-08-10'), '월');
  eq('2026-08-09 는 일요일', Gym.weekday('2026-08-09'), '일');
  eq('2026-08-15 는 토요일', Gym.weekday('2026-08-15'), '토');

  // shiftDate 로 만든 키는 다시 isDateKey 를 통과해야 한다
  var k = '2026-08-05';
  for (var i = 0; i < 40; i++) {
    k = Gym.shiftDate(k, 1);
    if (!Gym.isDateKey(k)) break;
  }
  ok('40일을 이동해도 키 형식이 유지된다', Gym.isDateKey(k));
  eq('40일 뒤', k, '2026-09-14');
});

/* ---------- 홈 화면 계산 ---------- */
describe('weekDates', function(){
  // 2026-08-11 은 화요일 → 그 주는 08-09(일) ~ 08-15(토)
  var w = Gym.weekDates('2026-08-11');
  eq('7일', w.length, 7);
  eq('일요일에서 시작', w[0], '2026-08-09');
  eq('토요일에서 끝', w[6], '2026-08-15');
  eq('일요일을 주면 그 날이 첫날', Gym.weekDates('2026-08-09')[0], '2026-08-09');
  eq('토요일을 줘도 같은 주', Gym.weekDates('2026-08-15')[0], '2026-08-09');
  // 월 경계를 걸친 주
  eq('월을 걸친 주', Gym.weekDates('2026-09-01')[0], '2026-08-30');
});

describe('streakDays', function(){
  var cal = { '2026-08-09': {}, '2026-08-10': {}, '2026-08-11': {} };
  eq('오늘 포함 3일 연속', Gym.streakDays(cal, '2026-08-11'), 3);
  // 오늘 아직 안 했어도 어제까지의 연속은 살아 있다
  eq('오늘 비어도 어제부터 센다', Gym.streakDays(cal, '2026-08-12'), 3);
  eq('이틀 비면 0', Gym.streakDays(cal, '2026-08-13'), 0);
  eq('중간이 비면 거기서 끊긴다',
     Gym.streakDays({ '2026-08-08': {}, '2026-08-10': {}, '2026-08-11': {} }, '2026-08-11'), 2);
  eq('기록이 없으면 0', Gym.streakDays({}, '2026-08-11'), 0);
  eq('빈 입력도 안전', Gym.streakDays(null, '2026-08-11'), 0);
});

describe('lastDateForIds', function(){
  var logs = {
    a: [{ date: '2026-08-01', sets: [{ w: 40, r: 8 }] },
        { date: '2026-08-05', sets: [{ w: 45, r: 8 }] }],
    b: [{ date: '2026-08-09', sets: [{ w: 50, r: 5 }] }],
    c: [{ date: '2026-08-20', sets: [{ w: null, r: null, done: false }] }]
  };
  eq('여러 종목 중 가장 최근', Gym.lastDateForIds(logs, ['a', 'b']), '2026-08-09');
  eq('한 종목만', Gym.lastDateForIds(logs, ['a']), '2026-08-05');
  eq('빈 기록은 세지 않는다', Gym.lastDateForIds(logs, ['c']), null);
  eq('없는 종목은 null', Gym.lastDateForIds(logs, ['zzz']), null);
  eq('빈 목록도 안전', Gym.lastDateForIds(logs, []), null);
  eq('빈 입력도 안전', Gym.lastDateForIds(null, ['a']), null);
});

describe('relativeDay', function(){
  eq('오늘', Gym.relativeDay('2026-08-11', '2026-08-11'), '오늘');
  eq('어제', Gym.relativeDay('2026-08-10', '2026-08-11'), '어제');
  eq('며칠 전', Gym.relativeDay('2026-08-03', '2026-08-11'), '8일 전');
  eq('앞날은 null', Gym.relativeDay('2026-08-12', '2026-08-11'), null);
  eq('없으면 null', Gym.relativeDay(null, '2026-08-11'), null);
});

/* ---------- 원판 계산 ---------- */
describe('loadout', function(){
  eq('봉만이면 원판 없음', kgs(Gym.loadout(20)), []);
  eq('봉보다 가벼우면 원판 없음', kgs(Gym.loadout(15)), []);
  eq('60kg 는 한쪽 20', kgs(Gym.loadout(60)), [20]);
  eq('100kg 는 한쪽 25+15', kgs(Gym.loadout(100)), [25, 15]);
  eq('45kg 는 한쪽 10+2.5', kgs(Gym.loadout(45)), [10, 2.5]);
  eq('22.5kg 는 한쪽 1.25', kgs(Gym.loadout(22.5)), [1.25]);
  // 2.5 와 1.25 를 연달아 빼면 부동소수 오차가 남는다 — EPS 가 없으면 여기서 1.25 가 빠진다
  eq('27.5kg 는 한쪽 2.5+1.25', kgs(Gym.loadout(27.5)), [2.5, 1.25]);
  eq('같은 원판을 여러 장 쓴다', kgs(Gym.loadout(160)), [25, 25, 20]);
  eq('봉 무게를 바꿀 수 있다', kgs(Gym.loadout(30, 10)), [10]);
  eq('숫자가 아니면 빈 배열', kgs(Gym.loadout('abc')), []);

  var side = Gym.loadout(100);
  var sum = side.reduce(function(a, p){ return a + p.kg; }, 0);
  eq('한쪽 합 × 2 + 봉 = 총중량', sum * 2 + 20, 100);
});

describe('platesHTML', function(){
  eq('원판이 없으면 빈 문자열', Gym.platesHTML(20), '');
  var h = Gym.platesHTML(60);
  ok('원판 막대를 그린다', h.indexOf('class="plates"') >= 0);
  ok('한쪽 구성을 글로도 적는다', h.indexOf('봉 20kg + 한쪽 20') >= 0);
});

/* ---------- 기록 조회 ---------- */
var SAMPLE = {
  bench: [
    { date: '2026-01-01', sets: [{ w: 40, r: 8, done: true }, { w: 40, r: 7, done: true }] },
    { date: '2026-01-08', sets: [{ w: 42.5, r: 8, done: true }, { w: 45, r: 6, done: false }] },
    { date: '2026-01-15', sets: [{ w: null, r: null, done: false }] }
  ]
};

describe('entryFor / viewSets', function(){
  ok('날짜로 찾는다', Gym.entryFor(SAMPLE, 'bench', '2026-01-08') !== null);
  eq('없는 날짜는 null', Gym.entryFor(SAMPLE, 'bench', '2026-02-01'), null);
  eq('없는 종목은 null', Gym.entryFor(SAMPLE, 'nope', '2026-01-01'), null);

  eq('저장분이 없으면 빈 세트를 만들어 준다',
     Gym.viewSets(null, 2),
     [{ w: null, r: null, done: false }, { w: null, r: null, done: false }]);
  eq('모자란 만큼만 채운다',
     Gym.viewSets({ date: 'x', sets: [{ w: 40, r: 8, done: true }] }, 2),
     [{ w: 40, r: 8, done: true }, { w: null, r: null, done: false }]);

  var before = JSON.stringify(SAMPLE);
  Gym.viewSets(Gym.entryFor(SAMPLE, 'bench', '2026-01-15'), 4);
  eq('viewSets 는 원본 logs 를 건드리지 않는다', JSON.stringify(SAMPLE), before);
});

describe('isEmptyEntry', function(){
  ok('값이 하나도 없으면 빈 것', Gym.isEmptyEntry({ date: 'd', sets: [{ w: null, r: null, done: false }] }));
  check('중량이 있으면 안 빈 것', !Gym.isEmptyEntry({ date: 'd', sets: [{ w: 40, r: null, done: false }] }));
  check('반복수만 있어도 안 빈 것', !Gym.isEmptyEntry({ date: 'd', sets: [{ w: null, r: 10, done: false }] }));
  check('체크만 했어도 안 빈 것 (맨몸 종목)', !Gym.isEmptyEntry({ date: 'd', sets: [{ w: null, r: null, done: true }] }));
  ok('sets 가 없으면 빈 것', Gym.isEmptyEntry({ date: 'd' }));
  ok('null 도 빈 것', Gym.isEmptyEntry(null));
});

describe('세트 수 변경(n) 보존', function(){
  var withN = { x: [{ date: '2026-08-11', sets: [{ w: null, r: null, done: false }], n: 1 }] };
  check('n 이 있으면 값이 비어도 안 지운다', !Gym.isEmptyEntry(withN.x[0]));
  eq('pruneLogs 도 남긴다', Object.keys(Gym.pruneLogs(withN).logs), ['x']);
  ok('n 이 없으면 종전대로 지운다',
     Gym.isEmptyEntry({ date: '2026-08-11', sets: [{ w: null, r: null, done: false }] }));

  var round = Gym.sanitizeLogs({ x: [{ date: '2026-08-11', sets: [{w:null,r:null},{w:null,r:null}], n: 2 }] });
  eq('백업 왕복에서 n 이 남는다', round.x[0].n, 2);
  eq('n 은 실제 세트 수로 맞춘다', round.x[0].sets.length, 2);

  var noN = Gym.sanitizeLogs({ x: [{ date: '2026-08-11', sets: [{w:null,r:null}] }] });
  eq('n 없는 빈 엔트리는 여전히 버린다', Object.keys(noN), []);
});

describe('sanitizeCustom 이 grp 를 보존', function(){
  var warm = Gym.sanitizeCustom({ d1: [{ id: 'a', name: '로테이션', grp: 'warm' }] }).d1[0];
  eq('웜업 그룹이 남는다', warm.grp, 'warm');
  var main = Gym.sanitizeCustom({ d1: [{ id: 'b', name: '벤치', grp: 'main' }] }).d1[0];
  eq('메인은 필드를 안 남긴다', main.grp, undefined);
  var bad = Gym.sanitizeCustom({ d1: [{ id: 'c', name: '이상', grp: '<script>' }] }).d1[0];
  eq('이상한 값은 무시', bad.grp, undefined);
});

describe('pruneLogs', function(){
  var res = Gym.pruneLogs(SAMPLE);
  eq('빈 엔트리를 걷어낸다', res.logs.bench.length, 2);
  eq('걷어낸 개수를 알려준다', res.removed, 1);
  eq('원본은 그대로', SAMPLE.bench.length, 3);

  var allEmpty = { x: [{ date: '2026-01-01', sets: [{ w: null, r: null, done: false }] }] };
  eq('전부 비면 종목 키까지 지운다', Object.keys(Gym.pruneLogs(allEmpty).logs), []);

  eq('배열이 아닌 값은 버린다', Object.keys(Gym.pruneLogs({ bad: 'oops' }).logs), []);
  eq('빈 입력도 안전', Gym.pruneLogs(null), { logs: {}, removed: 0 });
});

describe('prevEntry', function(){
  var p = Gym.prevEntry(SAMPLE, 'bench', '2026-01-15');
  eq('직전 세션을 고른다', p.date, '2026-01-08');
  eq('오늘 이전이 없으면 null', Gym.prevEntry(SAMPLE, 'bench', '2026-01-01'), null);
  eq('값이 없는 세션은 건너뛴다', Gym.prevEntry(SAMPLE, 'bench', '2026-01-20').date, '2026-01-08');
  eq('없는 종목은 null', Gym.prevEntry(SAMPLE, 'nope', '2026-01-15'), null);
});

describe('topSet', function(){
  eq('최고 중량을 고른다', Gym.topSet(SAMPLE.bench[1]), 45);
  eq('중량이 없으면 null', Gym.topSet(SAMPLE.bench[2]), null);
  eq('null 도 안전', Gym.topSet(null), null);
  eq('0kg 도 값으로 친다', Gym.topSet({ sets: [{ w: 0, r: 10 }] }), 0);
});

describe('formatPrev', function(){
  eq('중량이 같으면 한 번만 적는다', Gym.formatPrev(SAMPLE.bench[0]), '01/01 · 40kg × 8,7');
  eq('중량이 다르면 반복수만', Gym.formatPrev(SAMPLE.bench[1]), '01/08 · 8,6회');
  eq('값이 없으면 null', Gym.formatPrev(SAMPLE.bench[2]), null);
  eq('null 도 null', Gym.formatPrev(null), null);
});

/* ---------- 백업 검증 ---------- */
describe('sanitizeLogs', function(){
  eq('객체가 아니면 빈 객체', Gym.sanitizeLogs('nope'), {});
  eq('배열이 아닌 종목은 버린다', Gym.sanitizeLogs({ a: 'x' }), {});
  eq('날짜 형식이 틀리면 버린다', Gym.sanitizeLogs({ a: [{ date: '26-1-1', sets: [] }] }), {});
  eq('sets 가 배열이 아니면 버린다', Gym.sanitizeLogs({ a: [{ date: '2026-01-01', sets: 'x' }] }), {});
  eq('빈 엔트리는 들여오지 않는다',
     Gym.sanitizeLogs({ a: [{ date: '2026-01-01', sets: [{ w: null, r: null }] }] }), {});

  eq('정상 값은 그대로',
     Gym.sanitizeLogs({ a: [{ date: '2026-01-01', sets: [{ w: 40, r: 8, done: true }] }] }),
     { a: [{ date: '2026-01-01', sets: [{ w: 40, r: 8, done: true }] }] });

  eq('범위를 벗어난 중량은 null 로',
     Gym.sanitizeLogs({ a: [{ date: '2026-01-01', sets: [{ w: 99999, r: 8 }] }] }),
     { a: [{ date: '2026-01-01', sets: [{ w: null, r: 8, done: false }] }] });

  eq('음수 중량도 null 로',
     Gym.sanitizeLogs({ a: [{ date: '2026-01-01', sets: [{ w: -5, r: 8 }] }] }),
     { a: [{ date: '2026-01-01', sets: [{ w: null, r: 8, done: false }] }] });

  eq('문자열 숫자는 받아준다',
     Gym.sanitizeLogs({ a: [{ date: '2026-01-01', sets: [{ w: '40', r: '8' }] }] }),
     { a: [{ date: '2026-01-01', sets: [{ w: 40, r: 8, done: false }] }] });

  var many = [];
  for (var i = 0; i < 50; i++) many.push({ w: 10, r: 5 });
  eq('세트 수 상한을 지킨다',
     Gym.sanitizeLogs({ a: [{ date: '2026-01-01', sets: many }] }).a[0].sets.length, 20);
});

describe('sanitizeCustom', function(){
  eq('객체가 아니면 빈 객체', Gym.sanitizeCustom(null), {});
  eq('id 가 없으면 버린다', Gym.sanitizeCustom({ d1: [{ name: 'x' }] }), {});
  eq('이름이 비면 버린다', Gym.sanitizeCustom({ d1: [{ id: 'a', name: '   ' }] }), {});

  eq('빠진 값은 기본값으로',
     Gym.sanitizeCustom({ d1: [{ id: 'a', name: '풀오버' }] }),
     { d1: [{ id: 'a', name: '풀오버', load: 0, unit: 'kg', sets: 3, reps: '10-12회', rest: 60 }] });

  var clamped = Gym.sanitizeCustom({ d1: [{ id: 'a', name: 'x', sets: 999, rest: 99999, load: 5000 }] }).d1[0];
  eq('세트 수를 상한으로 자른다', clamped.sets, 20);
  eq('휴식 시간을 상한으로 자른다', clamped.rest, 900);
  eq('범위 밖 중량은 0', clamped.load, 0);

  var neg = Gym.sanitizeCustom({ d1: [{ id: 'a', name: 'x', sets: -3, rest: -10 }] }).d1[0];
  eq('음수 세트는 최소 1', neg.sets, 1);
  eq('음수 휴식은 0', neg.rest, 0);
});

/* ---------- 병합 ---------- */
describe('mergeLogs', function(){
  var base = { a: [{ date: '2026-01-01', sets: [{ w: 40, r: 8, done: true }] }] };
  var inc  = { a: [{ date: '2026-01-01', sets: [{ w: 50, r: 5, done: true }] },
                   { date: '2026-01-08', sets: [{ w: 45, r: 6, done: true }] }],
               b: [{ date: '2026-01-02', sets: [{ w: 20, r: 10, done: true }] }] };
  var out = Gym.mergeLogs(base, inc);

  eq('같은 날짜는 들여온 쪽이 이긴다', out.a[0].sets[0].w, 50);
  eq('새 날짜는 추가된다', out.a.length, 2);
  eq('날짜순으로 정렬된다', out.a.map(function(e){ return e.date; }), ['2026-01-01', '2026-01-08']);
  eq('없던 종목도 들어온다', out.b.length, 1);
  eq('원본 base 는 그대로', base.a[0].sets[0].w, 40);
  eq('원본 base 길이도 그대로', base.a.length, 1);

  eq('빈 입력도 안전', Gym.mergeLogs(null, null), {});
  eq('base 만 있어도 동작', Object.keys(Gym.mergeLogs(base, null)), ['a']);
});

describe('mergeCustom', function(){
  var base = { d1: [{ id: 'x1', name: '옛이름', sets: 3 }] };
  var inc  = { d1: [{ id: 'x1', name: '새이름', sets: 4 }, { id: 'x2', name: '추가', sets: 3 }],
               d2: [{ id: 'y1', name: '다른날', sets: 3 }] };
  var out = Gym.mergeCustom(base, inc);

  eq('같은 id 는 들여온 쪽이 이긴다', out.d1[0].name, '새이름');
  eq('새 종목은 추가된다', out.d1.length, 2);
  eq('없던 날도 들어온다', out.d2.length, 1);
  eq('원본 base 는 그대로', base.d1[0].name, '옛이름');
});

/* ---------- 내 종목 · 내 루틴 ---------- */
describe('sanitizeLibrary', function(){
  eq('배열이 아니면 빈 배열', Gym.sanitizeLibrary(null), []);
  eq('id 가 없으면 버린다', Gym.sanitizeLibrary([{ name: 'x' }]), []);
  eq('이름이 비면 버린다', Gym.sanitizeLibrary([{ id: 'a', name: '  ' }]), []);

  var one = Gym.sanitizeLibrary([{ id: 'my-1', name: '케이블 로우', cat: 'back' }])[0];
  eq('부위가 남는다', one.cat, 'back');
  eq('빠진 값은 기본값', [one.load, one.unit, one.sets, one.reps, one.rest],
     [0, 'kg', 3, '10-12회', 60]);

  var dup = Gym.sanitizeLibrary([{ id: 'a', name: '첫번째' }, { id: 'a', name: '중복' }]);
  eq('id 중복은 하나만', dup.length, 1);
  eq('먼저 온 게 남는다', dup[0].name, '첫번째');

  var clamped = Gym.sanitizeLibrary([{ id: 'a', name: 'x', sets: 999, rest: 99999, load: 5000 }])[0];
  eq('세트 상한', clamped.sets, 20);
  eq('휴식 상한', clamped.rest, 900);
  eq('범위 밖 중량은 0', clamped.load, 0);
});

describe('mergeLibrary', function(){
  var base = [{ id: 'a', name: '옛이름' }];
  var inc  = [{ id: 'a', name: '새이름' }, { id: 'b', name: '추가' }];
  var out = Gym.mergeLibrary(base, inc);
  eq('같은 id 는 들여온 쪽', out[0].name, '새이름');
  eq('새 종목은 추가', out.length, 2);
  eq('원본은 그대로', base[0].name, '옛이름');
  eq('빈 입력도 안전', Gym.mergeLibrary(null, null), []);
});

describe('sanitizeRoutines / mergeRoutines', function(){
  eq('배열이 아니면 빈 배열', Gym.sanitizeRoutines('x'), []);
  eq('id·이름이 있어야 남는다', Gym.sanitizeRoutines([{ id: 'r1' }, { name: '이름만' }]), []);
  eq('정상 값', Gym.sanitizeRoutines([{ id: 'r1', name: '팔 집중' }]), [{ id: 'r1', name: '팔 집중' }]);
  eq('군더더기 필드는 버린다',
     Gym.sanitizeRoutines([{ id: 'r1', name: 'x', evil: '<script>' }])[0], { id: 'r1', name: 'x' });
  eq('id 중복은 하나만', Gym.sanitizeRoutines([{ id: 'r1', name: 'a' }, { id: 'r1', name: 'b' }]).length, 1);

  var out = Gym.mergeRoutines([{ id: 'r1', name: '옛' }], [{ id: 'r1', name: '새' }, { id: 'r2', name: '둘' }]);
  eq('같은 id 는 들여온 쪽', out[0].name, '새');
  eq('새 루틴은 추가', out.length, 2);
});

/* ---------- 이름으로 묶은 추이 ---------- */
describe('seriesByName', function(){
  var names = { 'd1-bench': '벤치프레스', 'lib-bench': '벤치프레스', 'd1-row': '바벨로우' };
  var nameOf = function(id){ return names[id] || id; };

  var split = {
    'd1-bench':  [{ date: '2026-08-05', sets: [{ w: 50, r: 8 }] }],
    'lib-bench': [{ date: '2026-08-09', sets: [{ w: 52.5, r: 8 }] }],
    'd1-row':    [{ date: '2026-08-05', sets: [{ w: 40, r: 10 }] }]
  };
  var out = Gym.seriesByName(split, nameOf);

  // 내장 id 와 카탈로그 id 로 갈라져 있어도 한 종목으로 합쳐야 한다
  eq('갈라진 id 를 이름으로 합친다', out['벤치프레스'].length, 2);
  eq('날짜순 정렬', out['벤치프레스'].map(function(p){ return p.d; }),
     ['2026-08-05', '2026-08-09']);
  eq('값은 그날 최고 중량', out['벤치프레스'].map(function(p){ return p.v; }), [50, 52.5]);
  eq('다른 종목은 따로', out['바벨로우'].length, 1);

  // 같은 날 두 id 에 값이 있으면 무거운 쪽이 그날 대표
  var sameDay = {
    'a': [{ date: '2026-08-05', sets: [{ w: 50, r: 8 }] }],
    'b': [{ date: '2026-08-05', sets: [{ w: 60, r: 5 }] }]
  };
  eq('같은 날은 무거운 쪽', Gym.seriesByName(sameDay, function(){ return '벤치'; })['벤치'],
     [{ d: '2026-08-05', v: 60 }]);

  // 중량 없는 기록(맨몸)은 추이에 안 올린다
  var bw = { p: [{ date: '2026-08-05', sets: [{ w: null, r: null, done: true }] }] };
  eq('중량 없는 기록은 제외', Object.keys(Gym.seriesByName(bw, function(){ return '플랭크'; })), []);

  eq('빈 입력도 안전', Gym.seriesByName(null, nameOf), {});
  eq('배열 아닌 값은 무시', Gym.seriesByName({ x: 'oops' }, nameOf), {});
  var badDate = { x: [{ date: 'nope', sets: [{ w: 50, r: 5 }] }] };
  eq('날짜 형식이 틀리면 무시', Object.keys(Gym.seriesByName(badDate, function(){ return 'x'; })), []);
});

/* ---------- 그래프 ---------- */
describe('chartSVG', function(){
  ok('빈 시리즈는 안내 문구', Gym.chartSVG([]).indexOf('기록이 2회 이상') >= 0);
  ok('1개도 안내 문구', Gym.chartSVG([{ d: '2026-01-01', v: 40 }]).indexOf('기록이 2회 이상') >= 0);

  var svg = Gym.chartSVG([
    { d: '2026-01-01', v: 40 },
    { d: '2026-01-08', v: 45 },
    { d: '2026-01-15', v: 42 }
  ]);
  ok('SVG 를 그린다', svg.indexOf('<svg') === 0);
  ok('꺾은선 경로가 있다', /<path[^>]*d="M/.test(svg));
  // 첫·마지막 축 라벨은 가운데 정렬이면 그림 밖으로 잘린다
  ok('첫 라벨은 왼쪽 정렬', svg.indexOf('text-anchor="start"') >= 0);
  ok('마지막 라벨은 오른쪽 정렬', svg.indexOf('text-anchor="end"') >= 0);
  ok('점을 3개 찍는다', svg.split('<circle').length - 1 === 3);
  ok('스크린리더용 라벨이 있다', svg.indexOf('role="img"') >= 0);
  ok('NaN 좌표가 없다', svg.indexOf('NaN') < 0);

  // 모든 값이 같으면 (mx - mn) 이 0 이 돼서 y() 가 0 나누기로 깨질 수 있다
  var flat = Gym.chartSVG([{ d: '2026-01-01', v: 40 }, { d: '2026-01-08', v: 40 }]);
  ok('값이 전부 같아도 깨지지 않는다', flat.indexOf('NaN') < 0 && flat.indexOf('<svg') === 0);

  var zero = Gym.chartSVG([{ d: '2026-01-01', v: 0 }, { d: '2026-01-08', v: 0 }]);
  ok('0kg 만 있어도 깨지지 않는다', zero.indexOf('NaN') < 0);
});

/* ---------- 종목 카탈로그 ---------- */
var Lib = require('./exercises.js');

describe('exercises 카탈로그', function(){
  ok('종목이 100개 이상 등록돼 있다', Lib.ALL.length >= 100);
  eq('부위는 8개', Lib.CATEGORIES.length, 8);

  var ids = {}, dupIds = [], names = {}, dupNames = [];
  Lib.ALL.forEach(function(e){
    if (ids[e.id]) dupIds.push(e.id); else ids[e.id] = 1;
    if (names[e.name]) dupNames.push(e.name); else names[e.name] = 1;
  });
  eq('id 중복 없음', dupIds, []);
  eq('이름 중복 없음', dupNames, []);

  var catIds = Lib.CATEGORIES.map(function(c){ return c.id; });
  var orphans = Lib.ALL.filter(function(e){ return catIds.indexOf(e.cat) < 0; })
                       .map(function(e){ return e.id; });
  eq('모든 종목이 유효한 부위에 속한다', orphans, []);

  var bad = Lib.ALL.filter(function(e){
    return !e.name || !e.reps || typeof e.sets !== 'number' || e.sets < 1
        || typeof e.rest !== 'number' || e.rest < 0 || typeof e.load !== 'number';
  }).map(function(e){ return e.id; });
  eq('필수 필드가 빠진 종목 없음', bad, []);

  eq('id 에 lib- 접두어가 붙는다', Lib.ALL[0].id.slice(0, 4), 'lib-');
  ok('BY_ID 로 찾을 수 있다', Lib.BY_ID['lib-bench'].name === '벤치프레스');

  catIds.forEach(function(c){
    ok(c + ' 부위에 종목이 있다', Lib.byCategory(c).length > 0);
  });
  eq('부위 이름을 돌려준다', Lib.categoryName('chest'), '가슴');
  eq('없는 부위는 빈 문자열', Lib.categoryName('nope'), '');

  // 카탈로그에서 고른 종목이 그대로 custom 으로 저장돼도 검증을 통과해야 한다
  var round = Gym.sanitizeCustom({ d1: [Lib.BY_ID['lib-bench']] }).d1[0];
  eq('백업 왕복에서 부위가 남는다', round.cat, 'chest');
  eq('백업 왕복에서 원판 표시가 남는다', round.plates, true);
  eq('백업 왕복에서 이름이 남는다', round.name, '벤치프레스');
});

/* ---------- 초성 검색 ---------- */
describe('chosung', function(){
  eq('한글을 초성으로', Gym.chosung('벤치프레스'), 'ㅂㅊㅍㄹㅅ');
  eq('받침이 있어도 초성만', Gym.chosung('백스쿼트'), 'ㅂㅅㅋㅌ');
  eq('된소리 초성', Gym.chosung('딥스'), 'ㄷㅅ');
  eq('한글이 아니면 그대로', Gym.chosung('EZ바 컬'), 'EZㅂ ㅋ');
  eq('빈 값도 안전', Gym.chosung(null), '');
  ok('초성 질의를 알아본다', Gym.isChosungQuery('ㅂㅊ'));
  check('완성형은 초성 질의가 아니다', !Gym.isChosungQuery('벤치'));
});

describe('searchExercises', function(){
  var L = Lib.ALL;

  eq('질의가 없으면 앞에서부터 채운다', Gym.searchExercises(L, '', null, 5).length, 5);

  var bench = Gym.searchExercises(L, '벤치', null, 20);
  ok('이름 일부로 찾는다', bench.length > 0);
  // '벤치 딥스' 도 '벤치' 로 시작하지만, 같은 단어로 이어지는 쪽이 우선
  eq('앞부분이 일치하면 먼저 나온다', bench[0].name, '벤치프레스');
  ok('단어가 끊기는 후보도 결과에는 들어간다',
     bench.some(function(e){ return e.name === '벤치 딥스'; }));

  var cho = Gym.searchExercises(L, 'ㅂㅊㅍㄹㅅ', null, 5);
  eq('초성으로 찾는다', cho[0].name, '벤치프레스');

  var partial = Gym.searchExercises(L, 'ㅅㅋㅌ', null, 30);
  ok('부분 초성도 찾는다', partial.some(function(e){ return e.name === '고블릿 스쿼트'; }));

  var eng = Gym.searchExercises(L, 'deadlift', null, 5);
  ok('영문 별칭으로 찾는다', eng.some(function(e){ return e.name === '데드리프트'; }));

  var caps = Gym.searchExercises(L, 'DEADLIFT', null, 5);
  ok('영문 대소문자를 가리지 않는다', caps.length > 0);

  var legs = Gym.searchExercises(L, '', 'legs', 100);
  eq('부위로 거른다', legs.filter(function(e){ return e.cat !== 'legs'; }), []);
  ok('하체 종목이 여러 개', legs.length > 10);

  var narrowed = Gym.searchExercises(L, '컬', 'biceps', 100);
  eq('부위 + 질의를 함께 적용', narrowed.filter(function(e){ return e.cat !== 'biceps'; }), []);
  ok('이두 컬이 잡힌다', narrowed.length > 0);

  eq('없는 종목은 빈 배열', Gym.searchExercises(L, '존재하지않는종목', null, 5), []);
  eq('상한을 지킨다', Gym.searchExercises(L, '', null, 3).length, 3);
  eq('빈 목록도 안전', Gym.searchExercises(null, '벤치', null, 5), []);
});

/* ---------- 캘린더 ---------- */
var CAL_LOGS = {
  bench: [
    { date: '2026-08-03', sets: [{ w: 40, r: 10, done: true }, { w: 40, r: 8, done: true }] },
    { date: '2026-08-10', sets: [{ w: 45, r: 8, done: true }] }
  ],
  squat: [
    { date: '2026-08-03', sets: [{ w: 60, r: 5, done: true }] },
    { date: '2026-09-01', sets: [{ w: 65, r: 5, done: true }] }
  ],
  plank: [
    { date: '2026-08-10', sets: [{ w: null, r: null, done: true }] }
  ],
  junk: 'not-an-array'
};

describe('buildCalendar', function(){
  var cal = Gym.buildCalendar(CAL_LOGS);

  eq('날짜별로 묶는다', Object.keys(cal).sort(), ['2026-08-03', '2026-08-10', '2026-09-01']);
  eq('그날 한 종목 수', cal['2026-08-03'].count, 2);
  eq('그날 세트 수', cal['2026-08-03'].sets, 3);
  // 40×10 + 40×8 + 60×5 = 400 + 320 + 300
  eq('볼륨은 중량×반복의 합', cal['2026-08-03'].volume, 1020);
  eq('최고 중량도 담는다', cal['2026-08-03'].exercises[0].top, 40);

  eq('체크만 한 맨몸 종목도 센다', cal['2026-08-10'].count, 2);
  eq('반복수가 없는 세트는 볼륨에 0으로 들어간다', cal['2026-08-10'].volume, 45 * 8);

  eq('배열이 아닌 값은 무시', 'junk' in cal, false);
  eq('빈 입력도 안전', Gym.buildCalendar(null), {});

  var emptyOnly = Gym.buildCalendar({ x: [{ date: '2026-08-01', sets: [{ w: null, r: null, done: false }] }] });
  eq('값 없는 날은 달력에 안 올린다', Object.keys(emptyOnly), []);

  var badDate = Gym.buildCalendar({ x: [{ date: 'nope', sets: [{ w: 10, r: 10 }] }] });
  eq('날짜 형식이 틀리면 무시', Object.keys(badDate), []);
});

describe('monthMatrix', function(){
  // 2026-08-01 은 토요일 → 첫 주는 앞에 6칸이 빈다
  var aug = Gym.monthMatrix(2026, 7);
  eq('한 주는 7칸', aug[0].length, 7);
  eq('첫 날 앞의 빈 칸', aug[0].slice(0, 6), [null, null, null, null, null, null]);
  eq('첫 날은 토요일 자리', aug[0][6], '2026-08-01');

  var flat = [].concat.apply([], aug).filter(Boolean);
  eq('8월은 31일', flat.length, 31);
  eq('마지막 날', flat[flat.length - 1], '2026-08-31');
  eq('격자는 항상 7의 배수', [].concat.apply([], aug).length % 7, 0);

  var feb = [].concat.apply([], Gym.monthMatrix(2026, 1)).filter(Boolean);
  eq('평년 2월은 28일', feb.length, 28);
  var feb2024 = [].concat.apply([], Gym.monthMatrix(2024, 1)).filter(Boolean);
  eq('윤년 2월은 29일', feb2024.length, 29);
});

describe('shiftMonth / monthLabel / monthStats', function(){
  eq('다음 달', Gym.shiftMonth(2026, 7, 1), { year: 2026, month: 8 });
  eq('12월에서 넘기면 해가 바뀐다', Gym.shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  eq('1월에서 뒤로 가면 작년', Gym.shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  eq('여러 달 건너뛰기', Gym.shiftMonth(2026, 7, -9), { year: 2025, month: 10 });

  eq('라벨은 1-based 로 표시', Gym.monthLabel(2026, 7), '2026년 8월');

  var cal = Gym.buildCalendar(CAL_LOGS);
  var aug = Gym.monthStats(cal, 2026, 7);
  eq('그 달 운동한 날', aug.days, 2);
  // 8/3 에 3세트(벤치 2 + 스쿼트 1), 8/10 에 2세트(벤치 1 + 플랭크 1)
  eq('그 달 총 세트', aug.sets, 5);
  eq('그 달 총 볼륨', aug.volume, 1020 + 360);

  var sep = Gym.monthStats(cal, 2026, 8);
  eq('다른 달은 따로 센다', sep.days, 1);
  eq('기록 없는 달은 0', Gym.monthStats(cal, 2026, 0), { days: 0, volume: 0, sets: 0 });

  // 한 자리 월이 두 자리 월에 섞이면 안 된다 ('2026-1-' 로 자르면 2026-10-* 가 걸린다)
  var octOnly = Gym.buildCalendar({ x: [{ date: '2026-10-05', sets: [{ w: 10, r: 10 }] }] });
  eq('1월 조회가 10월 기록을 끌어오지 않는다', Gym.monthStats(octOnly, 2026, 0).days, 0);
  eq('10월은 제대로 센다', Gym.monthStats(octOnly, 2026, 9).days, 1);
});

describe('formatSetLine / formatNumber', function(){
  eq('중량×반복으로 적는다',
     Gym.formatSetLine([{ w: 40, r: 10 }, { w: 45, r: 8 }]), '40×10, 45×8');
  // '-×12' 는 뭘 뜻하는지 안 읽힌다. 한쪽만 있으면 단위를 붙인다.
  eq('중량만 있으면 kg', Gym.formatSetLine([{ w: 40, r: null }]), '40kg');
  eq('횟수만 있으면 회', Gym.formatSetLine([{ w: null, r: 12 }]), '12회');
  eq('섞여 있어도 각각', Gym.formatSetLine([{ w: 40, r: 8 }, { w: null, r: 12 }, { w: 45, r: null }]),
     '40×8, 12회, 45kg');
  eq('체크만 한 세트는 표시만', Gym.formatSetLine([{ w: null, r: null, done: true }]), '✓');
  eq('0kg 은 대시가 아니라 0', Gym.formatSetLine([{ w: 0, r: 12 }]), '0×12');
  eq('빈 배열은 빈 문자열', Gym.formatSetLine([]), '');

  eq('천 단위 구분', Gym.formatNumber(1020), '1,020');
  eq('백만 단위', Gym.formatNumber(1234567), '1,234,567');
  eq('세 자리 이하는 그대로', Gym.formatNumber(999), '999');
  eq('0 도 안전', Gym.formatNumber(0), '0');
  eq('빈 값은 0', Gym.formatNumber(null), '0');
  eq('소수는 반올림', Gym.formatNumber(1020.6), '1,021');
});

describe('formatBytes', function(){
  eq('바이트는 정수로', Gym.formatBytes(512), '512 B');
  eq('경계값 1023', Gym.formatBytes(1023), '1023 B');
  eq('1024 는 KB 로 넘어간다', Gym.formatBytes(1024), '1.0 KB');
  eq('킬로바이트', Gym.formatBytes(2048), '2.0 KB');
  eq('메가바이트', Gym.formatBytes(5 * 1024 * 1024), '5.0 MB');
  eq('기가바이트', Gym.formatBytes(3 * 1024 * 1024 * 1024), '3.0 GB');
  eq('GB 를 넘어도 GB 로 표기', Gym.formatBytes(5000 * 1024 * 1024 * 1024), '5000.0 GB');
  eq('0 은 0 B', Gym.formatBytes(0), '0 B');
  eq('음수도 0 B', Gym.formatBytes(-5), '0 B');
  eq('숫자가 아니면 0 B', Gym.formatBytes(null), '0 B');
  eq('NaN 도 0 B', Gym.formatBytes('abc'), '0 B');
});

/* ---------- 하루 요약 (시간 · 메모) ---------- */
describe('formatDuration', function(){
  eq('한 시간 미만은 분', Gym.formatDuration(40), '40분');
  eq('정확히 한 시간', Gym.formatDuration(60), '1시간');
  eq('시간 + 분', Gym.formatDuration(95), '1시간 35분');
  eq('두 시간 정각', Gym.formatDuration(120), '2시간');
  eq('0 은 없음', Gym.formatDuration(0), null);
  eq('음수도 없음', Gym.formatDuration(-5), null);
  eq('null 도 없음', Gym.formatDuration(null), null);
  eq('문자열 숫자는 받는다', Gym.formatDuration('40'), '40분');
});

describe('sanitizeDays', function(){
  eq('객체가 아니면 빈 객체', Gym.sanitizeDays(null), {});
  eq('날짜 형식이 틀리면 버린다', Gym.sanitizeDays({ 'x': { min: 40 } }), {});
  eq('정상 값', Gym.sanitizeDays({ '2026-08-11': { min: 40, memo: '좋았음' } }),
     { '2026-08-11': { min: 40, memo: '좋았음' } });
  eq('시간만 있어도 남는다', Gym.sanitizeDays({ '2026-08-11': { min: 40 } }),
     { '2026-08-11': { min: 40 } });
  eq('메모만 있어도 남는다', Gym.sanitizeDays({ '2026-08-11': { memo: 'ㅇㅇ' } }),
     { '2026-08-11': { memo: 'ㅇㅇ' } });
  eq('둘 다 비면 버린다', Gym.sanitizeDays({ '2026-08-11': { min: 0, memo: '   ' } }), {});
  eq('상한을 넘는 시간은 자른다',
     Gym.sanitizeDays({ '2026-08-11': { min: 99999 } })['2026-08-11'].min, 1440);
  eq('메모는 500자까지',
     Gym.sanitizeDays({ '2026-08-11': { memo: 'ㅁ'.repeat(900) } })['2026-08-11'].memo.length, 500);
  eq('메모 앞뒤 공백 제거',
     Gym.sanitizeDays({ '2026-08-11': { memo: '  적었다  ' } })['2026-08-11'].memo, '적었다');
});

describe('mergeDays / pruneDays', function(){
  var base = { '2026-08-10': { min: 30 }, '2026-08-11': { memo: '옛' } };
  var inc  = { '2026-08-11': { memo: '새' }, '2026-08-12': { min: 50 } };
  var out = Gym.mergeDays(base, inc);
  eq('같은 날짜는 들여온 쪽', out['2026-08-11'].memo, '새');
  eq('없던 날짜는 추가', out['2026-08-12'].min, 50);
  eq('기존 날짜는 유지', out['2026-08-10'].min, 30);
  eq('원본은 그대로', base['2026-08-11'].memo, '옛');
  eq('빈 입력도 안전', Gym.mergeDays(null, null), {});

  eq('빈 날은 걷어낸다',
     Object.keys(Gym.pruneDays({ a: { min: 0 }, '2026-08-11': { min: 40 } })), ['2026-08-11']);
});

describe('1RM 추정 · 지표별 추이', function(){
  eq('Epley: 1회는 그대로', Gym.estimate1RM(100, 1), 103.3);
  eq('50kg 10회', Gym.estimate1RM(50, 10), 66.7);
  eq('50kg 5회', Gym.estimate1RM(50, 5), 58.3);
  // 반복수가 늘면 추정 1RM 도 오른다 — 최고중량만 보면 안 보이는 발전
  ok('45x10 이 45x8 보다 높다', Gym.estimate1RM(45, 10) > Gym.estimate1RM(45, 8));
  eq('중량이 없으면 null', Gym.estimate1RM(null, 10), null);
  eq('반복수가 없으면 null', Gym.estimate1RM(50, null), null);
  eq('0회는 null', Gym.estimate1RM(50, 0), null);
  eq('0kg 은 null', Gym.estimate1RM(0, 10), null);

  var e = { date: '2026-08-11', sets: [{ w: 40, r: 10 }, { w: 50, r: 5 }] };
  eq('최고 중량', Gym.entryMetric(e, 'top'), 50);
  eq('볼륨은 합', Gym.entryMetric(e, 'volume'), 40*10 + 50*5);
  eq('1RM 은 세트 중 최대', Gym.entryMetric(e, 'e1rm'), Gym.estimate1RM(50, 5));
  eq('지표를 안 주면 최고 중량', Gym.entryMetric(e), 50);

  var names = { a: '벤치', b: '벤치' };
  var logs = {
    a: [{ date: '2026-08-01', sets: [{ w: 40, r: 10 }] }],
    b: [{ date: '2026-08-01', sets: [{ w: 50, r: 5 }] }]
  };
  var nameOf = function(id){ return names[id]; };
  // 같은 날 두 id — 볼륨은 합치고 최고중량은 더 높은 쪽
  eq('볼륨은 합친다', Gym.seriesByName(logs, nameOf, 'volume')['벤치'][0].v, 400 + 250);
  eq('최고중량은 큰 쪽', Gym.seriesByName(logs, nameOf, 'top')['벤치'][0].v, 50);
});

describe('prByName', function(){
  var names = { a: '벤치', b: '벤치', c: '스쿼트' };
  var nameOf = function(id){ return names[id]; };
  var logs = {
    a: [{ date: '2026-08-01', sets: [{ w: 50, r: 8 }] },
        { date: '2026-08-08', sets: [{ w: 47.5, r: 10 }] }],
    b: [{ date: '2026-08-05', sets: [{ w: 55, r: 3 }] }],
    c: [{ date: '2026-08-02', sets: [{ w: 80, r: 5 }] }]
  };
  var pr = Gym.prByName(logs, nameOf);
  eq('갈라진 id 를 합쳐 최고를 찾는다', pr['벤치'], { w: 55, date: '2026-08-05' });
  eq('종목마다 따로', pr['스쿼트'], { w: 80, date: '2026-08-02' });

  var bw = { p: [{ date: '2026-08-01', sets: [{ w: null, r: null, done: true }] }] };
  eq('중량 없는 종목은 PR 없음', Object.keys(Gym.prByName(bw, function(){ return '플랭크'; })), []);
  eq('빈 입력도 안전', Gym.prByName(null, nameOf), {});
});

/* ---------- index.html 정합성 ----------
   실수로 함수를 통째로 날린 적이 있다(구간 잘라내기 리팩터). 구문 검사는
   통과하는데 화면만 죽어서 못 잡았다. 그래서 여기서 정적으로 확인한다. */
describe('index.html 무결성', function(){
  var fs = require('fs');
  var html = fs.readFileSync(__dirname + '/index.html', 'utf8');

  // 라우팅·핸들러가 부르는 함수는 반드시 정의돼 있어야 한다
  var required = [
    'render', 'renderSession', 'renderRoutineEdit', 'renderChips', 'renderNav', 'renderCalendar',
    'renderStats', 'renderTips', 'renderSettings', 'daySummaryHTML',
    'sumStatsHTML', 'refreshSummary', 'summaryDate', 'fillSettingsAsync',
    'checkUpdate', 'purgeCaches', 'applyTheme', 'setTheme', 'themeSegHTML',
    'logStats', 'storedBytes', 'addExercise', 'deleteExercise', 'addSet',
    'removeSet', 'moveExercise', 'applyOrder', 'newRoutine', 'renameRoutine',
    'deleteRoutine', 'setLogDate', 'exportData', 'importFile', 'resetAll',
    'barKg', 'prMap', 'allDays', 'searchPool', 'resolveExercise', 'sessionIds',
    'isStandalone', 'isIOS', 'installGuideHTML', 'doInstall',
    'setSession', 'loadRoutine', 'removeFromSession', 'routinePickerHTML',
    'isExerciseDone', 'sessionProgress', 'toggleExerciseDone', 'toggleDayDone',
    'startSwap', 'cancelSwap', 'applySwap', 'dayProgHTML', 'refreshProgress'
  ];
  var missing = required.filter(function(f){
    return html.indexOf('function ' + f + '(') < 0;
  });
  eq('render 계열 함수가 모두 정의돼 있다', missing, []);

  // 위임 셀렉터에 적힌 data-* 는 실제로 마크업에 있어야 한다
  var sel = html.match(/var CLICK_SELECTOR =([\s\S]*?);/);
  ok('CLICK_SELECTOR 를 찾았다', !!sel);
  var attrs = (sel[1].match(/\[data-([a-z]+)\]/g) || []).map(function(a){
    return a.slice(6, -1);
  });
  var unused = attrs.filter(function(a){
    return html.indexOf('data-' + a + '="') < 0;
  });
  eq('셀렉터의 data 속성이 모두 실제로 쓰인다', unused, []);

  /* 반대 방향도 본다. 버튼에 data-* 를 달아놓고 셀렉터에 안 넣으면
     눌러도 아무 일이 없는데 구문 검사로는 안 잡힌다 — 실제로 겪었다. */
  var PASSIVE = ['i', 'day', 'ex', 'w', 'r', 'theme'];  // 값 전달용, 위임 대상 아님
  var onButtons = {};
  var btn = /<button[^>]*>/g, mm;
  var buttonish = html.match(/'<button[^']*'/g) || [];
  buttonish.forEach(function(chunk){
    (chunk.match(/data-([a-z]+)="/g) || []).forEach(function(a){
      var name = a.slice(5, -2);
      if (PASSIVE.indexOf(name) < 0) onButtons[name] = 1;
    });
  });
  var notWired = Object.keys(onButtons).filter(function(a){
    return sel[1].indexOf('[data-' + a + ']') < 0;
  });
  eq('버튼에 쓴 data 속성이 모두 셀렉터에 있다', notWired, []);

  // 셀렉터에 있으면 핸들러도 있어야 한다
  var handlerless = attrs.filter(function(a){
    var camel = a.replace(/-([a-z])/g, function(_, c){ return c.toUpperCase(); });
    return html.indexOf('dataset.' + camel) < 0 && html.indexOf('"data-' + a + '"') < 0;
  });
  eq('셀렉터의 data 속성마다 핸들러가 있다', handlerless, []);

  /* findExercise 는 루틴+커스텀만 본다. 종목 교체로 들어온 카탈로그 id(lib-*)는
     거기 없어서 null 이 되고, 기록·세트 조작이 조용히 무시됐다.
     쓰기 경로는 반드시 resolveExercise 를 써야 한다. */
  var writers = ['addSet', 'removeSet', 'toggleSetDone', 'fillFromPrev'];
  var badLookup = writers.filter(function(fn){
    var body = html.slice(html.indexOf('function ' + fn + '('));
    return body.slice(0, body.indexOf('\n      }')).indexOf('findExercise(') >= 0;
  });
  eq('쓰기 경로가 resolveExercise 를 쓴다', badLookup, []);

  /* .row 를 .cardtop 으로 감싼 뒤로 parentNode 는 .card 가 아니다.
     open 클래스가 엉뚱한 곳에 붙어 카드가 안 펼쳐졌다. */
  ok('toggleCard 가 .card 를 직접 찾는다',
    /function toggleCard[\s\S]{0,400}?closest\("\.card"\)/.test(html));
  ok('toggleCard 가 parentNode 를 쓰지 않는다',
    !/function toggleCard[\s\S]{0,400}?rowEl\.parentNode/.test(html));

  // 타이머 예고음 · 종료음
  ok('tone 헬퍼가 있다', html.indexOf('function tone(freq, at, dur, vol)') >= 0);
  ok('예고음 함수가 있다', html.indexOf('function cue()') >= 0);
  ok('종료음 함수가 있다', html.indexOf('function fanfare()') >= 0);
  ok('종료 시 fanfare 를 부른다', /function finish\(\)[\s\S]{0,500}?fanfare\(\)/.test(html));
  ok('10초·3초 예고 상수가 있다',
    html.indexOf('TONE_CUE_1_MS = 10000') >= 0 && html.indexOf('TONE_CUE_2_MS = 3000') >= 0);
  ok('예고음은 한 번만 울린다', /!cued1[\s\S]{0,80}cued1 = true/.test(html));
  ok('시작 시 지난 구간은 울리지 않는다', html.indexOf('cued1 = sec * 1000 <= TONE_CUE_1_MS') >= 0);
  ok('fanfare 는 뚜 3번 + 띠 1번',
    (html.match(/tone\(TONE_CUE_HZ, 0\./g) || []).length === 3
    && html.indexOf('tone(TONE_END_HZ,') >= 0);

  // 진행 표시 재설계 — 마크업과 스타일이 짝을 이뤄야 한다
  ['pinfo', 'pbar', 'pbtn'].forEach(function(c){
    ok('.' + c + ' 마크업이 있다', html.indexOf('class="' + c + '"') >= 0);
    ok('.' + c + ' 스타일이 있다', new RegExp('\\.' + c + '\\s*[{,]').test(html));
  });

  /* 세트 체크는 포커스 유지를 위해 전체 리렌더를 안 한다.
     진행 막대를 따로 갈아끼우지 않으면 탭을 나갔다 와야 숫자가 맞았다. */
  ok('진행 표시가 한 곳에서만 만들어진다',
    (html.match(/class="dayprog/g) || []).length === 1);
  ok('renderSession 이 dayProgHTML 을 쓴다', html.indexOf('h += dayProgHTML(date);') >= 0);
  ok('세트 체크가 진행 막대를 갱신한다',
    /function toggleSetDone[\s\S]{0,900}?refreshProgress\(\)/.test(html));
});

/* ---------- 결과 ---------- */
if (failures.length){
  console.error('\n  실패 ' + failures.length + '건\n');
  failures.forEach(function(f){ console.error('  ✗ ' + f); });
  console.error('\n  ' + passed + ' passed, ' + failures.length + ' failed\n');
  process.exit(1);
}
console.log('\n  ✓ ' + passed + ' passed\n');
