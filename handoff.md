# Auction App — 개발 Handoff 문서

> 마지막 업데이트: 2026-04-26 (세션 2)
> 대상 브랜치: `main` (origin보다 7 커밋 앞)

---

## 프로젝트 개요

`auction-app/` — React + Vite (프론트) + Node.js + Socket.IO (백엔드) + Firebase Firestore (영속성)  
교사(재판장)가 경매를 진행하고 학생(모둠)이 실시간으로 밀봉 입찰하는 교실 수업용 앱.

---

## 핵심 파일 구조

```
auction-app/
├── server/
│   ├── index.js          — Express + Socket.IO 서버 진입점, 환경변수 검증
│   ├── gameLogic.js      — 핵심 게임 로직, 룸 관리, 소켓 이벤트 핸들러
│   ├── firebase.js       — Firestore 초기화, 룸별 save/load
│   └── .env.example      — 필수 환경변수 템플릿
├── src/
│   ├── App.jsx           — socket 연결, role/gameState 관리, 세션 복원
│   └── components/
│       ├── Lobby.jsx     — 입장 플로우 (5단계 스텝)
│       ├── StudentView.jsx — 학생 입찰 UI (탭 + 퀵버튼 + 슬라이더)
│       ├── TeacherView.jsx — 교사 대시보드 (드롭다운 관리 메뉴)
│       └── AuctionBoard.jsx — 경매 항목 그리드
└── ISSUES.md             — 보안/안정성 이슈 원문 (P0~P3 우선순위 분류)
```

---

## 아키텍처 — 다중 룸(Multi-Room) 구조

### 핵심 개념

서버는 **`rooms: Map<roomId, GameState>`** 구조로 운영됨.

- `roomId` = `"${grade}-${classNum}"` (예: `"3-2"`)
- 교사가 학년/반으로 로그인 → 해당 roomId 룸 생성/입장
- 학생이 학년/반 입력 후 `getTeamsForClass` 이벤트로 팀 목록 조회 → 팀 선택 후 해당 룸 입장
- 모든 `io.emit` → `io.to(roomId).emit` 으로 룸 격리 브로드캐스트
- 서버 재시작 시 Firebase `auction/{roomId}` 컬렉션에서 모든 룸 일괄 복원

### 룸 입장 흐름

```
교사: joinAs(teacher, classInfo={grade,classNum}, pin)
       → makeRoomId(classInfo) → getOrCreateRoom(roomId)
       → socket.join(roomId)

학생(Lobby): getTeamsForClass({grade,classNum})
       → server: rooms.get(roomId)?.teams 반환
       → 팀 선택 → joinAs(team, teamId, studentInfo={grade,classNum,members})
       → makeRoomId(studentInfo) → getOrCreateRoom(roomId)
       → socket.join(roomId)
```

### broadcastState 패턴

```js
io.to(roomId).emit('gameState', sanitizeState(state, false)); // 학생: bids/secretTicketRequests 마스킹
io.to(teacherSocketId).emit('gameState', sanitizeState(state, true)); // 교사: 전체 공개
```

---

## 완료된 UI/UX 개선 (이전 세션)

### Lobby.jsx — 5단계 스텝 플로우
`ROLE → TEACHER | TEAM_CLASS → TEAM_SELECT → TEAM_INFO`
- 학생은 학년/반 먼저 입력(TEAM_CLASS) → 해당 반 팀 목록 서버에서 요청 → 팀 선택
- 교사는 학년/반/PIN 입력

### StudentView.jsx
- 인터스티셜 제거 + 탭 스위처(경매 참여 | 입찰 포기+예측)
- 퀵버튼 `+50/+100/+200/+500/MAX` + 슬라이더 입찰 UX
- `useReducer(formReducer)` 단일 상태 관리

### TeacherView.jsx
- 진행 버튼(경매 시작/마감/낙찰 확정/다음)을 헤더에 크게 표시
- 관리 도구를 `MoreVertical(⋮)` 드롭다운으로 이동

---

## 완료된 보안/안정성 수정 (ISSUES.md 기준)

