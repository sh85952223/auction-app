import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import TeacherView from './components/TeacherView';
import StudentView from './components/StudentView';

const socketUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
const socket = io(socketUrl);

function App() {
  const [gameState, setGameState] = useState(null);
  const [initialBids, setInitialBids] = useState(null);
  const [role, setRole] = useState(null); // 'teacher' or 'team'
  const [teamId, setTeamId] = useState(null);
  const [sessionCode, setSessionCode] = useState(null);
  const [bidLimits, setBidLimits] = useState({ maxBid: 0 });
  const [teamBidStatus, setTeamBidStatus] = useState({});
  const [connectedTeams, setConnectedTeams] = useState([]);
  const [lobbyTeams, setLobbyTeams] = useState([]);

  const handleRequestTeams = (code) => {
    socket.emit('getTeamsForClass', { sessionCode: code });
  };

  const handleJoin = (selectedRole, selectedTeamId = null, extraInfo = null, pin = null, code = null) => {
    if (selectedRole === 'teacher') {
      localStorage.setItem('auctionRole', 'teacher');
      if (pin) localStorage.setItem('auctionPin', pin);
      if (extraInfo) localStorage.setItem('auctionClassInfo', JSON.stringify(extraInfo));
      // sessionCode는 서버가 발급 → sessionCode 이벤트로 저장
    } else if (selectedRole === 'team') {
      localStorage.setItem('auctionRole', 'team');
      localStorage.setItem('auctionTeamId', selectedTeamId);
      if (extraInfo) localStorage.setItem('auctionStudentInfo', JSON.stringify(extraInfo));
      if (code) localStorage.setItem('auctionSessionCode', code);
    }

    setRole(selectedRole);
    if (selectedRole === 'team') {
      setTeamId(selectedTeamId);
      setSessionCode(code);
    }
    socket.emit('joinAs', {
      role: selectedRole,
      teamId: selectedTeamId,
      classInfo: selectedRole === 'teacher' ? extraInfo : null,
      studentInfo: selectedRole === 'team' ? extraInfo : null,
      pin,
      sessionCode: code,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('auctionRole');
    localStorage.removeItem('auctionTeamId');
    localStorage.removeItem('auctionStudentInfo');
    localStorage.removeItem('auctionPin');
    localStorage.removeItem('auctionClassInfo');
    localStorage.removeItem('auctionSessionCode');
    setRole(null);
    setTeamId(null);
    setSessionCode(null);
    window.location.reload();
  };

  useEffect(() => {
    // Session restoration — wait for socket connection (issue #10)
    const restoreSession = () => {
      const savedRole = localStorage.getItem('auctionRole');
      if (savedRole === 'teacher') {
        const savedPin = localStorage.getItem('auctionPin');
        const savedClassInfo = localStorage.getItem('auctionClassInfo');
        const savedCode = localStorage.getItem('auctionSessionCode');
        let classInfo = null;
        try { if (savedClassInfo) classInfo = JSON.parse(savedClassInfo); } catch { /* invalid JSON, skip */ }
        if (savedPin) handleJoin('teacher', null, classInfo, savedPin, savedCode);
      } else if (savedRole === 'team') {
        const savedTeamId = localStorage.getItem('auctionTeamId');
        const savedStudentInfo = localStorage.getItem('auctionStudentInfo');
        const savedCode = localStorage.getItem('auctionSessionCode');
        if (savedTeamId && savedStudentInfo && savedCode) {
          try {
            handleJoin('team', savedTeamId, JSON.parse(savedStudentInfo), null, savedCode);
          } catch (e) {
            console.error('Failed to parse student info', e);
          }
        }
      }
    };
    if (socket.connected) {
      restoreSession();
    } else {
      socket.on('connect', restoreSession);
    }

    socket.on('gameState', (state) => {
      setGameState(state);
      if (state.connectedTeams) {
        setConnectedTeams(Object.values(state.connectedTeams));
      }
    });

    socket.on('bidLimits', (limits) => {
      setBidLimits(limits);
    });

    socket.on('connectedTeams', (teams) => {
      setConnectedTeams(teams);
    });

    socket.on('teamBidStatus', ({ teamId: tid, hasBid, requestedTicket, isGuess }) => {
      setTeamBidStatus(prev => ({ ...prev, [tid]: { hasBid, requestedTicket, isGuess } }));
    });

    socket.on('bidsUpdated', (teamsWhoBid) => {
      setTeamBidStatus(prev => {
        const statusObj = {};
        teamsWhoBid.forEach(id => {
          statusObj[id] = prev[id] || { hasBid: true };
        });
        return statusObj;
      });
    });

    socket.on('initialBids', (bids) => {
      setInitialBids(bids);
    });

    socket.on('ticketRequestsUpdated', (requests) => {
      setGameState(prevState => {
        if (!prevState) return null;
        return { ...prevState, secretTicketRequests: requests };
      });
    });

    socket.on('teamsForClass', (teams) => {
      setLobbyTeams(teams);
    });

    socket.on('sessionCode', (code) => {
      setSessionCode(code);
      localStorage.setItem('auctionSessionCode', code);
    });

    socket.on('authError', (msg) => {
      alert(msg);
      handleLogout();
    });

    return () => {
      socket.off('connect');
      socket.off('gameState');
      socket.off('bidLimits');
      socket.off('connectedTeams');
      socket.off('teamBidStatus');
      socket.off('bidsUpdated');
      socket.off('ticketRequestsUpdated');
      socket.off('initialBids');
      socket.off('teamsForClass');
      socket.off('sessionCode');
      socket.off('authError');
    };
  }, []); // socket listeners are set up once on mount

  if (!role) {
    return <Lobby onJoin={handleJoin} connectedTeams={connectedTeams} onRequestTeams={handleRequestTeams} lobbyTeams={lobbyTeams} />;
  }

  if (!gameState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border-default)', borderTopColor: 'var(--violet)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>접속 중...</p>
      </div>
    );
  }

  return (
    <div className="courtroom-container">
      {role === 'teacher' ? (
        <TeacherView
          gameState={gameState}
          socket={socket}
          teamBidStatus={teamBidStatus}
          connectedTeams={connectedTeams}
          initialBids={initialBids}
          sessionCode={sessionCode}
          onLogout={handleLogout}
        />
      ) : (
        <StudentView
          gameState={gameState}
          socket={socket}
          teamId={teamId}
          bidLimits={bidLimits}
          teamBidStatus={teamBidStatus}
          initialBids={initialBids}
          connectedTeams={connectedTeams}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
