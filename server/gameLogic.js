// State representing the auction
const initialBudget = 1000;
const { saveGameState } = require('./firebase');

// items categorized
const categories = {
  condition: [
    "모두의 생활 시간이 제각각인 가족",
    "집에 있는 시간보다 밖에 있는 시간이 많은 가족",
    "가족 구성원마다 성격 차이가 큰 가족",
    "각자 좋아하는 것이 뚜렷한 가족",
    "함께 보내는 시간도, 혼자 보내는 시간도 모두 중요한 가족",
    "말보다 행동으로 표현하는 사람이 많은 가족",
    "새로운 것을 함께 해보는 걸 좋아하는 가족",
    "조용한 사람도 있고 활발한 사람도 있는 가족"
  ],
  atmosphere: [
    "대화가 자주 오가는 분위기",
    "다정한 말이 자연스러운 분위기",
    "유머코드가 잘 통하는 분위기",
    "편하게 쉬어갈 수 있는 분위기",
    "서로를 믿고 맡길 수 있는 분위기",
    "약속을 중요하게 여기는 분위기",
    "작은 것도 함께 즐기는 분위기",
    "각자의 개성을 살려주는 분위기"
  ],
  scene: [
    "하루 중 한 번은 서로의 하루를 나누는 시간",
    "같이 웃는 순간이 자주 생기는 가족",
    "힘든 사람이 있으면 자연스럽게 눈치채는 가족",
    "중요한 일은 함께 이야기해서 정하는 가족",
    "작은 일도 고맙다고 말하는 가족",
    "각자의 취향을 보여주고 구경해주는 가족",
    "함께하는 날을 따로 만들어 챙기는 가족",
    "서운한 일이 생기면 그냥 넘기지 않고 풀어보는 가족"
  ]
};

// Map these items to structured item objects state
let items = [];
let itemIdCounter = 1;
["condition", "atmosphere", "scene"].forEach((cat, catIdx) => {
  categories[cat].forEach((name, idx) => {
    items.push({
      id: itemIdCounter++,
      category: cat,
      categoryName: catIdx === 0 ? "가족의 조건" : catIdx === 1 ? "가족의 분위기 코드" : "필수 장면",
      name: name,
      winner: null,
      winningBid: 0,
      isSold: false,
    });
  });
});

function createInitialState() {
  const itemList = [];
  let counter = 1;
  ["condition", "atmosphere", "scene"].forEach((cat, catIdx) => {
    categories[cat].forEach((name) => {
      itemList.push({
        id: counter++,
        category: cat,
        categoryName: catIdx === 0 ? "가족의 조건" : catIdx === 1 ? "가족의 분위기 코드" : "필수 장면",
        name: name,
        winner: null,
        winningBid: 0,
        isSold: false,
      });
    });
  });
  return {
    items: itemList,
    currentAuctionItemId: null,
    auctionPhase: 'WAITING',
    bids: {},
    teams: Array.from({length: 8}, (_, i) => ({
      id: `team_${i+1}`,
      name: `${i+1}모둠`,
      budget: initialBudget,
      hasSecretTicket: true,
      studentInfo: null,
      wonItems: {
          condition: null,
          atmosphere: null,
          scene: null
      }
    })),
    teacherSocketId: null,
    connectedTeams: {},
    secretTicketRequests: {},
    secretTicketApprovedTeams: [],
    initialBids: {},
    guesses: {},
    lastGuessWinners: null,
    classInfo: null,
  };
}

let state = createInitialState();

function awardGuessers(winningAmount) {
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
     if (team) {
        team.budget += 100; // 예상 성공시 보너스 100 코인
     }
  });
  
  state.lastGuessWinners = {
     winningAmount,
     teams: closestTeams,
     minDiff,
     bonus: 100
  };
}

function getRemainingCategoriesNeeded(team) {
  let needed = 0;
  if (!team.wonItems.condition) needed++;
  if (!team.wonItems.atmosphere) needed++;
  if (!team.wonItems.scene) needed++;
  return needed;
}

function calculateMaxBid(teamId, currentItemCategory) {
  const team = state.teams.find(t => t.id === teamId);
  if (!team) return 0;
  
  if (team.wonItems[currentItemCategory]) {
    return 0; // already won this category
  }
  
  const needed = getRemainingCategoriesNeeded(team);
  const otherCategoriesNeeded = needed - 1;
  const requiredReserve = otherCategoriesNeeded * 50; // reserve 50 per needed category
  const maxBid = team.budget - requiredReserve;
  return maxBid > 0 ? Math.floor(maxBid / 50) * 50 : 0;
}

