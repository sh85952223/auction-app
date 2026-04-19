import React, { useState } from 'react';
import AuctionBoard from './AuctionBoard';
import { Gavel, Play, Eye, Check, FileText, X, Settings, UserX, UserPlus, Trash2, RefreshCw } from 'lucide-react';

export default function TeacherView({ gameState, socket, teamBidStatus, connectedTeams, initialBids, onLogout }) {
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTeamMgmt, setShowTeamMgmt] = useState(false);
  const [isProjectorMode, setIsProjectorMode] = useState(false);

  const handleStartAuction = () => {
    if (selectedItemId) {
      socket.emit('startAuctionFor', selectedItemId);
    }
  };

  const handleReveal = () => {
    socket.emit('revealBids');
  };

  const handleCompleteSale = () => {
    socket.emit('completeSale');
  };

  const handleNext = () => {
    setSelectedItemId(null);
    socket.emit('nextItem');
  };

  const currentItem = gameState.currentAuctionItemId 
    ? gameState.items.find(i => i.id === gameState.currentAuctionItemId) 
    : null;

  return (
    <div className="flex flex-col gap-6" style={{ paddingBottom: '4rem' }}>
      <div className="panel flex justify-between items-center" style={{ position: 'sticky', top: '1rem', zIndex: 50, backgroundColor: 'rgba(74, 37, 17, 0.95)', backdropFilter: 'blur(10px)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="gold-text m-0 flex items-center gap-2" style={{ marginTop: 0 }}>
            <Gavel size={28} /> 재판장 대시보드 {gameState.classInfo && <span style={{fontSize:'1.2rem', color:'#f4ecd8'}}>[{gameState.classInfo.grade}학년 {gameState.classInfo.classNum}반]</span>}
            <button 
              onClick={() => setIsProjectorMode(!isProjectorMode)}
              style={{ 
                marginLeft: '1rem', 
                fontSize: '0.8rem', 
                padding: '0.3rem 0.6rem', 
                borderRadius: '20px', 
                border: '1px solid #d4af37',
                backgroundColor: isProjectorMode ? '#d4af37' : 'transparent',
                color: isProjectorMode ? '#1a1a1a' : '#d4af37',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <Eye size={14} /> {isProjectorMode ? '프로젝터 모드: ON (보안)' : '프로젝터 모드: OFF'}
            </button>
          </h2>
          <div style={{ fontSize: '1rem', color: '#ccc', marginTop: '0.5rem' }}>
            진행 상태: <strong style={{ color: '#fff' }}>
              {gameState.auctionPhase === 'WAITING' ? '대기 중 (경매 항목을 선택하세요)' :
               gameState.auctionPhase === 'BIDDING' ? '학생 입찰 진행 중...' :
               gameState.auctionPhase === 'REBIDDING' ? '재입찰 진행 중... (해제권 사용됨)' :
               gameState.auctionPhase === 'REVEALING' ? '입찰 결과 확인 중' : 
               gameState.auctionPhase === 'TIE_BREAKER' ? '동점 발생! 가위바위보 대결' : 
               gameState.auctionPhase === 'NO_BIDS' ? '유찰 (유효한 입찰 없음)' : '낙찰 완료'}
            </strong>
          </div>
        </div>
        
        <div className="flex gap-4" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          {gameState.auctionPhase === 'WAITING' && (
            <button 
              className="btn-primary" 
              disabled={!selectedItemId} 
              onClick={handleStartAuction}
            >
              <Play size={20} /> 경매 시작
            </button>
          )}
          {gameState.auctionPhase === 'BIDDING' && (
            <>
              {Object.values(gameState.secretTicketRequests || {}).some(r => r) && (
                <button 
                  className="btn-primary" 
                  onClick={() => socket.emit('approveSecretTickets')}
                  style={{ backgroundColor: '#2563eb', borderColor: '#60a5fa' }}
                >
                  <Eye size={20} /> 해제권 허가 및 재입찰 진행 {isProjectorMode ? '(요청됨)' : `(${Object.values(gameState.secretTicketRequests).filter(v => v).length}팀 요청!)`}
                </button>
              )}
              <button 
                className="btn-primary" 
                onClick={handleReveal}
              >
                <Eye size={20} /> 경매 마감 및 결과 공개
              </button>
            </>
          )}
          {gameState.auctionPhase === 'REBIDDING' && (
             <button 
                className="btn-primary" 
                onClick={handleReveal}
             >
                <Eye size={20} /> 재입찰 마감 및 최종 결과 공개
             </button>
          )}
          {gameState.auctionPhase === 'REVEALING' && (
            <button 
              className="btn-primary" 
              onClick={handleCompleteSale}
              style={{ backgroundColor: '#1a1a1a', borderColor: '#d4af37' }}
            >
              <Gavel size={20} /> 낙찰 확정
            </button>
          )}

          {gameState.auctionPhase === 'TIE_BREAKER' && (
             <div className="panel" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }}>
                <h4 style={{ color: '#ef4444', fontSize: '1.2rem', marginTop: 0 }}>⚔️ 최고가 동점 발생! 가위바위보 승자를 선택하세요</h4>
                <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: '1rem' }}>
                   {gameState.tiedTeams?.map(tId => {
                      const team = gameState.teams.find(t => t.id === tId);
                      return (
                         <button 
                           key={tId} 
                           className="btn-primary" 
                           onClick={() => socket.emit('resolveTie', tId)}
                           style={{ backgroundColor: '#d4af37', color: '#1a1a1a', borderColor: '#fff' }}
                         >
                            <Gavel size={16} /> {team?.name} 승리
                         </button>
                      );
                   })}
                </div>
             </div>
          )}
          {(gameState.auctionPhase === 'SOLD' || gameState.auctionPhase === 'NO_BIDS') && (
            <button 
              className="btn-primary" 
              onClick={handleNext}
            >
              <Check size={20} /> 다음 경매로
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={() => setShowDashboard(true)}
            style={{ backgroundColor: '#10b981', borderColor: '#059669', color: '#fff', marginRight: '0.5rem' }}
          >
            <FileText size={20} /> 결과 리포트
          </button>
          <button 
            className="btn-primary" 
            onClick={() => setShowTeamMgmt(true)}
            style={{ backgroundColor: '#6366f1', borderColor: '#4f46e5', color: '#fff', marginRight: '0.5rem' }}
          >
            <Settings size={20} /> 모둠 관리
          </button>
          {gameState.auctionPhase === 'WAITING' && (
            <button 
              className="btn-primary" 
              onClick={() => { if (confirm('정말로 전체 경매를 처음부터 다시 시작하시겠습니까?\n모든 입찰 결과와 예산이 초기화됩니다.')) socket.emit('resetGame'); }}
              style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
            >
              초기화
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={onLogout}
            style={{ backgroundColor: 'transparent', borderColor: '#888', color: '#aaa', padding: '0.5rem 1rem', fontSize: '1rem', marginLeft: '1rem' }}
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="teacher-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '8rem', zIndex: 40 }}>
          {gameState.lastGuessWinners && gameState.lastGuessWinners.teams && gameState.lastGuessWinners.teams.length > 0 && (
             <div className="panel" style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: '#34d399', padding: '1rem' }}>
                <h4 style={{ margin: 0, color: '#34d399', fontSize: '1.2rem', marginBottom: '0.5rem' }}>🎯 낙찰가 예측 보너스 지급</h4>
                <div style={{ color: '#f4ecd8', fontSize: '0.95rem' }}>
                  실제 금액: <strong>{gameState.lastGuessWinners.winningAmount} 코인</strong><br/>
                  결과 오차: {gameState.lastGuessWinners.minDiff} 코인<br/>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                     {gameState.lastGuessWinners.teams.map(tId => {
                         const t = gameState.teams.find(team => team.id === tId);
                         return <span key={tId} style={{ backgroundColor: 'rgba(52, 211, 153, 0.3)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>{t?.name}</span>;
                     })}
                  </div>
                </div>
             </div>
          )}
          <div className="panel">
          <h3 className="gold-text" style={{ marginTop: 0, borderBottom: '1px solid #d4af37', paddingBottom: '0.5rem' }}>
            모둠 현황
          </h3>
          <div className="flex flex-col gap-2">
            {gameState.teams.map(team => {
              const isConnected = connectedTeams && connectedTeams.includes(team.id);
              const hasBid = teamBidStatus && teamBidStatus[team.id];
              
              const wonCondition = team.wonItems.condition ? gameState.items.find(i => i.id === team.wonItems.condition) : null;
              const wonAtmosphere = team.wonItems.atmosphere ? gameState.items.find(i => i.id === team.wonItems.atmosphere) : null;
              const wonScene = team.wonItems.scene ? gameState.items.find(i => i.id === team.wonItems.scene) : null;
              
              return (
                <div key={team.id} style={{ 
                  padding: '0.8rem', 
                  backgroundColor: 'rgba(0,0,0,0.3)', 
                  borderLeft: `4px solid ${isConnected ? '#4ade80' : '#ef4444'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        {team.name} {team.studentInfo && <span style={{fontSize: '0.9rem', color: '#ccc'}}>({team.studentInfo.grade}학년 {team.studentInfo.classNum}반 {team.studentInfo.members})</span>}
                      </div> 
                      <div style={{ fontSize: '0.85rem', color: '#ccc', marginTop: '0.2rem' }}>
                        보유: <span className="gold-text">{team.budget}</span> 코인 | 
                        접속: {isConnected ? 'O' : 'X'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      {(gameState.auctionPhase === 'BIDDING' || gameState.auctionPhase === 'REBIDDING') && hasBid && (
                        <div style={{ color: teamBidStatus[team.id]?.isGuess ? '#34d399' : '#4ade80', fontWeight: 'bold', fontSize: '0.9rem' }}>
                           {teamBidStatus[team.id]?.isGuess ? '예측 완료' : '제출 완료'} 
                           {gameState.secretTicketRequests?.[team.id] && !isProjectorMode && <span style={{color: '#60a5fa'}}> (해제권 요청)</span>}
                        </div>
                      )}
                      
                      {gameState.auctionPhase === 'REBIDDING' && initialBids?.[team.id] !== undefined && (
                         <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                            {isProjectorMode ? 
                              <span title="교사 직접 확인용: 마우스를 올리면 보입니다" style={{ backgroundColor: '#222', padding: '0 0.5rem', borderRadius: '4px', cursor: 'help' }} className="mask-hover">
                                 {initialBids[team.id]}
                              </span> : 
                              <span className="gold-text">{initialBids[team.id]} (1차)</span>
                            }
                         </div>
                      )}

                      {gameState.auctionPhase === 'REVEALING' && gameState.bids[team.id] !== undefined && (
                        <div className="gold-text stamp-anim" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                          {gameState.bids[team.id]}
                        </div>
                      )}
                      {gameState.auctionPhase === 'REVEALING' && gameState.bids[team.id] === undefined && gameState.guesses?.[team.id] !== undefined && (
                        <div className="stamp-anim" style={{ fontSize: '1rem', fontWeight: 'bold', color: '#34d399' }}>
                          🤔 예측 참여 ({gameState.guesses[team.id]} 코인)
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {(wonCondition || wonAtmosphere || wonScene) && (
                    <div style={{ fontSize: '0.85rem', color: '#f4ecd8', backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: '4px' }}>
                      {wonCondition && <div style={{marginBottom:'2px'}}>[조건] {wonCondition.name} <span style={{color: '#d4af37'}}>({wonCondition.winningBid}코인)</span></div>}
                      {wonAtmosphere && <div style={{marginBottom:'2px'}}>[분위기] {wonAtmosphere.name} <span style={{color: '#d4af37'}}>({wonAtmosphere.winningBid}코인)</span></div>}
                      {wonScene && <div>[장면] {wonScene.name} <span style={{color: '#d4af37'}}>({wonScene.winningBid}코인)</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>

        <div>
           <AuctionBoard 
             gameState={gameState} 
             selectedItemId={gameState.currentAuctionItemId || selectedItemId} 
             onSelectItem={setSelectedItemId}
             isTeacher={true}
           />
        </div>
      </div>
      
      {showDashboard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, padding: '2rem', overflowY: 'auto' }}>
          <div className="panel" style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
             <button 
               onClick={() => setShowDashboard(false)} 
               style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}
             >
               <X size={32} />
             </button>
             
             <h2 className="gold-text" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '2rem', borderBottom: '2px solid #d4af37', paddingBottom: '1rem' }}>
               {gameState.classInfo ? `${gameState.classInfo.grade}학년 ${gameState.classInfo.classNum}반 ` : ''} 
               가족문화 경매 최종 결과 리포트
             </h2>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
               {gameState.teams.map(team => {
                 const wonCondition = team.wonItems.condition ? gameState.items.find(i => i.id === team.wonItems.condition) : null;
                 const wonAtmosphere = team.wonItems.atmosphere ? gameState.items.find(i => i.id === team.wonItems.atmosphere) : null;
                 const wonScene = team.wonItems.scene ? gameState.items.find(i => i.id === team.wonItems.scene) : null;
                 const totalSpent = (wonCondition?.winningBid || 0) + (wonAtmosphere?.winningBid || 0) + (wonScene?.winningBid || 0);
                 
                 return (
                   <div key={team.id} style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid #d4af37', borderRadius: '8px', padding: '1.5rem' }}>
                     <h3 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span className="gold-text" style={{ fontSize: '1.4rem' }}>{team.name}</span>
                        <span style={{ color: '#ccc', fontSize: '1rem' }}>{team.studentInfo ? `${team.studentInfo.grade}학년 ${team.studentInfo.classNum}반 ${team.studentInfo.members}` : '미접속/미입력'}</span>
                     </h3>
                     
                     <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '1rem' }}>
                       <div style={{ flex: 1, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '4px' }}>
                          <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.3rem' }}>남은 예산</div>
                          <div className="gold-text" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{team.budget}</div>
                       </div>
                       <div style={{ flex: 1, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '4px' }}>
                          <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.3rem' }}>총 사용 금액</div>
                          <div style={{ color: '#f4ecd8', fontSize: '1.5rem', fontWeight: 'bold' }}>{totalSpent}</div>
                       </div>
                     </div>
                     
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderLeft: '3px solid #10b981', padding: '0.8rem', borderRadius: '0 4px 4px 0' }}>
                           <strong style={{ color: '#10b981', fontSize: '0.9rem', display: 'block', marginBottom: '0.3rem' }}>가족의 조건</strong>
                           {wonCondition ? 
                             <div><span style={{ color: '#f4ecd8' }}>{wonCondition.name}</span> <span style={{ float: 'right', color: '#10b981' }}>({wonCondition.winningBid} 💰)</span></div> : 
                             <span style={{ color: '#555' }}>낙찰 기록 없음</span>}
                        </div>
                        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', borderLeft: '3px solid #3b82f6', padding: '0.8rem', borderRadius: '0 4px 4px 0' }}>
                           <strong style={{ color: '#3b82f6', fontSize: '0.9rem', display: 'block', marginBottom: '0.3rem' }}>가족의 분위기 코드</strong>
                           {wonAtmosphere ? 
                             <div><span style={{ color: '#f4ecd8' }}>{wonAtmosphere.name}</span> <span style={{ float: 'right', color: '#3b82f6' }}>({wonAtmosphere.winningBid} 💰)</span></div> : 
                             <span style={{ color: '#555' }}>낙찰 기록 없음</span>}
                        </div>
                        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderLeft: '3px solid #f59e0b', padding: '0.8rem', borderRadius: '0 4px 4px 0' }}>
                           <strong style={{ color: '#f59e0b', fontSize: '0.9rem', display: 'block', marginBottom: '0.3rem' }}>필수 장면</strong>
                           {wonScene ? 
                             <div><span style={{ color: '#f4ecd8' }}>{wonScene.name}</span> <span style={{ float: 'right', color: '#f59e0b' }}>({wonScene.winningBid} 💰)</span></div> : 
                             <span style={{ color: '#555' }}>낙찰 기록 없음</span>}
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      )}
      
      {showTeamMgmt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, padding: '2rem', overflowY: 'auto' }}>
          <div className="panel" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
             <button 
               onClick={() => setShowTeamMgmt(false)} 
               style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}
             >
               <X size={32} />
             </button>
             
             <h2 className="gold-text" style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '1.5rem', borderBottom: '2px solid #d4af37', paddingBottom: '1rem' }}>
               <Settings size={28} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> 모둠 정보 관리
             </h2>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
               <p style={{ color: '#aaa', margin: 0 }}>등록된 학생 정보를 초기화하거나, 모둠의 개수를 조정할 수 있습니다.</p>
               <button 
                 className="btn-primary" 
                 onClick={() => socket.emit('addTeam')}
                 style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
               >
                 <UserPlus size={16} /> 모둠 1개 추가
               </button>
             </div>
             
             <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
               {gameState.teams.map(team => (
                 <li key={team.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', border: '1px solid #444', borderRadius: '4px', marginBottom: '0.5rem' }}>
                   <div>
                     <strong style={{ fontSize: '1.2rem', color: '#f4ecd8', marginRight: '1rem' }}>{team.name}</strong>
                     {team.studentInfo ? (
                       <span style={{ color: '#10b981' }}>{team.studentInfo.grade}학년 {team.studentInfo.classNum}반 ({team.studentInfo.members})</span>
                     ) : (
                       <span style={{ color: '#888' }}>미등록 / 대기 중</span>
                     )}
                   </div>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button 
                       onClick={() => { if(confirm(`${team.name}의 등록 정보를 초기화합니까? 현재 접속자는 튕기게 되며 새 학생이 모둠을 탈취할 수 있습니다.`)) socket.emit('resetTeamInfo', team.id); }}
                       disabled={!team.studentInfo}
                       style={{ background: '#374151', color: team.studentInfo ? '#f4ecd8' : '#6b7280', border: '1px solid #4b5563', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: team.studentInfo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                     >
                       <RefreshCw size={14} /> 정보 리셋
                     </button>
                     <button 
                       onClick={() => { if(confirm(`정말 ${team.name}을(를) 삭제합니까? 낙찰 기록 및 예산이 모두 사라집니다.`)) socket.emit('removeTeam', team.id); }}
                       style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                     >
                       <Trash2 size={14} /> 삭제
                     </button>
                   </div>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      )}
    </div>
  );
}
