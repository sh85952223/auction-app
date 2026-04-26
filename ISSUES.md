# 리팩토링 우선순위 — 보안 · 안정성 · 배포 이슈

> 작성: 2026-04-26 | 대상: `auction-app/server/gameLogic.js`, `index.js`, `firebase.js`, 프론트 컴포넌트

---

## P0 — 즉시 수정 (게임 무결성 파괴 수준)

### [P0-1] `resolveTie` 권한 체크 누락
**파일**: `server/gameLogic.js:374`  
```js
socket.on('resolveTie', (winnerId) => {
  if (state.auctionPhase !== 'TIE_BREAKER') return;
  // ← teacherSocketId 체크 없음!
```
**문제**: 어떤 클라이언트(학생 포함)가 `resolveTie` 이벤트를 전송하면 낙찰 결과가 바뀜. 
동점 상황에서 학생이 자기 팀을 승자로 지정 가능.  
**수정**: `if (socket.id !== state.teacherSocketId) return;` 한 줄 추가.

---

### [P0-2] BIDDING 중 입찰가 실시간 노출
**파일**: `server/gameLogic.js:147-154`  
```js
function sanitizeState() {
  const { initialBids, ...safeState } = state;
  return safeState; // bids 그대로 포함됨!
}
```
**문제**: `state.bids`가 BIDDING 단계에서도 `gameState` 이벤트에 포함되어 전체 브로드캐스트됨.  
학생이 브라우저 DevTools → Network → WebSocket 메시지를 보면 다른 팀의 입찰가가 실시간으로 보임.  
**밀봉 입찰의 핵심 규칙이 기술적으로 깨진 상태.**  
**수정**:
```js
function sanitizeState(recipientSocketId) {
  const { initialBids, bids, ...base } = state;
  const isTeacher = recipientSocketId === state.teacherSocketId;
  const revealPhases = ['REVEALING', 'TIE_BREAKER', 'SOLD', 'NO_BIDS'];
  return {
    ...base,
    bids: (isTeacher || revealPhases.includes(state.auctionPhase)) ? bids : {},
  };
}
// io.emit 대신 각 소켓에 개별 emit 또는 교사/학생 채널 분리
```
단기 대안: BIDDING/REBIDDING 단계에서는 `bids: {}` 로 마스킹하고, 교사에게만 별도 이벤트로 전송.

---

### [P0-3] 재접속 시 재입찰 가능 (무제한 입찰 변경)
**파일**: `src/components/StudentView.jsx` + `server/gameLogic.js:533`  
**문제**: `bidSubmitted`가 클라이언트 React state여서 학생이 페이지를 새로고침하거나 재접속하면 `false`로 리셋됨. 서버에서 `state.bids[teamId]`를 덮어쓰므로 이미 제출한 팀이 재접속 후 입찰가를 변경할 수 있음.  
**수정 방향**: 서버에서 이미 입찰한 팀의 재입찰을 차단.
```js
socket.on('submitBid', ({ amount, useSecretTicket }) => {
  // ...
  if (state.bids[teamId] !== undefined && state.auctionPhase === 'BIDDING') {
    socket.emit('bidRejected', { reason: '이미 입찰하셨습니다.' });
    return;
  }
  // REBIDDING 단계는 재입찰이 허용되어야 하므로 단계 구분 필요
```
클라이언트: 재접속 시 서버가 `teamBidStatus`를 재전송하는 로직 필요.

---

## P1 — 배포 전 필수 수정

### [P1-1] 전역 단일 state — 다중 교사/학교 동시 사용 불가
**파일**: `server/gameLogic.js:95`  
```js
let state = createInitialState(); // 서버 전체에 단 하나
```
**문제**: 서버가 공개 배포되면 여러 교사가 동시에 접속 시 같은 `state`를 공유함.  
A 교사의 경매 진행이 B 교사의 화면에 보이고, 학생 상태도 뒤섞임.  
**수정 방향**: 게임 룸(room) 개념 도입.
- 교사 입장 시 `classInfo`(학년-반)를 기반으로 룸 ID 생성 (예: `grade3-class2`)
- `state`를 `Map<roomId, GameState>`로 변경
- 모든 소켓 이벤트에 `socket.join(roomId)` + `io.to(roomId).emit(...)` 패턴 적용
- Firebase도 `roomId`별 document로 분리: `auction/{roomId}/currentState`

```js
const rooms = new Map(); // roomId → state

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, createInitialState());
  return rooms.get(roomId);
}
```

---