// Strip sensitive fields before broadcasting gameState
function sanitizeState() {
  const { initialBids, ...safeState } = state;
  return safeState;
}

function broadcastState(io) {
  io.emit('gameState', sanitizeState());
  saveGameState(state);
}

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.emit('gameState', sanitizeState());

    socket.on('joinAs', ({ role, teamId, studentInfo, classInfo, pin }) => {
      if (role === 'teacher') {
        const correctPin = process.env.TEACHER_PIN || '1234';
        if (pin !== correctPin) {
           socket.emit('authError', '비밀번호가 올바르지 않습니다.');
           return;
        }
        
        // If a new class connects, reset the game state for the new class
        const isNewClass = classInfo && state.classInfo && (
          String(state.classInfo.grade) !== String(classInfo.grade) || 
          String(state.classInfo.classNum) !== String(classInfo.classNum)
        );

        if (isNewClass) {
           const savedConnectedTeams = { ...state.connectedTeams };
           state = createInitialState();
           state.classInfo = classInfo;
           state.connectedTeams = savedConnectedTeams;
           // If class changed, reset studentInfo for all currently connected sockets
           Object.values(savedConnectedTeams).forEach(tId => {
             const team = state.teams.find(t => t.id === tId);
             if (team) team.studentInfo = null;
           });
        } else if (classInfo) {
           state.classInfo = classInfo;
        }

        state.teacherSocketId = socket.id;
        console.log(`Teacher connected for class ${state.classInfo ? state.classInfo.grade + '-' + state.classInfo.classNum : 'unknown'}`);
        socket.emit('gameState', sanitizeState());
      } else if (role === 'team' && teamId) {
        const targetTeam = state.teams.find(t => t.id === teamId);
        if (!targetTeam) return;

        // Ensure nobody else can steal the team if members don't match
        if (targetTeam.studentInfo && studentInfo) {
           if (targetTeam.studentInfo.grade !== studentInfo.grade || targetTeam.studentInfo.classNum !== studentInfo.classNum || targetTeam.studentInfo.members !== studentInfo.members) {
              socket.emit('authError', '이미 해당 모둠에 다른 학생 정보가 등록되어 있습니다. 잘못 등록된 경우 재판장(교사)에게 [정보 초기화]를 요청하세요.');
              return;
           }
        }

        // Kick existing connection for this team (prevent duplicates — issue #6)
        const existingSockId = Object.keys(state.connectedTeams).find(sid => state.connectedTeams[sid] === teamId);
        if (existingSockId && existingSockId !== socket.id) {
          io.to(existingSockId).emit('authError', '다른 기기에서 같은 모둠으로 접속하여 이전 연결이 해제되었습니다.');
          delete state.connectedTeams[existingSockId];
        }

        state.connectedTeams[socket.id] = teamId;
        if (studentInfo) {
          targetTeam.studentInfo = studentInfo;
        }
        console.log(`Team ${teamId} (${studentInfo ? studentInfo.members : 'Unknown'}) connected`);
        
        const connectedKeys = Object.values(state.connectedTeams);
        io.emit('connectedTeams', connectedKeys);
        
        // Broadcast new state so teacher dashboard gets the team members
        broadcastState(io);
        
        if (state.currentAuctionItemId) {
          const item = state.items.find(i => i.id === state.currentAuctionItemId);
          if (item) {
             socket.emit('bidLimits', { maxBid: calculateMaxBid(teamId, item.category) });
          }
        }
      }
    });

    socket.on('disconnect', () => {
      if (socket.id === state.teacherSocketId) {
        state.teacherSocketId = null;
      }
      if (state.connectedTeams[socket.id]) {
        delete state.connectedTeams[socket.id];
        const connectedKeys = Object.values(state.connectedTeams);
        io.emit('connectedTeams', connectedKeys);
      }
      console.log('Client disconnected:', socket.id);
    });

    // 1. Teacher starts auction
    socket.on('startAuctionFor', (itemId) => {
      if (socket.id !== state.teacherSocketId) return;
      
      const item = state.items.find(i => i.id === itemId);
      if (!item || item.isSold) return;

      state.currentAuctionItemId = itemId;
      state.auctionPhase = 'BIDDING';
      state.bids = {}; 
      state.secretTicketRequests = {};
      state.secretTicketApprovedTeams = [];
      state.initialBids = {};
      state.guesses = {};
      state.lastGuessWinners = null;
      
      broadcastState(io);
      
      Object.keys(state.connectedTeams).forEach(sockId => {
        const tId = state.connectedTeams[sockId];
        io.to(sockId).emit('bidLimits', { maxBid: calculateMaxBid(tId, item.category) });
      });
    });

    // 2. Teacher clicks Reveal Strategy (closes bidding)
    socket.on('revealBids', () => {
      if (socket.id !== state.teacherSocketId) return;
      if (state.auctionPhase !== 'BIDDING' && state.auctionPhase !== 'REBIDDING') return;

      state.auctionPhase = 'REVEALING';
      broadcastState(io);
    });

    // Handle teacher approving secret tickets
    socket.on('approveSecretTickets', () => {
      if (socket.id !== state.teacherSocketId) return;
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
      
      broadcastState(io);

      // Send initialBids ONLY to approved teams
      state.secretTicketApprovedTeams.forEach(tId => {
        const sockIds = Object.keys(state.connectedTeams).filter(sid => state.connectedTeams[sid] === tId);
        sockIds.forEach(sid => {
          io.to(sid).emit('initialBids', state.initialBids);
        });
      });
      // Also send to teacher for dashboard visibility
      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('initialBids', state.initialBids);
      }

      Object.keys(state.connectedTeams).forEach(sockId => {
        const tId = state.connectedTeams[sockId];
        const item = state.items.find(i => i.id === state.currentAuctionItemId);
        if (item) {
           io.to(sockId).emit('bidLimits', { maxBid: calculateMaxBid(tId, item.category) });
        }
      });
    });

    // 3. Complete the sale (After revealing)
    socket.on('completeSale', () => {
      if (socket.id !== state.teacherSocketId) return;
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
          awardGuessers(highestBid);
          broadcastState(io);
      } else if (winners.length > 1 && highestBid > 0) {
          state.auctionPhase = 'TIE_BREAKER';
          state.tiedTeams = winners;
          state.highestTieBid = highestBid;
          broadcastState(io);
      } else {
        // No valid bids — notify with NO_BIDS phase
        state.auctionPhase = 'NO_BIDS';
        let winningAmountForGuess = highestBid > 0 ? highestBid : 0;
        awardGuessers(winningAmountForGuess);
        broadcastState(io);
      }
    });

    socket.on('resolveTie', (winnerId) => {
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
      if (itemAfterTie) {
          awardGuessers(itemAfterTie.winningBid);
      }

      broadcastState(io);
    });

    socket.on('nextItem', () => {
        if (socket.id !== state.teacherSocketId) return;
        state.currentAuctionItemId = null;
        state.auctionPhase = 'WAITING';
        state.lastGuessWinners = null;
        broadcastState(io);
    });

    // Game reset (issue #12)
    socket.on('resetGame', () => {
        if (socket.id !== state.teacherSocketId) return;
        const savedTeacherSocket = state.teacherSocketId;
        const savedConnectedTeams = { ...state.connectedTeams };
        const savedClassInfo = state.classInfo;
        
        state = createInitialState();
        state.teacherSocketId = savedTeacherSocket;
        state.connectedTeams = savedConnectedTeams;
        state.classInfo = savedClassInfo;
        
        // Re-apply student info from connected sockets
        Object.values(savedConnectedTeams).forEach(tId => {
          const team = state.teams.find(t => t.id === tId);
          if (team) team.studentInfo = null;
        });
        broadcastState(io);
        console.log('Game reset by teacher');
    });

    socket.on('addTeam', () => {
      if (socket.id !== state.teacherSocketId) return;
      const nextIdNum = state.teams.length > 0 ? Math.max(...state.teams.map(t => parseInt(t.id.replace('team_', '')) || 0)) + 1 : 1;
      const newTeam = {
        id: `team_${nextIdNum}`,
        name: `${nextIdNum}모둠`,
        budget: initialBudget,
        hasSecretTicket: true,
        studentInfo: null,
        wonItems: { condition: null, atmosphere: null, scene: null }
      };
      state.teams.push(newTeam);
      broadcastState(io);
    });

    socket.on('removeTeam', (targetTeamId) => {
      if (socket.id !== state.teacherSocketId) return;
      state.teams = state.teams.filter(t => t.id !== targetTeamId);
      // Kick socket
      const targetSocketId = Object.keys(state.connectedTeams).find(sid => state.connectedTeams[sid] === targetTeamId);
      if (targetSocketId) {
         io.to(targetSocketId).emit('authError', '재판장에 의해 모둠이 삭제되었습니다.');
         delete state.connectedTeams[targetSocketId];
      }
      broadcastState(io);
    });

    socket.on('resetTeamInfo', (targetTeamId) => {
      if (socket.id !== state.teacherSocketId) return;
      const team = state.teams.find(t => t.id === targetTeamId);
      if (team) {
         team.studentInfo = null;
         // Kick so they can log back in
         const targetSocketId = Object.keys(state.connectedTeams).find(sid => state.connectedTeams[sid] === targetTeamId);
         if (targetSocketId) {
           io.to(targetSocketId).emit('authError', '재판장에 의해 등록 정보가 초기화되었습니다. 올바른 정보로 다시 입장해주세요.');
           delete state.connectedTeams[targetSocketId];
         }
      }
      broadcastState(io);
    });

    socket.on('submitBid', ({ amount, useSecretTicket }) => {
      const teamId = state.connectedTeams[socket.id];
      if (!teamId) return;
      if (state.auctionPhase !== 'BIDDING' && state.auctionPhase !== 'REBIDDING') return;
      
      const item = state.items.find(i => i.id === state.currentAuctionItemId);
      if (!item) return;

      const team = state.teams.find(t => t.id === teamId);
      const maxBid = calculateMaxBid(teamId, item.category);

      let validBid = Math.max(0, parseInt(amount, 10) || 0);
      if (validBid % 50 !== 0) {
        validBid = Math.floor(validBid / 50) * 50;
      }
      // Minimum bid is 50 (issue #9 — prevent 0-coin bids)
      if (validBid <= 0) {
        socket.emit('bidRejected', { reason: '최소 입찰 금액은 50 코인입니다.' });
        return;
      }

      let applyTicket = false;
      if (state.auctionPhase === 'BIDDING' && useSecretTicket && team.hasSecretTicket) {
         if (validBid + 100 <= maxBid) {
            applyTicket = true;
         } else {
            validBid = Math.max(0, Math.floor((maxBid - 100) / 50) * 50);
            applyTicket = true;
         }
      } else if (validBid > maxBid) {
        validBid = Math.floor(maxBid / 50) * 50;
      }

      state.bids[teamId] = validBid;
      if (state.auctionPhase === 'BIDDING') {
         state.secretTicketRequests[teamId] = applyTicket;
      }
      
      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('teamBidStatus', { 
           teamId, 
           hasBid: true, 
           requestedTicket: state.auctionPhase === 'BIDDING' ? applyTicket : false 
        });
      }
      socket.emit('bidAccepted', { amount: validBid });
      
      // Notify all clients of who has bid so far (without revealing amounts)
      io.emit('bidsUpdated', Object.keys(state.bids));
      // Broadcast secret ticket requests separately so UI can update
      io.emit('ticketRequestsUpdated', state.secretTicketRequests);
    });

    socket.on('submitGuess', ({ amount }) => {
      const teamId = state.connectedTeams[socket.id];
      if (!teamId) return;
      if (state.auctionPhase !== 'BIDDING' && state.auctionPhase !== 'REBIDDING') return;

      let validGuess = Math.max(0, parseInt(amount, 10) || 0);
      if (validGuess % 50 !== 0) {
        validGuess = Math.floor(validGuess / 50) * 50;
      }

      state.guesses[teamId] = validGuess;
      // Do NOT set state.bids — guessers are not bidders

      if (state.teacherSocketId) {
        io.to(state.teacherSocketId).emit('teamBidStatus', { 
           teamId, 
           hasBid: true, 
           requestedTicket: false,
           isGuess: true
        });
      }
      
      socket.emit('bidAccepted', { amount: 0, isGuess: true });
      io.emit('bidsUpdated', [...new Set([...Object.keys(state.bids), ...Object.keys(state.guesses)])]);
    });
  });
}

module.exports = { setupSocketHandlers };
