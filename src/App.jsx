import React, { useState, useEffect } from 'react';
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
  const [bidLimits, setBidLimits] = useState({ maxBid: 0 });
  const [teamBidStatus, setTeamBidStatus] = useState({}); // track who has bid internally if needed
  const [connectedTeams, setConnectedTeams] = useState([]);

  useEffect(() => {
    // Session restoration — wait for socket connection (issue #10)
    const restoreSession = () => {
      const savedRole = localStorage.getItem('auctionRole');
      if (savedRole === 'teacher') {
        const savedPin = localStorage.getItem('auctionPin');
        const savedClassInfo = localStorage.getItem('auctionClassInfo');
        let classInfo = null;
        try { if (savedClassInfo) classInfo = JSON.parse(savedClassInfo); } catch(e) {}
        if (savedPin) handleJoin('teacher', null, classInfo, savedPin);
      } else if (savedRole === 'team') {
        const savedTeamId = localStorage.getItem('auctionTeamId');
        const savedStudentInfo = localStorage.getItem('auctionStudentInfo');
        if (savedTeamId && savedStudentInfo) {
          try {
            handleJoin('team', savedTeamId, JSON.parse(savedStudentInfo));
          } catch(e) {
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
      // Keep connectedTeams in sync so teacher always sees correct status after refresh
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

    socket.on('teamBidStatus', ({ teamId, hasBid, requestedTicket, isGuess }) => {
      setTeamBidStatus(prev => ({ ...prev, [teamId]: { hasBid, requestedTicket, isGuess } }));
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
      socket.off('authError');
    };
  }, []);

  const handleJoin = (selectedRole, selectedTeamId = null, extraInfo = null, pin = null) => {
    if (selectedRole === 'teacher') {
      localStorage.setItem('auctionRole', 'teacher');
      if (pin) localStorage.setItem('auctionPin', pin);
      if (extraInfo) localStorage.setItem('auctionClassInfo', JSON.stringify(extraInfo));
    } else if (selectedRole === 'team') {
      localStorage.setItem('auctionRole', 'team');
      localStorage.setItem('auctionTeamId', selectedTeamId);
      if (extraInfo) {
        localStorage.setItem('auctionStudentInfo', JSON.stringify(extraInfo));
      }
    }

    setRole(selectedRole);
    if (selectedRole === 'team') {
      setTeamId(selectedTeamId);
    }
    socket.emit('joinAs', { role: selectedRole, teamId: selectedTeamId, classInfo: selectedRole === 'teacher' ? extraInfo : null, studentInfo: selectedRole === 'team' ? extraInfo : null, pin });
  };

  const handleLogout = () => {
    localStorage.removeItem('auctionRole');
    localStorage.removeItem('auctionTeamId');
    localStorage.removeItem('auctionStudentInfo');
    localStorage.removeItem('auctionPin');
    localStorage.removeItem('auctionClassInfo');
    setRole(null);
    setTeamId(null);
    window.location.reload();
  };

  if (!role) {
    return <Lobby onJoin={handleJoin} connectedTeams={connectedTeams} teams={gameState?.teams || []} />;
  }

  if (!gameState) {
    return <div className="courtroom-container items-center justify-center"><h2>재판소 접속 중... (상태 로딩중)</h2></div>;
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
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
