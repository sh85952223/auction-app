const { saveGameState, loadAllRooms } = require('./firebase');

const defaultGameConfig = { initialBudget: 1000, bidUnit: 50 };

const defaultCategoryConfig = [
  {
    id: 'condition',
    name: '가족의 조건',
    items: [
      "모두의 생활 시간이 제각각인 가족",
      "집에 있는 시간보다 밖에 있는 시간이 많은 가족",
      "가족 구성원마다 성격 차이가 큰 가족",
      "각자 좋아하는 것이 뚜렷한 가족",
      "함께 보내는 시간도, 혼자 보내는 시간도 모두 중요한 가족",
      "말보다 행동으로 표현하는 사람이 많은 가족",
      "새로운 것을 함께 해보는 걸 좋아하는 가족",
      "조용한 사람도 있고 활발한 사람도 있는 가족"
    ]
  },
  {
    id: 'atmosphere',
    name: '가족의 분위기 코드',
    items: [
      "대화가 자주 오가는 분위기",
      "다정한 말이 자연스러운 분위기",
      "유머코드가 잘 통하는 분위기",
      "편하게 쉬어갈 수 있는 분위기",
      "서로를 믿고 맡길 수 있는 분위기",
      "약속을 중요하게 여기는 분위기",
      "작은 것도 함께 즐기는 분위기",
      "각자의 개성을 살려주는 분위기"
    ]
  },
  {
    id: 'scene',
    name: '필수 장면',
    items: [
      "하루 중 한 번은 서로의 하루를 나누는 시간",
      "같이 웃는 순간이 자주 생기는 가족",
      "힘든 사람이 있으면 자연스럽게 눈치채는 가족",
      "중요한 일은 함께 이야기해서 정하는 가족",
      "작은 일도 고맙다고 말하는 가족",
      "각자의 취향을 보여주고 구경해주는 가족",
      "함께하는 날을 따로 만들어 챙기는 가족",
      "서운한 일이 생기면 그냥 넘기지 않고 풀어보는 가족"
    ]
  }
];

function buildItemsFromConfig(categoryConfig) {
  const itemList = [];
  let counter = 1;
  categoryConfig.forEach(cat => {
    cat.items.forEach(name => {
      itemList.push({
        id: counter++,
        category: cat.id,
        categoryName: cat.name,
        name,
        winner: null,
        winningBid: 0,
        isSold: false,
        auctioned: false,
      });
    });
  });
  return itemList;
}

function createInitialState(categoryConfig = defaultCategoryConfig, gameConfig = defaultGameConfig) {
  const gc = { ...defaultGameConfig, ...gameConfig };
  const wonItemsTemplate = Object.fromEntries(categoryConfig.map(c => [c.id, null]));
  return {
    categoryConfig,
    gameConfig: gc,
    items: buildItemsFromConfig(categoryConfig),
    currentAuctionItemId: null,
    auctionPhase: 'WAITING',
    bids: {},
    teams: Array.from({length: 8}, (_, i) => ({
      id: `team_${i+1}`,
      name: `${i+1}모둠`,
      budget: gc.initialBudget,
      hasSecretTicket: true,
      studentInfo: null,
      wonItems: { ...wonItemsTemplate }
    })),
    teamCounter: 8, // addTeam 시 단조증가 ID 보장용
    teacherSocketId: null,
    connectedTeams: {},
    secretTicketRequests: {},
    secretTicketApprovedTeams: [],
    initialBids: {},
    guesses: {},
    lastGuessWinners: null,
    classInfo: null,
    categoryWrapUp: null,
  };
}

// ── 룸 관리 ──
const rooms = new Map(); // roomId → state
const _saveTimers = new Map(); // roomId → timer

const SESSION_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateSessionCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      SESSION_CODE_CHARS[Math.floor(Math.random() * SESSION_CODE_CHARS.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, createInitialState());
  return rooms.get(roomId);
}

// ── 상태 헬퍼 (state를 첫 번째 인수로 전달) ──

