# UI/UX 리팩토링 Handoff

## 프로젝트 개요
`auction-app/` — React + Vite + Socket.IO 기반 교실 경매 수업 앱.  
교사(재판장)가 경매를 진행하고 학생(모둠)이 실시간으로 입찰하는 구조.

---

## 완료된 변경 사항

### 1. Lobby.jsx — Role-Split Landing (최우선 완료)
**파일**: `src/components/Lobby.jsx`  
**변경 전**: 교사/학생 입장이 한 화면에 혼재. 학생은 이름 먼저 입력 후 팀 선택.  
**변경 후**: 4단계 스텝 플로우 (`ROLE → TEACHER | TEAM_SELECT → TEAM_INFO`)
- `ROLE`: 교사/학생 역할 선택 (두 큰 버튼)
- `TEACHER`: 학년/반/PIN 입력 → 입장
- `TEAM_SELECT`: 팀 그리드 먼저 표시 → 팀 클릭으로 선택
- `TEAM_INFO`: 선택된 팀 확인 후 학년/반/이름 입력 → 입장
- 뒤로가기(`ChevronLeft`) 버튼으로 각 단계 이동 가능
- 접속중인 팀은 초록 펄스 표시 + disabled

### 2. StudentView.jsx — 인터스티셜 제거 + 퀵버튼 입찰 UX
**파일**: `src/components/StudentView.jsx`  
**변경 전**: 경매 시작 → "참여할까요?" 팝업 2단계 → 금액 입력.  
**변경 후**: 탭 스위처(경매 참여 | 입찰 포기 + 예측)를 한 화면에 통합
- 기본값 `'BID'` 모드로 바로 금액 입력 화면 진입
- 퀵버튼 `+50 / +100 / +200 / +500 / MAX` 로 빠른 금액 조절 (`adjustBid` 함수)
- 탭 전환 시 에러 메시지 자동 초기화
- `useEffect` 의존성: `gameState.auctionPhase` (BIDDING → BID 모드 리셋, REBIDDING → BID 모드 자동 세팅)
- `participationMode` state 제거 → `mode: 'BID' | 'GUESS'`로 단순화

### 3. TeacherView.jsx — 헤더 버튼 과부하 해소
**파일**: `src/components/TeacherView.jsx`  
**변경 전**: 헤더 1줄에 경매 진행 + 결과 리포트 + 모둠 관리 + 설정 + 초기화 + 로그아웃 혼재.  
**변경 후**: 역할 분리
- **진행 버튼** (경매 시작/마감/낙찰 확정/다음): 헤더에 크게 표시, 현재 phase에 맞는 것만 렌더링
- **관리 도구** (결과 리포트, 모둠 관리, 경매 설정, 프로젝터 모드, 초기화, 로그아웃): `MoreVertical(⋮)` 버튼 드롭다운으로 이동
  - `showMenu` state + `menuRef` + `useEffect` click-outside 감지로 구현
  - `menuItemStyle` 상수를 파일 하단(`hexToRgb` 함수 위)에 정의

---

## 남은 개선 과제 (미구현)

### 4. 실시간 대기실 피드백 (우선순위: 중)
**목표**: 학생이 팀 선택 후 입장하면 "재판장이 경매를 시작할 때까지 대기 중..." 대기 화면 표시  
**위치**: `StudentView.jsx` 내 `gameState.auctionPhase === 'WAITING'` 분기  
**구현 방향**:
- 현재 대기 중엔 AuctionBoard만 보임 → 별도 대기 카드 추가
- connectedTeams 목록을 보여줘 "다른 모둠도 접속 중" 확인 가능하게
- 팀 이름 + 초록 펄스 인디케이터 표시

### 5. 모바일 입찰 UX 추가 개선 (우선순위: 낮)
- 슬라이더(`<input type="range">`) 를 퀵버튼 위에 추가 검토
- 현재 퀵버튼만으로도 충분히 개선되었으나, 큰 금액대에서 슬라이더가 더 직관적일 수 있음
- `bidLimits.maxBid`를 max로, step=50으로 설정

---

## 핵심 파일 구조
```
auction-app/src/
├── App.jsx              — socket 연결, role/gameState 관리, session 복원
├── components/
│   ├── Lobby.jsx        — ★ 입장 플로우 (4단계 스텝)
│   ├── StudentView.jsx  — ★ 학생 입찰 UI (탭 + 퀵버튼)
│   ├── TeacherView.jsx  — ★ 교사 대시보드 (드롭다운 관리 메뉴)
│   └── AuctionBoard.jsx — 경매 항목 그리드 (변경 없음)
└── index.css            — 전역 스타일 (panel, btn-primary, sticky-bottom-bar 등)
```

## Socket 이벤트 주요 목록
| emit | 설명 |
|------|------|
| `joinAs` | 역할/팀 입장 |
| `startAuctionFor` | 경매 시작 |
| `submitBid` | 입찰 제출 |
| `submitGuess` | 낙찰가 예측 제출 |
| `revealBids` | 마감 및 결과 공개 |
| `completeSale` | 낙찰 확정 |
| `approveSecretTickets` | 해제권 허가 |
| `resolveTie` | 동점 해소 |
| `resetGame` | 전체 초기화 |

## 개발 서버 실행
```bash
cd auction-app && npm run dev        # 프론트 (Vite, 기본 :5173)
cd auction/server && node index.js   # 백엔드 (Express+Socket.IO, :3001)
```