| 이슈 | 파일 | 커밋 요약 |
|------|------|-----------|
| **P0-1** resolveTie 권한 체크 | `gameLogic.js:384` | 이미 수정돼 있었음 |
| **P0-2** BIDDING 중 bids 전체 노출 | `gameLogic.js` | `sanitizeState(forTeacher)` — BIDDING/REBIDDING 단계에서 학생에게 bids `{}` 마스킹 |
| **P0-3** 재접속 후 재입찰 가능 | `gameLogic.js` | BIDDING 중 `bids[teamId] !== undefined`면 차단; 재접속 시 `bidAccepted(alreadySubmitted)` 재전송 |
| **P1-1** 전역 단일 state | `gameLogic.js`, `firebase.js`, `Lobby.jsx`, `App.jsx` | `rooms Map` 기반 다중 룸 구조 전환 (이번 세션 최대 변경) |
| **P1-2** 교사 재접속 시 입찰 현황 손실 | `gameLogic.js` | joinAs teacher 시 `teamBidStatus`, `bidsUpdated`, `initialBids` 재전송 |
| **P1-3** Firebase 복원 시 stale connectedTeams | `gameLogic.js` | `connectedTeams: {}` 초기화 (이미 수정돼 있었음) |
| **P1-4** CORS `"*"` | `server/index.js` | `process.env.ALLOWED_ORIGIN` 환경변수화 (이미 수정돼 있었음) |
| **P1-5** 기본 PIN `'1234'` | `server/index.js` | `TEACHER_PIN` 없으면 서버 시작 차단 (이미 수정돼 있었음) |
| **P2-1** bidsUpdated 전체 브로드캐스트 | `gameLogic.js` | 교사에게만 전송 (이미 수정돼 있었음) |
| **P2-2** Firebase 과다 쓰기 | `gameLogic.js` | `scheduleSave` debounce 500ms (이미 수정돼 있었음) |
| **P2-3** secretTicketRequests 클라이언트 노출 | `gameLogic.js` | `sanitizeState`에서 교사 외 마스킹 |
| **P2-4** submitGuess 이중 제출 | `gameLogic.js` | `bids[teamId] !== undefined`면 차단 (이미 수정돼 있었음) |
| **P3-1** Rate Limiting | `gameLogic.js` | per-socket `isThrottled()` — 학생 이벤트 500ms, 교사 이벤트 1000ms |
| **P3-2** addTeam ID 충돌 잠재성 | `gameLogic.js` | `state.teamCounter` 단조증가 카운터로 ID 생성 |
| **P3-3** Firebase initialBids 평문 저장 | `firebase.js` | `saveGameState`에서 `initialBids` 제외 |
| **P3-4** .env.example 없음 | `server/.env.example` | 필수 환경변수 템플릿 신규 생성 |

**모든 ISSUES.md 항목 완료.**

---

## Socket 이벤트 전체 목록

### 클라이언트 → 서버

| 이벤트 | 발신자 | 설명 |
|--------|--------|------|
| `joinAs` | 교사/학생 | 룸 입장. `{ role, teamId?, classInfo?, studentInfo?, pin? }` |
| `getTeamsForClass` | 학생(Lobby) | 반별 팀 목록 요청. `{ grade, classNum }` |
| `startAuctionFor` | 교사 | 특정 아이템 경매 시작. `itemId` |
| `revealBids` | 교사 | 입찰 마감 및 공개 |
| `approveSecretTickets` | 교사 | 해제권 허가 |
| `completeSale` | 교사 | 낙찰 확정 |
| `resolveTie` | 교사 | 동점 해소. `winnerId` |
| `nextItem` | 교사 | 다음 아이템으로 이동 |
| `resetGame` | 교사 | 게임 전체 초기화 |
| `updateCategoryConfig` | 교사 | 경매 카테고리/항목 변경 |
| `addTeam` / `removeTeam` | 교사 | 팀 추가/삭제 |
| `resetTeamInfo` | 교사 | 특정 팀 학생 정보 초기화 |
| `submitBid` | 학생 | 입찰 제출. `{ amount, useSecretTicket }` |
| `submitGuess` | 학생 | 낙찰가 예측 제출. `{ amount }` |

### 서버 → 클라이언트

| 이벤트 | 수신자 | 설명 |
|--------|--------|------|
| `gameState` | 룸 전체 | 게임 상태 브로드캐스트 (교사/학생 내용 다름) |
| `teamsForClass` | 요청 소켓 | 반별 팀 목록 응답 |
| `connectedTeams` | 룸 전체 | 접속 중인 팀 ID 목록 |
| `bidLimits` | 학생 개별 | 최대 입찰 금액 |
| `teamBidStatus` | 교사 | 팀별 제출 여부/해제권 요청 여부 |
| `bidsUpdated` | 교사 | 입찰 완료 팀 ID 목록 |
| `ticketRequestsUpdated` | 교사 | 해제권 요청 현황 |
| `initialBids` | 교사 + 해제권 팀 | REBIDDING 전환 시 1차 입찰가 |
| `bidAccepted` | 학생 | 입찰 수락. `{ amount, alreadySubmitted? }` |
| `bidRejected` | 학생 | 입찰 거부. `{ reason }` |
| `authError` | 소켓 | 인증 오류 (로그아웃 처리) |