function awardGuessers(state, winningAmount) {
  if (!state.guesses || Object.keys(state.guesses).length === 0) return;

  let minDiff = Infinity;
  let closestTeams = [];

  Object.entries(state.guesses).forEach(([teamId, guess]) => {
    const diff = Math.abs(guess - winningAmount);
    if (diff < minDiff) {
      minDiff = diff;
      closestTeams = [teamId];
    } else if (diff === minDiff) {
      closestTeams.push(teamId);
    }
  });

  closestTeams.forEach(teamId => {
    const team = state.teams.find(t => t.id === teamId);
    if (team) team.budget += 100;
  });

  state.lastGuessWinners = {
    winningAmount,
    teams: closestTeams,
    minDiff,
    bonus: 100
  };
}

function getRemainingCategoriesNeeded(team) {
  return Object.keys(team.wonItems).filter(k => !team.wonItems[k]).length;
}

function calculateMaxBid(state, teamId, currentItemCategory) {
  const bidUnit = state.gameConfig?.bidUnit || defaultGameConfig.bidUnit;
  const team = state.teams.find(t => t.id === teamId);
  if (!team) return 0;

  if (team.wonItems[currentItemCategory]) return 0;

  const needed = getRemainingCategoriesNeeded(team);
  const otherCategoriesNeeded = needed - 1;
  const requiredReserve = otherCategoriesNeeded * bidUnit;
  const maxBid = team.budget - requiredReserve;
  return maxBid > 0 ? Math.floor(maxBid / bidUnit) * bidUnit : 0;
}

function sanitizeState(state, forTeacher = false) {
  const { initialBids, ...safeState } = state;
  const revealPhases = ['REVEALING', 'TIE_BREAKER', 'SOLD', 'NO_BIDS'];
  const showBids = forTeacher || revealPhases.includes(state.auctionPhase);
  return {
    ...safeState,
    bids: showBids ? safeState.bids : {},
    secretTicketRequests: forTeacher ? safeState.secretTicketRequests : {},
  };
}

function scheduleRoomSave(roomId) {
  if (_saveTimers.has(roomId)) clearTimeout(_saveTimers.get(roomId));
  _saveTimers.set(roomId, setTimeout(() => {
    const s = rooms.get(roomId);
    if (s) saveGameState(s, roomId);
  }, 500));
}

function broadcastState(io, roomId) {
  const state = rooms.get(roomId);
  if (!state) return;
  io.to(roomId).emit('gameState', sanitizeState(state, false));
  if (state.teacherSocketId) {
    io.to(state.teacherSocketId).emit('gameState', sanitizeState(state, true));
  }
  scheduleRoomSave(roomId);
}

