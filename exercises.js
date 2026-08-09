/* exercises.js — 부위별 운동 종목 카탈로그. 순수 데이터.
   브라우저에서는 window.GymExercises, node 에서는 module.exports. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GymExercises = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CATEGORIES = [
    { id: "chest", name: "가슴", color: "#B72B27" },
    { id: "back", name: "등", color: "#23528F" },
    { id: "shoulder", name: "어깨", color: "#7B3FA0" },
    { id: "biceps", name: "이두", color: "#C89614" },
    { id: "triceps", name: "삼두", color: "#B5651D" },
    { id: "legs", name: "하체", color: "#22754A" },
    { id: "core", name: "코어", color: "#3D444E" },
    { id: "cardio", name: "유산소·전신", color: "#0F7C8A" },
  ];

  /* 컬럼: [id, 이름, 중량, 단위, 세트, 반복, 휴식초, 영문별칭, 바벨(원판표시)]
     중량은 "여기서 시작해보라"는 제안값일 뿐, 등록 후 얼마든지 고칠 수 있다. */
  function rows(cat, list) {
    return list.map(function (r) {
      var o = {
        id: "lib-" + r[0],
        name: r[1],
        cat: cat,
        load: r[2],
        unit: r[3],
        sets: r[4],
        reps: r[5],
        rest: r[6],
      };
      if (r[7]) o.alias = r[7];
      if (r[8]) o.plates = true;
      return o;
    });
  }

  var CHEST = rows("chest", [
    ["bench", "벤치프레스", 40, "kg", 4, "6-8회", 120, "bench press", 1],
    ["inc-bb", "인클라인 바벨프레스", 30, "kg", 4, "8-10회", 120, "incline bench", 1],
    ["dec-bb", "디클라인 바벨프레스", 35, "kg", 3, "8-10회", 120, "decline bench", 1],
    ["db-bench", "덤벨 벤치프레스", 16, "kg ×2", 4, "8-10회", 90, "dumbbell bench"],
    ["inc-db", "인클라인 덤벨프레스", 14, "kg ×2", 3, "10-12회", 90, "incline dumbbell"],
    ["dec-db", "디클라인 덤벨프레스", 14, "kg ×2", 3, "10-12회", 90],
    ["db-fly", "덤벨 플라이", 8, "kg ×2", 3, "12-15회", 60, "dumbbell fly"],
    ["inc-fly", "인클라인 덤벨 플라이", 8, "kg ×2", 3, "12-15회", 60],
    ["cable-fly", "케이블 플라이", 10, "kg /쪽", 3, "15회", 60, "cable fly"],
    ["crossover", "케이블 크로스오버", 10, "kg /쪽", 3, "15회", 60, "crossover"],
    ["pecdeck", "펙덱 플라이", 30, "kg", 3, "12-15회", 60, "pec deck"],
    ["chest-press", "체스트프레스 머신", 40, "kg", 3, "10-12회", 90, "chest press"],
    ["inc-press-m", "인클라인 체스트프레스 머신", 35, "kg", 3, "10-12회", 90],
    ["smith-bench", "스미스 머신 벤치프레스", 40, "kg", 4, "8-10회", 90],
    ["dips-chest", "딥스 (가슴)", 0, "맨몸", 3, "최대반복", 90, "dips"],
    ["pushup", "푸시업", 0, "맨몸", 3, "최대반복", 60, "push up"],
    ["inc-pushup", "인클라인 푸시업", 0, "맨몸", 3, "15회", 60],
    ["dec-pushup", "디클라인 푸시업", 0, "맨몸", 3, "12회", 60],
    ["wide-pushup", "와이드 푸시업", 0, "맨몸", 3, "15회", 60],
    ["pullover", "덤벨 풀오버", 16, "kg", 3, "12회", 60, "pullover"],
  ]);

  var BACK = rows("back", [
    ["deadlift", "데드리프트", 60, "kg", 3, "5회", 180, "deadlift", 1],
    ["bb-row", "바벨로우", 40, "kg", 4, "8-10회", 90, "barbell row", 1],
    ["pendlay", "펜들레이 로우", 40, "kg", 4, "6-8회", 120, "pendlay row", 1],
    ["db-row", "원암 덤벨로우", 20, "kg", 3, "10-12회", 90, "dumbbell row"],
    ["tbar", "티바 로우", 30, "kg", 3, "10-12회", 90, "t-bar row", 1],
    ["csr", "체스트서포티드 로우", 35, "kg", 3, "12회", 90, "chest supported row"],
    ["seated-row", "시티드 케이블 로우", 40, "kg", 3, "10-12회", 90, "seated row"],
    ["row-machine", "시티드 로우 머신", 40, "kg", 3, "10-12회", 90],
    ["lat", "랫풀다운", 40, "kg", 3, "10-12회", 90, "lat pulldown"],
    ["lat-wide", "와이드 랫풀다운", 40, "kg", 3, "10-12회", 90],
    ["lat-close", "클로즈그립 랫풀다운", 40, "kg", 3, "10-12회", 90],
    ["lat-rev", "리버스그립 랫풀다운", 35, "kg", 3, "10-12회", 90],
    ["pullup", "풀업", 0, "맨몸", 4, "최대반복", 120, "pull up"],
    ["chinup", "친업", 0, "맨몸", 3, "최대반복", 120, "chin up"],
    ["assist-pullup", "어시스트 풀업 머신", 30, "kg 보조", 3, "10-12회", 90],
    ["inverted-row", "인버티드 로우", 0, "맨몸", 3, "12회", 60],
    ["straight-arm", "스트레이트암 풀다운", 20, "kg", 3, "15회", 60],
    ["rackpull", "랙풀", 70, "kg", 3, "6-8회", 150, "rack pull", 1],
    ["shrug", "바벨 슈러그", 50, "kg", 3, "12-15회", 60, "shrug", 1],
    ["db-shrug", "덤벨 슈러그", 20, "kg ×2", 3, "12-15회", 60],
    ["hyper", "하이퍼익스텐션", 0, "맨몸", 3, "15회", 60, "back extension"],
    ["goodmorning", "굿모닝", 30, "kg", 3, "10-12회", 90, "good morning", 1],
  ]);

  var SHOULDER = rows("shoulder", [
    ["ohp", "밀리터리 프레스", 30, "kg", 4, "6-8회", 120, "overhead press", 1],
    ["db-ohp", "덤벨 숄더프레스", 14, "kg ×2", 3, "10-12회", 90, "dumbbell shoulder press"],
    ["arnold", "아놀드 프레스", 12, "kg ×2", 3, "10-12회", 90, "arnold press"],
    ["smith-ohp", "스미스 머신 숄더프레스", 30, "kg", 3, "10-12회", 90],
    ["ohp-machine", "숄더프레스 머신", 30, "kg", 3, "10-12회", 90],
    ["lateral", "사이드 레터럴 레이즈", 6, "kg ×2", 4, "15회", 60, "lateral raise"],
    ["cable-lat", "케이블 레터럴 레이즈", 5, "kg /쪽", 3, "15회", 60],
    ["front-raise", "프론트 레이즈", 6, "kg ×2", 3, "15회", 60, "front raise"],
    ["rear-fly", "리어델트 플라이", 6, "kg ×2", 4, "15회", 60, "rear delt fly"],
    ["rev-pecdeck", "리버스 펙덱", 20, "kg", 3, "15회", 60, "reverse pec deck"],
    ["facepull", "페이스풀", 20, "kg", 3, "15회", 60, "face pull"],
    ["upright-row", "업라이트 로우", 25, "kg", 3, "12회", 60, "upright row"],
    ["ext-rot", "익스터널 로테이션", 4, "kg", 2, "15회", 45, "external rotation"],
    ["int-rot", "인터널 로테이션", 4, "kg", 2, "15회", 45],
    ["pike-pushup", "파이크 푸시업", 0, "맨몸", 3, "12회", 60],
    ["landmine", "랜드마인 프레스", 20, "kg", 3, "10회", 90, "landmine press"],
    ["plate-raise", "플레이트 프론트 레이즈", 10, "kg", 3, "15회", 60],
  ]);

  var BICEPS = rows("biceps", [
    ["bb-curl", "바벨컬", 20, "kg", 3, "10-12회", 60, "barbell curl", 1],
    ["ez-curl", "EZ바 컬", 20, "kg", 3, "10-12회", 60, "ez bar curl"],
    ["db-curl", "덤벨컬", 8, "kg ×2", 3, "10-12회", 60, "dumbbell curl"],
    ["hammer", "해머컬", 10, "kg ×2", 3, "10-12회", 60, "hammer curl"],
    ["inc-curl", "인클라인 덤벨컬", 6, "kg ×2", 3, "12회", 60, "incline curl"],
    ["conc-curl", "컨센트레이션 컬", 8, "kg", 3, "12회", 60, "concentration curl"],
    ["preacher", "프리처 컬", 15, "kg", 3, "10-12회", 60, "preacher curl"],
    ["cable-curl", "케이블 컬", 20, "kg", 3, "12회", 60, "cable curl"],
    ["cable-hammer", "케이블 해머컬", 20, "kg", 3, "12회", 60],
    ["spider", "스파이더 컬", 8, "kg ×2", 3, "12회", 60, "spider curl"],
    ["21s", "21s 컬", 15, "kg", 3, "21회", 90],
    ["rev-curl", "리버스 컬", 15, "kg", 3, "12-15회", 60, "reverse curl"],
    ["drag-curl", "드래그 컬", 20, "kg", 3, "12회", 60, "drag curl"],
    ["bayesian", "케이블 비하인드 컬", 10, "kg /쪽", 3, "12회", 60],
  ]);

  var TRICEPS = rows("triceps", [
    ["pushdown", "케이블 푸시다운", 20, "kg", 3, "12-15회", 60, "pushdown"],
    ["rope-pushdown", "로프 푸시다운", 20, "kg", 3, "12-15회", 60, "rope pushdown"],
    ["rev-pushdown", "리버스그립 푸시다운", 15, "kg", 3, "12-15회", 60],
    ["ohe", "오버헤드 익스텐션", 15, "kg", 3, "12회", 60, "overhead extension"],
    ["db-ohe", "덤벨 오버헤드 익스텐션", 12, "kg", 3, "12회", 60],
    ["skull", "스컬크러셔", 20, "kg", 3, "10-12회", 60, "skull crusher"],
    ["cgbp", "클로즈그립 벤치프레스", 35, "kg", 3, "8-10회", 90, "close grip bench", 1],
    ["dips-tri", "딥스 (삼두)", 0, "맨몸", 3, "최대반복", 90],
    ["bench-dips", "벤치 딥스", 0, "맨몸", 3, "15회", 60],
    ["kickback", "킥백", 6, "kg ×2", 3, "15회", 60, "kickback"],
    ["jm", "JM 프레스", 25, "kg", 3, "10회", 90],
    ["diamond", "다이아몬드 푸시업", 0, "맨몸", 3, "12회", 60],
  ]);

  var LEGS = rows("legs", [
    ["squat", "백스쿼트", 50, "kg", 4, "6-8회", 150, "back squat", 1],
    ["front-squat", "프론트스쿼트", 35, "kg", 4, "6-8회", 150, "front squat", 1],
    ["goblet", "고블릿 스쿼트", 20, "kg", 3, "12회", 90, "goblet squat"],
    ["smith-squat", "스미스 머신 스쿼트", 40, "kg", 3, "10-12회", 90],
    ["hack", "핵스쿼트", 50, "kg", 3, "10-12회", 120, "hack squat"],
    ["legpress", "레그프레스", 60, "kg", 3, "12회", 90, "leg press"],
    ["legext", "레그 익스텐션", 30, "kg", 3, "15회", 60, "leg extension"],
    ["legcurl", "레그컬", 25, "kg", 3, "12-15회", 60, "leg curl"],
    ["seated-curl", "시티드 레그컬", 25, "kg", 3, "12-15회", 60],
    ["rdl", "루마니안 데드리프트", 45, "kg", 3, "8-10회", 120, "romanian deadlift", 1],
    ["sldl", "스티프레그 데드리프트", 40, "kg", 3, "10회", 120, "stiff leg deadlift", 1],
    ["sumo", "스모 데드리프트", 60, "kg", 3, "5회", 180, "sumo deadlift", 1],
    ["bss", "불가리안 스플릿 스쿼트", 12, "kg ×2", 3, "10회 (한쪽씩)", 90, "bulgarian split squat"],
    ["lunge", "워킹 런지", 12, "kg ×2", 3, "한쪽 12보", 90, "walking lunge"],
    ["rev-lunge", "리버스 런지", 12, "kg ×2", 3, "한쪽 10회", 90],
    ["stepup", "덤벨 스텝업", 12, "kg ×2", 3, "한쪽 10회", 90, "step up"],
    ["hipthrust", "힙 쓰러스트", 50, "kg", 3, "10-12회", 90, "hip thrust", 1],
    ["glute-bridge", "글루트 브릿지", 40, "kg", 3, "12-15회", 60, "glute bridge"],
    ["cable-kick", "케이블 킥백", 15, "kg", 3, "한쪽 15회", 60],
    ["abduction", "힙 어브덕션", 30, "kg", 3, "15회", 60, "hip abduction"],
    ["adduction", "힙 어덕션", 30, "kg", 3, "15회", 60, "hip adduction"],
    ["calf-stand", "스탠딩 카프레이즈", 40, "kg", 4, "15-20회", 45, "calf raise"],
    ["calf-seat", "시티드 카프레이즈", 30, "kg", 4, "15-20회", 45],
    ["calf-press", "레그프레스 카프레이즈", 60, "kg", 3, "15-20회", 45],
    ["belt-squat", "벨트 스쿼트", 40, "kg", 3, "12회", 90],
    ["sissy", "시시 스쿼트", 0, "맨몸", 3, "12회", 60],
    ["nordic", "노르딕 컬", 0, "맨몸", 3, "8회", 90, "nordic curl"],
  ]);

  var CORE = rows("core", [
    ["plank", "플랭크", 0, "맨몸", 3, "60초", 45, "plank"],
    ["side-plank", "사이드 플랭크", 0, "맨몸", 3, "한쪽 45초", 45],
    ["hanging-knee", "행잉 니레이즈", 0, "맨몸", 3, "12-15회", 60, "hanging knee raise"],
    ["hanging-leg", "행잉 레그레이즈", 0, "맨몸", 3, "10-12회", 60, "hanging leg raise"],
    ["cable-crunch", "케이블 크런치", 25, "kg", 3, "15회", 60, "cable crunch"],
    ["crunch", "크런치", 0, "맨몸", 3, "20회", 45, "crunch"],
    ["situp", "싯업", 0, "맨몸", 3, "20회", 45, "sit up"],
    ["russian", "러시안 트위스트", 8, "kg", 3, "한쪽 15회", 45, "russian twist"],
    ["rollout", "애브 롤아웃", 0, "맨몸", 3, "10-12회", 60, "ab rollout"],
    ["legraise", "라잉 레그레이즈", 0, "맨몸", 3, "15회", 45, "leg raise"],
    ["mountain", "마운틴 클라이머", 0, "맨몸", 3, "30초", 45],
    ["deadbug", "데드버그", 0, "맨몸", 3, "한쪽 10회", 45, "dead bug"],
    ["woodchop", "케이블 우드촙", 15, "kg", 3, "한쪽 12회", 60, "woodchop"],
    ["pallof", "팰로프 프레스", 15, "kg", 3, "한쪽 12회", 60, "pallof press"],
    ["vup", "V업", 0, "맨몸", 3, "15회", 45],
    ["bicycle", "바이시클 크런치", 0, "맨몸", 3, "한쪽 20회", 45],
  ]);

  var CARDIO = rows("cardio", [
    ["burpee", "버피", 0, "맨몸", 3, "15회", 60, "burpee"],
    ["kb-swing", "케틀벨 스윙", 16, "kg", 3, "20회", 60, "kettlebell swing"],
    ["clean-press", "클린 앤 프레스", 30, "kg", 3, "8회", 120, "clean and press", 1],
    ["power-clean", "파워클린", 40, "kg", 4, "5회", 150, "power clean", 1],
    ["snatch", "스내치", 30, "kg", 4, "3회", 180, "snatch", 1],
    ["thruster", "스러스터", 30, "kg", 3, "10회", 90, "thruster", 1],
    ["farmers", "파머스 워크", 24, "kg ×2", 3, "40m", 90, "farmers walk"],
    ["battle-rope", "배틀로프", 0, "맨몸", 3, "30초", 60, "battle rope"],
    ["box-jump", "박스 점프", 0, "맨몸", 3, "10회", 90, "box jump"],
    ["sled", "슬레드 푸시", 40, "kg", 3, "20m", 90, "sled push"],
    ["rope-jump", "줄넘기", 0, "맨몸", 3, "2분", 60, "jump rope"],
    ["rowing", "로잉머신", 0, "유산소", 1, "20분", 0, "rowing"],
    ["treadmill", "트레드밀", 0, "유산소", 1, "30분", 0, "treadmill"],
    ["cycle", "사이클", 0, "유산소", 1, "30분", 0, "cycling"],
    ["stepmill", "스텝밀", 0, "유산소", 1, "20분", 0, "stepmill"],
    ["elliptical", "일립티컬", 0, "유산소", 1, "25분", 0, "elliptical"],
  ]);

  var ALL = CHEST.concat(BACK, SHOULDER, BICEPS, TRICEPS, LEGS, CORE, CARDIO);

  var BY_ID = {};
  ALL.forEach(function (e) {
    BY_ID[e.id] = e;
  });

  return {
    CATEGORIES: CATEGORIES,
    ALL: ALL,
    BY_ID: BY_ID,
    byCategory: function (catId) {
      return ALL.filter(function (e) {
        return e.cat === catId;
      });
    },
    categoryName: function (catId) {
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].id === catId) return CATEGORIES[i].name;
      }
      return "";
    },
  };
});