---

## Game Phase 상태 전이

```
WAITING
  └─[startAuctionFor]→ BIDDING
       └─[revealBids]→ REVEALING
            ├─[completeSale, 단독 최고가]→ SOLD → [nextItem]→ WAITING
            ├─[completeSale, 동점]→ TIE_BREAKER → [resolveTie]→ SOLD
            └─[completeSale, 입찰 없음]→ NO_BIDS → [nextItem]→ WAITING
       └─[approveSecretTickets]→ REBIDDING → [revealBids]→ REVEALING
```

---

## 환경변수 (server/.env)

```
TEACHER_PIN=<필수, 미설정 시 서버 시작 불가>
ALLOWED_ORIGIN=<프론트 도메인, 기본 http://localhost:5173>
PORT=<기본 3001>
FIREBASE_SERVICE_ACCOUNT=<JSON 문자열, 없으면 서비스 계정 파일 사용>
```

---

## 개발 서버 실행

```bash
# 백엔드
cd auction-app/server && node index.js

# 프론트
cd auction-app && npm run dev   # Vite :5173
```

---

---

## 세션 2 변경사항 (2026-04-26)

### 1. 세션 코드 기반 룸 격리

**문제:** `roomId = "${grade}-${classNum}"` 구조라 다른 학교 교사가 같은 학년/반 입력 시 룸 충돌.

**해결:** 교사 입장 시 서버가 6자리 랜덤 코드(예: `AB3X7K`) 발급 → 이게 roomId가 됨.

| 파일 | 변경 내용 |
|------|-----------|
| `server/gameLogic.js` | `makeRoomId` 제거 → `generateSessionCode()` 추가. 교사 joinAs 시 신규/재접속 분기. `getTeamsForClass`가 `{sessionCode}` 수신. 학생 joinAs도 sessionCode로 룸 조회. |
| `src/App.jsx` | `sessionCode` state 추가, `sessionCode` 소켓 이벤트 수신 후 localStorage 저장. 세션 복원 시 sessionCode 포함해 재전송. |
| `src/components/Lobby.jsx` | 학생 TEAM_CLASS 단계 → 세션 코드 입력(6자리 대문자) 단계로 교체. |
| `src/components/TeacherView.jsx` | 헤더에 세션 코드 뱃지 표시 (클릭 시 클립보드 복사). |

**재접속 흐름:** 교사 localStorage에 `auctionSessionCode` 저장 → 재접속 시 동일 코드로 기존 룸 재진입. 학생도 동일.

---

### 2. 전체 UI 리디자인

기존 Playfair Display + 나무/양피지 테마 → 현대적 다크 SaaS 디자인으로 전면 교체.

| 항목 | 변경 |
|------|------|
| 폰트 | Playfair Display → **Inter + JetBrains Mono** |
| 색상 | 나무색/금색 → 딥 인디고 배경 + 퍼플/앰버/스카이 액센트 |
| CSS | `index.css` 전면 재작성 (CSS 변수 토큰 체계, 유틸리티 클래스) |
| Lobby | 역할 카드 선택 UI, 세션코드 대형 Mono 입력 |
| TeacherView | 스티키 헤더 + 팀 사이드바 + 모달 블러 배경 |
| StudentView | 코인 항상 표시, 세그먼트 컨트롤 탭, 제출 완료 애니메이션 |
| AuctionBoard | 카테고리별 컬러 도트 헤더, 아이템 카드 hover 효과 |

---

### 3. 엑셀 내보내기 (`xlsx` 패키지)

결과 리포트 모달에 "엑셀로 내보내기" 버튼 추가.
컬럼: 모둠명 / 학년 / 반 / 모둠원 / 남은예산 / [카테고리별] 낙찰항목·금액 / 총사용금액.

---

### 4. 미해결 설계 질문 (다음 세션 논의 필요)

**유찰·미낙찰 처리 정책:**
- 유찰(NO_BIDS) 시 아이템은 `isSold=false`로 남음 → 교사가 다시 선택해 재경매 가능 (현행)
- 끝까지 아무것도 낙찰받지 못한 모둠 → 별도 처리 없음, 코인만 남음 (현행)
- **결정 필요:** 강제 재경매 큐, 미낙찰 모둠 무작위 배정 등 추가할지 여부

## 미처리 항목

위 설계 질문 외 없음.