### [P1-2] 교사 재접속 시 팀 입찰 현황(`teamBidStatus`) 손실
**파일**: `server/gameLogic.js`, `src/App.jsx`  
**문제**: TeacherView의 `teamBidStatus`는 React state로 실시간 이벤트 수신에만 의존.  
교사가 새로고침하거나 재접속하면 현재 BIDDING 중임에도 "제출 완료" 표시가 사라짐.  
**수정 방향**: `joinAs` teacher 처리 시 서버에서 현재 입찰 현황을 재전송.
```js
// joinAs teacher 처리 끝에 추가
if (state.auctionPhase === 'BIDDING' || state.auctionPhase === 'REBIDDING') {
  Object.entries(state.bids).forEach(([tId, _]) => {
    socket.emit('teamBidStatus', { teamId: tId, hasBid: true,
      requestedTicket: !!state.secretTicketRequests?.[tId] });
  });
  socket.emit('initialBids', state.initialBids); // REBIDDING이면
}
```

---

### [P1-3] Firebase 복원 시 stale `connectedTeams` 미정리
**파일**: `server/gameLogic.js:158-168`  
**문제**: 서버 재시작 후 Firebase에서 상태 복원 시, 이전 세션의 socket ID들이 `connectedTeams`에 남아있음.  
교사 화면에서 재접속하지 않은 팀도 "접속 중" 녹색으로 표시됨 (허위 표시).  
```js
const savedState = await loadGameState();
if (savedState) {
  state = { ...state, ...savedState };
  // 재시작 직후엔 실제 연결된 소켓이 없으므로 connectedTeams 초기화 필요
```
**수정**:
```js
state = { ...state, ...savedState, connectedTeams: {} };
```

---

### [P1-4] CORS `"*"` — 공개 배포 시 무제한 접근 허용
**파일**: `server/index.js:13-18`  
```js
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
```
**문제**: 배포된 URL을 알면 누구나 Socket.IO에 연결 가능. 악의적 클라이언트가 임의 이벤트를 전송할 수 있음.  
**수정**: 배포 도메인으로 제한.
```js
cors: {
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST"]
}
```

---

### [P1-5] 기본 교사 PIN `'1234'`
**파일**: `server/gameLogic.js:178`  
```js
const correctPin = process.env.TEACHER_PIN || '1234';
```
**문제**: `.env`를 설정하지 않으면 누구나 `1234`로 교사 권한 획득. 공개 배포 시 즉시 악용됨.  
**수정**: PIN이 없으면 서버 시작 자체를 막거나 강제 안내.
```js
const correctPin = process.env.TEACHER_PIN;
if (!correctPin) {
  console.error('FATAL: TEACHER_PIN 환경변수가 설정되지 않았습니다. 서버를 시작할 수 없습니다.');
  process.exit(1);
}
```

---

## P2 — 품질 개선 (게임은 동작하지만 불공정/비효율)

### [P2-1] `bidsUpdated`가 전체 브로드캐스트 — 학생이 타 팀 입찰 여부 확인 가능
**파일**: `server/gameLogic.js:547`  
```js
io.emit('bidsUpdated', Object.keys(state.bids)); // 모든 클라이언트에 전송
```
**문제**: 어느 팀이 입찰했는지 목록이 모든 학생에게 전달됨. 학생이 마지막에 입찰하는 전략을 취하기 위해 다른 팀 동향을 파악 가능.  
**수정**: `bidsUpdated`는 교사에게만, 학생에게는 "제출 완료" 여부만 자신의 팀에 한정.

---

### [P2-2] Firebase Firestore 과다 쓰기
**파일**: `server/gameLogic.js:152-155`  
```js
function broadcastState(io) {
  io.emit('gameState', sanitizeState());
  saveGameState(state); // 매 이벤트마다 Firestore write
}
```
**문제**: 입찰 1건당 1회 Firestore write. 8팀 동시 입찰 → 8회 연속 쓰기.  
Firestore 무료 플랜은 문서당 1초에 1write 권장 (실제 제한은 더 높지만 비용 발생).  
**수정**: debounce 적용 (500ms 딜레이).
```js
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveGameState(state), 500);
}
```

---

### [P2-3] `secretTicketRequests`가 클라이언트에 노출
**파일**: `server/gameLogic.js:147-154` (sanitizeState)  
**문제**: 어느 팀이 해제권을 요청했는지 모든 클라이언트 gameState에 포함됨.  
학생이 DevTools에서 볼 수 있음. (프로젝터 모드는 UI에서만 숨기고 데이터는 전송됨)  
**수정**: `sanitizeState`에서 교사 외에는 마스킹.

---