function setupSocketHandlers(io) {
  // 서버 시작 시 Firebase에서 모든 룸 복원
  (async () => {
    try {
      const allRooms = await loadAllRooms();
      for (const [roomId, savedState] of Object.entries(allRooms)) {
        const state = getOrCreateRoom(roomId);
        Object.assign(state, savedState, { connectedTeams: {}, teacherSocketId: null });
        if (!state.categoryConfig) state.categoryConfig = defaultCategoryConfig;
        if (!state.gameConfig) state.gameConfig = { ...defaultGameConfig };
        if (state.categoryWrapUp === undefined) state.categoryWrapUp = null;
        state.items = state.items.map(item => ({ auctioned: item.isSold || false, ...item }));
      }
      const count = Object.keys(allRooms).length;
      if (count > 0) console.log(`Restored ${count} room(s) from Firebase.`);
    } catch (err) {
      console.error('Firebase restore failed:', err);
    }
  })();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // per-socket 이벤트 스로틀 — 동일 이벤트가 limitMs 내 재호출되면 무시
    const _lastEventTime = {};
    function isThrottled(eventName, limitMs) {
      const now = Date.now();
      if (_lastEventTime[eventName] && now - _lastEventTime[eventName] < limitMs) return true;
      _lastEventTime[eventName] = now;
      return false;
    }

    // 학생이 세션 코드로 팀 목록 요청
    socket.on('getTeamsForClass', ({ sessionCode }) => {
      const state = sessionCode ? rooms.get(sessionCode) : null;
      socket.emit('teamsForClass', state ? state.teams : []);
    });

    socket.on('joinAs', ({ role, teamId, studentInfo, classInfo, pin, sessionCode }) => {
      if (role === 'teacher') {
        if (pin !== process.env.TEACHER_PIN) {
          socket.emit('authError', '비밀번호가 올바르지 않습니다.');
          return;
        }

        // 재접속: 기존 세션 코드로 룸 복원
        let roomId = sessionCode && rooms.has(sessionCode) ? sessionCode : null;
        // 신규: 새 세션 코드 생성
        if (!roomId) roomId = generateSessionCode();

        const state = getOrCreateRoom(roomId);
        if (classInfo) state.classInfo = classInfo;
        state.teacherSocketId = socket.id;
        socket.data.roomId = roomId;
        socket.join(roomId);

        console.log(`Teacher connected to room ${roomId}`);
        socket.emit('sessionCode', roomId);
        socket.emit('gameState', sanitizeState(state, true));
        socket.emit('connectedTeams', Object.values(state.connectedTeams));

        // 재접속 시 진행 중인 입찰 현황 재전송
        if (state.auctionPhase === 'BIDDING' || state.auctionPhase === 'REBIDDING') {
          Object.entries(state.bids).forEach(([tId]) => {
            socket.emit('teamBidStatus', {
              teamId: tId,
              hasBid: true,
              requestedTicket: !!state.secretTicketRequests?.[tId],
            });
          });
          Object.keys(state.guesses).forEach(tId => {
            if (state.bids[tId] === undefined) {
              socket.emit('teamBidStatus', { teamId: tId, hasBid: true, requestedTicket: false, isGuess: true });
            }
          });
          socket.emit('bidsUpdated', [...new Set([...Object.keys(state.bids), ...Object.keys(state.guesses)])]);
          if (state.auctionPhase === 'REBIDDING') socket.emit('initialBids', state.initialBids);
        }

      } else if (role === 'team' && teamId) {
        const roomId = sessionCode || null;
        if (!roomId || !rooms.has(roomId)) {
          socket.emit('authError', '유효하지 않은 세션 코드입니다. 교사에게 세션 코드를 확인하세요.');
          return;
        }

        const state = getOrCreateRoom(roomId);
        const targetTeam = state.teams.find(t => t.id === teamId);
        if (!targetTeam) return;

        if (targetTeam.studentInfo && studentInfo) {
          if (targetTeam.studentInfo.grade !== studentInfo.grade ||
              targetTeam.studentInfo.classNum !== studentInfo.classNum ||
              targetTeam.studentInfo.members !== studentInfo.members) {
            socket.emit('authError', '이미 해당 모둠에 다른 학생 정보가 등록되어 있습니다. 잘못 등록된 경우 재판장(교사)에게 [정보 초기화]를 요청하세요.');
            return;
          }
        }

        const existingSockId = Object.keys(state.connectedTeams).find(sid => state.connectedTeams[sid] === teamId);
        if (existingSockId && existingSockId !== socket.id) {
          io.to(existingSockId).emit('authError', '다른 기기에서 같은 모둠으로 접속하여 이전 연결이 해제되었습니다.');
          delete state.connectedTeams[existingSockId];
        }

        state.connectedTeams[socket.id] = teamId;
        if (studentInfo) targetTeam.studentInfo = studentInfo;
        socket.data.roomId = roomId;
        socket.join(roomId);

        console.log(`Team ${teamId} (${studentInfo?.members || 'Unknown'}) joined room ${roomId}`);

        io.to(roomId).emit('connectedTeams', Object.values(state.connectedTeams));
        broadcastState(io, roomId);

        if (state.currentAuctionItemId) {
          const item = state.items.find(i => i.id === state.currentAuctionItemId);
          if (item) socket.emit('bidLimits', { maxBid: calculateMaxBid(state, teamId, item.category) });
        }

        // 재접속 시 이미 입찰한 상태면 알림
        if ((state.auctionPhase === 'BIDDING' || state.auctionPhase === 'REBIDDING') && state.bids[teamId] !== undefined) {
          socket.emit('bidAccepted', { amount: state.bids[teamId], alreadySubmitted: true });
        }
      }
    });

    socket.on('disconnect', () => {
      const roomId = socket.data?.roomId;
      if (!roomId) { console.log('Client disconnected (no room):', socket.id); return; }
      const state = rooms.get(roomId);
      if (!state) { console.log('Client disconnected:', socket.id); return; }

      if (socket.id === state.teacherSocketId) state.teacherSocketId = null;
      if (state.connectedTeams[socket.id]) {
        delete state.connectedTeams[socket.id];
        io.to(roomId).emit('connectedTeams', Object.values(state.connectedTeams));
      }
      console.log(`Client disconnected from room ${roomId}:`, socket.id);
    });

    // 교사 전용 이벤트에서 룸과 권한을 한 번에 검증하는 헬퍼
    const getTeacherRoom = () => {
      const roomId = socket.data?.roomId;
      if (!roomId) return null;
      const state = rooms.get(roomId);
      if (!state || socket.id !== state.teacherSocketId) return null;
      return { roomId, state };
    };

    socket.on('startAuctionFor', (itemId) => {
      if (isThrottled('startAuctionFor', 1000)) return;
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;

      const item = state.items.find(i => i.id === itemId);
      if (!item || item.isSold) return;

      item.auctioned = true;
      state.currentAuctionItemId = itemId;
      state.auctionPhase = 'BIDDING';
      state.bids = {};
      state.secretTicketRequests = {};
      state.secretTicketApprovedTeams = [];
      state.initialBids = {};
      state.guesses = {};
      state.lastGuessWinners = null;

      broadcastState(io, roomId);

      Object.keys(state.connectedTeams).forEach(sockId => {
        const tId = state.connectedTeams[sockId];
        io.to(sockId).emit('bidLimits', { maxBid: calculateMaxBid(state, tId, item.category) });
      });
    });

    socket.on('revealBids', () => {
      if (isThrottled('revealBids', 1000)) return;
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;
      if (state.auctionPhase !== 'BIDDING' && state.auctionPhase !== 'REBIDDING') return;

      state.auctionPhase = 'REVEALING';
      broadcastState(io, roomId);
    });

    socket.on('approveSecretTickets', () => {
      if (isThrottled('approveSecretTickets', 1000)) return;
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;
      if (state.auctionPhase !== 'BIDDING') return;

      const requestingTeams = Object.keys(state.secretTicketRequests).filter(tId => state.secretTicketRequests[tId]);
      if (requestingTeams.length === 0) return;

      requestingTeams.forEach(tId => {
        const team = state.teams.find(t => t.id === tId);
        if (team) {
          team.budget -= 100;
          team.hasSecretTicket = false;
        }
      });

      state.secretTicketApprovedTeams = requestingTeams;
      state.initialBids = { ...state.bids };
      state.bids = {};
      state.secretTicketRequests = {};
      state.auctionPhase = 'REBIDDING';

      broadcastState(io, roomId);

      state.secretTicketApprovedTeams.forEach(tId => {
        const sockIds = Object.keys(state.connectedTeams).filter(sid => state.connectedTeams[sid] === tId);
        sockIds.forEach(sid => io.to(sid).emit('initialBids', state.initialBids));
      });
      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('initialBids', state.initialBids);
      }

      Object.keys(state.connectedTeams).forEach(sockId => {
        const tId = state.connectedTeams[sockId];
        const item = state.items.find(i => i.id === state.currentAuctionItemId);
        if (item) io.to(sockId).emit('bidLimits', { maxBid: calculateMaxBid(state, tId, item.category) });
      });
    });

    socket.on('completeSale', () => {
      if (isThrottled('completeSale', 1000)) return;
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;
      if (state.auctionPhase !== 'REVEALING') return;

      let highestBid = -1;
      let winners = [];
      const item = state.items.find(i => i.id === state.currentAuctionItemId);

      Object.entries(state.bids).forEach(([teamId, bid]) => {
        if (bid > highestBid) {
          highestBid = bid;
          winners = [teamId];
        } else if (bid === highestBid && bid > 0) {
          winners.push(teamId);
        }
      });

      if (winners.length === 1 && highestBid > 0) {
        const winnerId = winners[0];
        item.winner = winnerId;
        item.winningBid = highestBid;
        item.isSold = true;

        const team = state.teams.find(t => t.id === winnerId);
        if (team) {
          team.budget -= highestBid;
          team.wonItems[item.category] = item.id;
        }
        state.auctionPhase = 'SOLD';
        awardGuessers(state, highestBid);
        broadcastState(io, roomId);
      } else if (winners.length > 1 && highestBid > 0) {
        state.auctionPhase = 'TIE_BREAKER';
        state.tiedTeams = winners;
        state.highestTieBid = highestBid;
        broadcastState(io, roomId);
      } else {
        state.auctionPhase = 'NO_BIDS';
        awardGuessers(state, highestBid > 0 ? highestBid : 0);
        broadcastState(io, roomId);
      }
    });

    socket.on('resolveTie', (winnerId) => {
      if (isThrottled('resolveTie', 1000)) return;
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;
      if (state.auctionPhase !== 'TIE_BREAKER') return;

      const item = state.items.find(i => i.id === state.currentAuctionItemId);
      if (item && state.tiedTeams.includes(winnerId)) {
        item.winner = winnerId;
        item.winningBid = state.highestTieBid;
        item.isSold = true;

        const team = state.teams.find(t => t.id === winnerId);
        if (team) {
          team.budget -= state.highestTieBid;
          team.wonItems[item.category] = item.id;
        }
      }

      state.auctionPhase = 'SOLD';
      state.tiedTeams = [];
      state.highestTieBid = null;

      const itemAfterTie = state.items.find(i => i.id === state.currentAuctionItemId);
      if (itemAfterTie) awardGuessers(state, itemAfterTie.winningBid);

      broadcastState(io, roomId);
    });

    socket.on('nextItem', () => {
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;

      const prevItemId = state.currentAuctionItemId;
      const prevItem = prevItemId ? state.items.find(i => i.id === prevItemId) : null;

      state.currentAuctionItemId = null;
      state.lastGuessWinners = null;

      if (prevItem) {
        const catId = prevItem.category;
        const allAuctioned = state.items.filter(i => i.category === catId).every(i => i.auctioned);
        if (allAuctioned) {
          const teamsWithoutWin = state.teams.filter(t => !t.wonItems[catId]).map(t => t.id);
          const unsoldItems = state.items.filter(i => i.category === catId && !i.isSold).map(i => i.id);
          if (teamsWithoutWin.length > 0 && unsoldItems.length > 0) {
            state.auctionPhase = 'CATEGORY_WRAP_UP';
            state.categoryWrapUp = {
              categoryId: catId,
              categoryName: prevItem.categoryName,
              teamsWithoutWin,
              unsoldItems,
            };
            broadcastState(io, roomId);
            return;
          }
        }
      }

      state.auctionPhase = 'WAITING';
      broadcastState(io, roomId);
    });

    socket.on('categoryWrapUpAction', ({ action }) => {
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;
      if (state.auctionPhase !== 'CATEGORY_WRAP_UP' || !state.categoryWrapUp) return;

      const { categoryId, teamsWithoutWin, unsoldItems } = state.categoryWrapUp;

      if (action === 'random') {
        const shuffledTeams = [...teamsWithoutWin].sort(() => Math.random() - 0.5);
        const shuffledItems = [...unsoldItems].sort(() => Math.random() - 0.5);
        const pairCount = Math.min(shuffledTeams.length, shuffledItems.length);
        for (let i = 0; i < pairCount; i++) {
          const item = state.items.find(it => it.id === shuffledItems[i]);
          const team = state.teams.find(t => t.id === shuffledTeams[i]);
          if (item && team) {
            item.isSold = true;
            item.winner = team.id;
            item.winningBid = 0;
            team.wonItems[categoryId] = item.id;
          }
        }
      }
      // 'end' and 'consolation' both just return to WAITING — teacher proceeds normally

      state.categoryWrapUp = null;
      state.auctionPhase = 'WAITING';
      broadcastState(io, roomId);
    });

    socket.on('resetGame', () => {
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;

      const newState = createInitialState(state.categoryConfig, state.gameConfig);
      newState.teacherSocketId = state.teacherSocketId;
      newState.connectedTeams = { ...state.connectedTeams };
      newState.classInfo = state.classInfo;
      Object.values(state.connectedTeams).forEach(tId => {
        const team = newState.teams.find(t => t.id === tId);
        if (team) team.studentInfo = null;
      });
      rooms.set(roomId, newState);

      broadcastState(io, roomId);
      console.log(`Game reset by teacher in room ${roomId}`);
    });

    socket.on('updateCategoryConfig', (payload) => {
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;

      // Support old format (array) and new format ({ categoryConfig, gameConfig })
      const newConfig = Array.isArray(payload) ? payload : payload?.categoryConfig;
      const newGameConfig = Array.isArray(payload) ? null : payload?.gameConfig;

      if (!Array.isArray(newConfig) || newConfig.length === 0) return;
      const isValid = newConfig.every(cat =>
        cat.id && typeof cat.id === 'string' &&
        cat.name && typeof cat.name === 'string' &&
        Array.isArray(cat.items) && cat.items.length > 0
      );
      if (!isValid) return;

      if (newGameConfig) {
        const { initialBudget, bidUnit } = newGameConfig;
        if (!Number.isInteger(initialBudget) || initialBudget < 100 || initialBudget > 99999) return;
        if (!Number.isInteger(bidUnit) || bidUnit < 10 || bidUnit > 1000) return;
      }

      const mergedGameConfig = newGameConfig
        ? { ...defaultGameConfig, ...newGameConfig }
        : (state.gameConfig || defaultGameConfig);

      const newState = createInitialState(newConfig, mergedGameConfig);
      newState.teacherSocketId = state.teacherSocketId;
      newState.connectedTeams = { ...state.connectedTeams };
      newState.classInfo = state.classInfo;
      Object.values(state.connectedTeams).forEach(tId => {
        const team = newState.teams.find(t => t.id === tId);
        if (team) team.studentInfo = null;
      });
      rooms.set(roomId, newState);

      broadcastState(io, roomId);
      console.log(`Config updated by teacher in room ${roomId}`);
    });

    socket.on('addTeam', () => {
      if (isThrottled('addTeam', 500)) return;
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;
      // teamCounter 없는 구버전 Firebase 복원본 대비 fallback
      if (!state.teamCounter) {
        state.teamCounter = state.teams.length > 0
          ? Math.max(...state.teams.map(t => parseInt(t.id.replace('team_', '')) || 0))
          : 0;
      }
      const nextIdNum = ++state.teamCounter;
      const wonItemsTemplate = Object.fromEntries(state.categoryConfig.map(c => [c.id, null]));
      state.teams.push({
        id: `team_${nextIdNum}`,
        name: `${nextIdNum}모둠`,
        budget: state.gameConfig?.initialBudget || defaultGameConfig.initialBudget,
        hasSecretTicket: true,
        studentInfo: null,
        wonItems: { ...wonItemsTemplate }
      });
      broadcastState(io, roomId);
    });

    socket.on('removeTeam', (targetTeamId) => {
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;
      state.teams = state.teams.filter(t => t.id !== targetTeamId);
      const targetSocketId = Object.keys(state.connectedTeams).find(sid => state.connectedTeams[sid] === targetTeamId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('authError', '재판장에 의해 모둠이 삭제되었습니다.');
        delete state.connectedTeams[targetSocketId];
      }
      broadcastState(io, roomId);
    });

    socket.on('resetTeamInfo', (targetTeamId) => {
      const room = getTeacherRoom();
      if (!room) return;
      const { roomId, state } = room;
      const team = state.teams.find(t => t.id === targetTeamId);
      if (team) {
        team.studentInfo = null;
        const targetSocketId = Object.keys(state.connectedTeams).find(sid => state.connectedTeams[sid] === targetTeamId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('authError', '재판장에 의해 등록 정보가 초기화되었습니다. 올바른 정보로 다시 입장해주세요.');
          delete state.connectedTeams[targetSocketId];
        }
      }
      broadcastState(io, roomId);
    });

    socket.on('submitBid', ({ amount, useSecretTicket }) => {
      if (isThrottled('submitBid', 500)) return;
      const roomId = socket.data?.roomId;
      if (!roomId) return;
      const state = rooms.get(roomId);
      if (!state) return;
      const teamId = state.connectedTeams[socket.id];
      if (!teamId) return;
      if (state.auctionPhase !== 'BIDDING' && state.auctionPhase !== 'REBIDDING') return;

      // BIDDING 단계에서는 이미 제출한 팀의 재입찰 차단
      if (state.auctionPhase === 'BIDDING' && state.bids[teamId] !== undefined) {
        socket.emit('bidRejected', { reason: '이미 입찰하셨습니다.' });
        return;
      }

      const item = state.items.find(i => i.id === state.currentAuctionItemId);
      if (!item) return;

      const bidUnit = state.gameConfig?.bidUnit || defaultGameConfig.bidUnit;
      const team = state.teams.find(t => t.id === teamId);
      const maxBid = calculateMaxBid(state, teamId, item.category);

      let validBid = Math.max(0, parseInt(amount, 10) || 0);
      if (validBid % bidUnit !== 0) validBid = Math.floor(validBid / bidUnit) * bidUnit;
      if (validBid <= 0) {
        socket.emit('bidRejected', { reason: `최소 입찰 금액은 ${bidUnit} 코인입니다.` });
        return;
      }

      let applyTicket = false;
      if (state.auctionPhase === 'BIDDING' && useSecretTicket && team.hasSecretTicket) {
        if (validBid + 100 <= maxBid) {
          applyTicket = true;
        } else {
          validBid = Math.max(0, Math.floor((maxBid - 100) / bidUnit) * bidUnit);
          applyTicket = true;
        }
      } else if (validBid > maxBid) {
        validBid = Math.floor(maxBid / bidUnit) * bidUnit;
      }

      state.bids[teamId] = validBid;
      if (state.auctionPhase === 'BIDDING') state.secretTicketRequests[teamId] = applyTicket;

      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('teamBidStatus', {
          teamId,
          hasBid: true,
          requestedTicket: state.auctionPhase === 'BIDDING' ? applyTicket : false
        });
      }
      socket.emit('bidAccepted', { amount: validBid });

      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('bidsUpdated', Object.keys(state.bids));
        io.to(state.teacherSocketId).emit('ticketRequestsUpdated', state.secretTicketRequests);
      }
    });

    socket.on('submitGuess', ({ amount }) => {
      if (isThrottled('submitGuess', 500)) return;
      const roomId = socket.data?.roomId;
      if (!roomId) return;
      const state = rooms.get(roomId);
      if (!state) return;
      const teamId = state.connectedTeams[socket.id];
      if (!teamId) return;
      if (state.auctionPhase !== 'BIDDING' && state.auctionPhase !== 'REBIDDING') return;
      if (state.bids[teamId] !== undefined) return;

      const guessBidUnit = state.gameConfig?.bidUnit || defaultGameConfig.bidUnit;
      let validGuess = Math.max(0, parseInt(amount, 10) || 0);
      if (validGuess % guessBidUnit !== 0) validGuess = Math.floor(validGuess / guessBidUnit) * guessBidUnit;

      state.guesses[teamId] = validGuess;

      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('teamBidStatus', {
          teamId,
          hasBid: true,
          requestedTicket: false,
          isGuess: true
        });
      }
      socket.emit('bidAccepted', { amount: 0, isGuess: true });
      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('bidsUpdated', [...new Set([...Object.keys(state.bids), ...Object.keys(state.guesses)])]);
      }
    });
  });
}

module.exports = { setupSocketHandlers };
