# 시현 트레이닝 PWA

주 4일 상하체 2분할 루틴 앱. 단일 HTML + 서비스워커.

## 파일

```
index.html              앱 전체 (UI + 로직 + 스타일)
manifest.json           PWA 매니페스트
sw.js                   서비스워커 (오프라인 캐시)
icon-192.png            아이콘
icon-512.png            아이콘
icon-512-maskable.png   안드로이드 어댑티브 아이콘
```

## 배포

서비스워커는 **HTTPS 또는 localhost**에서만 등록돼. 파일을 그냥 더블클릭해서
`file://`로 열면 PWA 기능이 동작하지 않는다.

### 로컬 테스트

```bash
cd 폴더
python3 -m http.server 8080
# http://localhost:8080 접속
```

### GitHub Pages

```bash
git init
git add .
git commit -m "gym pwa"
git branch -M main
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

저장소 → Settings → Pages → Source를 `main` / `root`로 지정.
`https://<계정>.github.io/<저장소>/` 로 접속된다.

### Vercel

```bash
npx vercel --prod
```

빌드 설정 없이 정적 파일 그대로 올라간다.

## 설치

- **Android / Chrome** — 주소창 메뉴 → "앱 설치"
- **iOS / Safari** — 공유 → "홈 화면에 추가" (Chrome 아님, Safari로 열어야 함)

## 기능

| 기능 | 설명 |
|---|---|
| 운동 기록 | 종목을 탭하면 세트별 중량·반복수 입력창이 열림. 입력 즉시 저장 |
| 지난주 비교 | 종목 카드에 직전 세션 기록이 표시됨. "지난 기록 불러오기"로 그대로 채우기 |
| 휴식 타이머 | ✓ 누르면 종목별 휴식 시간으로 자동 시작. 종료 시 비프 + 진동 |
| 중량 추이 | "기록 · 그래프" 탭에서 종목별 최고 세트 중량 추이 확인 |
| 종목 추가 | 각 Day 하단에서 직접 추가/삭제. 기록·타이머 동일 적용 |
| 폼 영상 | 종목별 유튜브 검색을 새 탭으로 열기 |
| 원판 계산 | 바벨 종목은 봉 20kg 기준 한쪽 원판 구성을 자동 표시 |
| 오프라인 | 한 번 열면 신호 없어도 실행됨 |

## 데이터

`localStorage`에 저장된다. 키는 두 개.

```
gym.logs.v1     { 종목ID: [ { date, sets:[{w,r,done}] } ] }
gym.custom.v1   { dayID: [ 추가한 종목 ] }
```

브라우저 데이터를 지우면 기록도 사라진다. 백업이 필요하면 콘솔에서:

```js
copy(localStorage.getItem('gym.logs.v1'))
```

## 알려진 제약

- **iOS 백그라운드 타이머** — 화면이 꺼지거나 앱을 벗어나면 `setInterval`이 멈출 수 있다.
  Wake Lock API로 타이머 동작 중 화면을 켜두게 해뒀지만, iOS Safari 16.4 미만은 미지원.
- **iOS 알림** — 홈 화면에 추가한 경우에만 가능. 현재는 비프음과 진동만 사용.
- **폼 GIF** — 운동 GIF는 대부분 저작권이 있어 포함하지 않았다. 유튜브 검색 링크로 대체.
- **동기화 없음** — 기기 간 기록 공유가 필요하면 백엔드가 있어야 한다.

## 캐시 갱신

`index.html`을 수정하면 `sw.js`의 `CACHE` 값을 올려야 반영된다.

```js
var CACHE = 'gym-v2';
```