### [P2-4] `submitGuess`에서 이미 입찰한 팀 필터링 없음
**파일**: `server/gameLogic.js:551-574`  
**문제**: 클라이언트 UI에서는 BID/GUESS 탭이 분리되어 있지만, 서버에서 동일 팀이 `submitBid` + `submitGuess`를 모두 전송하는 것을 막지 않음.  
**수정**:
```js
socket.on('submitGuess', ({ amount }) => {
  if (state.bids[teamId] !== undefined) return; // 이미 입찰한 팀은 예측 불가
```

---

### [P2-5] 교사 재접속 중 학생 게임 진행 가능
**문제**: `teacherSocketId`가 null이 되어도 게임 로직(입찰 수집 등)은 계속 돌아감.  
교사가 없는 동안 학생이 입찰을 제출할 수는 있지만 아무도 마감을 못함 → 애매한 상태.  
**현재 동작은 허용으로 설계된 것으로 보이지만**, 교사 접속이 없을 때 학생 화면에 "재판장 미접속" 알림을 추가하면 UX 개선.

---

## P3 — 장기 개선

### [P3-1] Rate Limiting
학생이 `submitBid` 이벤트를 초당 수십 번 전송해도 막을 수단이 없음.  
`socket.io` 레이어에서 per-socket event throttle 적용 권장.

### [P3-2] `addTeam` 후 삭제-재추가 시 ID 충돌 잠재성
`team_${max+1}` 방식은 삭제된 ID와 중복되지 않지만, 팀 이름(`${num}모둠`)은 중복될 수 있음.  
UUID 또는 단조증가 카운터(`state.teamCounter`)로 ID 생성 방식 개선 권장.

### [P3-3] Firebase에 `initialBids` 평문 저장
`saveGameState`는 `initialBids`를 포함해 저장. 비밀 입찰가가 Firebase에 남음.  
Firebase Security Rules 설정 또는 민감 필드 제외 필요.

### [P3-4] `.env` 파일 없이도 동작하는 구조
배포 시 `.env.example` 파일 생성 및 필수 환경변수 시작 시 검증 로직 추가 권장.  
필수: `TEACHER_PIN`, `ALLOWED_ORIGIN`, `FIREBASE_SERVICE_ACCOUNT`

---

## 요약 우선순위 표

| 우선순위 | 이슈 | 파일 | 수정 난이도 |
|---|---|---|---|
| **P0** | resolveTie 권한 체크 누락 | `gameLogic.js:374` | 쉬움 (1줄) |
| **P0** | BIDDING 중 입찰가 전체 노출 | `gameLogic.js:147` | 중간 |
| **P0** | 재접속 시 재입찰 가능 | `gameLogic.js:533` | 중간 |
| **P1** | 전역 단일 state (다중 교사 불가) | `gameLogic.js:95` | 어려움 (구조 변경) |
| **P1** | 교사 재접속 시 입찰 현황 손실 | `gameLogic.js` + `App.jsx` | 중간 |
| **P1** | Firebase 복원 시 stale connectedTeams | `gameLogic.js:161` | 쉬움 (1줄) |
| **P1** | CORS `"*"` | `index.js:15` | 쉬움 |
| **P1** | 기본 PIN `'1234'` | `gameLogic.js:178` | 쉬움 |
| **P2** | bidsUpdated 전체 브로드캐스트 | `gameLogic.js:547` | 쉬움 |
| **P2** | Firebase 과다 쓰기 (debounce 없음) | `gameLogic.js:154` | 쉬움 |
| **P2** | secretTicketRequests 클라이언트 노출 | `gameLogic.js:147` | 중간 |
| **P2** | submitGuess 이중 제출 허용 | `gameLogic.js:551` | 쉬움 |
| **P3** | Rate limiting | `index.js` | 중간 |
| **P3** | Firebase initialBids 평문 저장 | `firebase.js` | 쉬움 |

---

## 빠른 적용 가능한 P0+P1 패치 순서

1. `resolveTie` 권한 체크 1줄 추가 → **즉시**
2. Firebase 복원 시 `connectedTeams: {}` 초기화 → **즉시**
3. `TEACHER_PIN` 미설정 시 서버 시작 차단 → **즉시**
4. CORS origin 환경변수화 → **배포 직전**
5. `sanitizeState`에서 BIDDING 중 bids 마스킹 → **다음 세션**
6. 재접속 재입찰 서버 차단 → **다음 세션**
7. 교사 재접속 시 입찰 현황 재전송 → **다음 세션**
8. 게임 룸 구조 도입 (다중 교사) → **장기 스프린트**
