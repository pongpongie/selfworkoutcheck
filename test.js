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
  ok('꺾은선 경로가 있다', svg.indexOf('<path d="M') >= 0);
  ok('점을 3개 찍는다', svg.split('<circle').length - 1 === 3);
  ok('스크린리더용 라벨이 있다', svg.indexOf('role="img"') >= 0);
  ok('NaN 좌표가 없다', svg.indexOf('NaN') < 0);

  // 모든 값이 같으면 (mx - mn) 이 0 이 돼서 y() 가 0 나누기로 깨질 수 있다
  var flat = Gym.chartSVG([{ d: '2026-01-01', v: 40 }, { d: '2026-01-08', v: 40 }]);
  ok('값이 전부 같아도 깨지지 않는다', flat.indexOf('NaN') < 0 && flat.indexOf('<svg') === 0);

  var zero = Gym.chartSVG([{ d: '2026-01-01', v: 0 }, { d: '2026-01-08', v: 0 }]);
  ok('0kg 만 있어도 깨지지 않는다', zero.indexOf('NaN') < 0);
});

/* ---------- 결과 ---------- */
if (failures.length){
  console.error('\n  실패 ' + failures.length + '건\n');
  failures.forEach(function(f){ console.error('  ✗ ' + f); });
  console.error('\n  ' + passed + ' passed, ' + failures.length + ' failed\n');
  process.exit(1);
}
console.log('\n  ✓ ' + passed + ' passed\n');
