import React, { useState, useEffect } from 'react';
import { Gavel, AlertCircle } from 'lucide-react';
import AuctionBoard from './AuctionBoard';

export default function StudentView({ gameState, socket, teamId, bidLimits, initialBids, onLogout }) {
  const [bidAmount, setBidAmount] = useState('');
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [useSecretTicket, setUseSecretTicket] = useState(false);
  const [participationMode, setParticipationMode] = useState(null); // null, 'PARTICIPATING', 'GUESSING'
  const [guessAmount, setGuessAmount] = useState('');

  const team = gameState.teams.find(t => t.id === teamId);
  const currentItem = gameState.currentAuctionItemId 
    ? gameState.items.find(i => i.id === gameState.currentAuctionItemId)
    : null;

  useEffect(() => {
    // Reset local bid state when phase changes to BIDDING
    if (gameState.auctionPhase === 'BIDDING') {
      setBidAmount('');
      setBidSubmitted(false);
      setErrorMsg('');
      setUseSecretTicket(false);
      setParticipationMode(null);
      setGuessAmount('');
    } else if (gameState.auctionPhase === 'REBIDDING') {
      // Issue #7: Skip mode selection for REBIDDING — go straight to bidding
      setBidAmount('');
      setBidSubmitted(false);
      setErrorMsg('');
      setUseSecretTicket(false);
      setGuessAmount('');
      setParticipationMode('PARTICIPATING');
    }
  }, [gameState.auctionPhase]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseInt(bidAmount, 10);
    
    if (isNaN(amount) || amount < 50) {
      setErrorMsg('최소 50 코인 이상 입력해주세요.');
      return;
    }

    if (amount % 50 !== 0) {
      setErrorMsg('입찰 금액은 50 코인 단위로 입력해야 합니다.');
      return;
    }
    
    const actualMaxBid = (gameState.auctionPhase === 'BIDDING' && useSecretTicket && team.hasSecretTicket) 
                         ? bidLimits.maxBid - 100 
                         : bidLimits.maxBid;

    if (amount > actualMaxBid) {
      if (useSecretTicket) {
         setErrorMsg(`해제권 사용 시 최대 입찰 가능 금액은 ${actualMaxBid} 코인입니다.`);
      } else {
         setErrorMsg(`최대 입찰 가능 금액은 ${actualMaxBid} 코인입니다.`);
      }
      return;
    }

    socket.emit('submitBid', { amount, useSecretTicket: useSecretTicket && team.hasSecretTicket });
    setBidSubmitted(true);
    setErrorMsg('');
  };

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    const amount = parseInt(guessAmount, 10);
    
    if (isNaN(amount) || amount < 0) {
      setErrorMsg('올바른 금액을 입력하세요.');
      return;
    }

    if (amount % 50 !== 0) {
      setErrorMsg('예측 금액은 50 코인 단위로 입력해야 합니다.');
      return;
    }
    
    socket.emit('submitGuess', { amount });
    setBidSubmitted(true);
    setErrorMsg('');
  };

  return (
    <div className="flex flex-col gap-6" style={{ paddingBottom: (gameState.auctionPhase === 'BIDDING' || gameState.auctionPhase === 'REBIDDING') && !bidSubmitted ? '280px' : '2rem' }}>
      <div className="panel flex justify-between items-center" style={{ backgroundColor: 'rgba(26,10,2,0.95)' }}>
        <div>
          <h2 className="gold-text m-0 flex items-center gap-2" style={{ marginTop: 0 }}>
            {team?.name}
          </h2>
          <div style={{ color: '#aaa', marginTop: '0.4rem', fontSize: '0.9rem' }}>남은 예산 (코인)</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid #aaa', color: '#aaa', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '0.5rem' }}>처음으로</button>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', lineHeight: 1 }}>
            {team?.budget}
          </div>
        </div>
      </div>

      {currentItem && (gameState.auctionPhase === 'BIDDING' || gameState.auctionPhase === 'REBIDDING' || gameState.auctionPhase === 'REVEALING' || gameState.auctionPhase === 'TIE_BREAKER' || gameState.auctionPhase === 'NO_BIDS') ? (
        <div className="panel bidding-area" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <h3 style={{ color: '#ccc', fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem' }}>현재 경매 항목</h3>
          <div className="badge" style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}>{currentItem.categoryName}</div>
          <h2 className="gold-text" style={{ fontSize: '2.2rem', margin: '1.5rem 0 2.5rem 0' }}>
            "{currentItem.name}"
          </h2>

          {gameState.auctionPhase === 'REBIDDING' && gameState.secretTicketApprovedTeams?.includes(team.id) && (
             <div className="panel" style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', borderColor: '#60a5fa', marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h4 style={{ color: '#60a5fa', fontSize: '1.3rem', marginTop: 0, borderBottom: '1px solid #60a5fa', paddingBottom: '0.5rem' }}>비밀 첩보: 1차 입찰 결과</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem', textAlign: 'left', marginTop: '1.5rem' }}>
                   {gameState.teams.map(t => {
                      if (initialBids && initialBids[t.id] !== undefined) {
                         const bidValue = initialBids[t.id];
                         return (
                           <div key={t.id} style={{ padding: '0.8rem', backgroundColor: 'rgba(0,0,0,0.4)', borderLeft: '3px solid #60a5fa', borderRadius: '4px' }}>
                              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>{t.name}</div>
                              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f4ecd8' }}>{bidValue} <span style={{fontSize:'0.9rem', fontWeight:'normal'}}>코인</span></div>
                           </div>
                         );
                      }
                      return null;
                   })}
                </div>
                <p style={{ marginTop: '1.5rem', color: '#f4ecd8', fontSize: '1rem', fontWeight: 'bold' }}>💡 전략을 수정하여 2차(최종) 입찰가를 제출해 주십시오.</p>
             </div>
          )}

          {gameState.auctionPhase === 'REBIDDING' && !gameState.secretTicketApprovedTeams?.includes(team.id) && (
             <div className="panel stamp-anim" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', marginBottom: '1.5rem', padding: '1.5rem', textAlign: 'center' }}>
                <h4 style={{ color: '#ef4444', fontSize: '1.3rem', marginTop: 0, borderBottom: '1px solid #ef4444', paddingBottom: '0.5rem' }}>🚨 긴급 상황: 전원 재입찰 발생!</h4>
                <p style={{ marginTop: '1rem', color: '#f4ecd8', fontSize: '1rem', lineHeight: '1.5' }}>
                  다른 누군가가 <strong>시크릿 해제권</strong>을 사용하여 모든 모둠의 1차 입찰가를 파악했습니다!<br/><br/>
                  모든 입찰이 무효화되었으니, 방어 전략을 세워 <strong>새로운 최종 금액</strong>을 다시 제출해주십시오.
                </p>
             </div>
          )}

          {(gameState.auctionPhase === 'BIDDING' || gameState.auctionPhase === 'REBIDDING') && !bidSubmitted && (
            <div className="panel sticky-bottom-bar" style={{ maxWidth: '768px', margin: '0 auto' }}>
              {participationMode === null && (
                 <div style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#f4ecd8', marginBottom: '2rem', fontSize: '1.4rem' }}>이번 경매에 참여하시겠습니까?</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                       <button 
                         className="btn-primary" 
                         onClick={() => setParticipationMode('PARTICIPATING')}
                         style={{ padding: '1rem', fontSize: '1.2rem', backgroundColor: '#d4af37', color: '#1a1a1a', borderColor: '#fff' }}
                       >
                         💰 경매 참여하기
                       </button>
                       <button 
                         className="btn-primary" 
                         onClick={() => setParticipationMode('GUESSING')}
                         style={{ padding: '1rem', fontSize: '1.2rem', backgroundColor: 'transparent', borderColor: '#d4af37', color: '#d4af37' }}
                       >
                         🤔 입찰 포기하고 낙찰가 예측하기 (보너스 도전)
                       </button>
                    </div>
                 </div>
              )}

              {participationMode === 'PARTICIPATING' && (
                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <button type="button" onClick={() => setParticipationMode(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', textDecoration: 'underline' }}>← 선택으로 돌아가기</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                    <label>입찰 금액 (코인)</label>
                    <span style={{ color: '#d4af37' }}>최대: {bidLimits.maxBid}</span>
                  </div>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    max={bidLimits.maxBid}
                    step="50"
                    autoFocus
                    style={{ fontSize: '1.5rem', textAlign: 'right', padding: '1rem', marginBottom: '1rem' }}
                  />
                  {team.hasSecretTicket && gameState.auctionPhase === 'BIDDING' && (
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(96, 165, 250, 0.1)', border: '1px solid #60a5fa', borderRadius: '4px', marginBottom: '1rem' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={useSecretTicket} 
                              onChange={(e) => setUseSecretTicket(e.target.checked)} 
                              style={{ width: '20px', height: '20px' }}
                            />
                            <span style={{ fontSize: '1.2rem', color: '#60a5fa', fontWeight: 'bold' }}>시크릿 해제권 사용하기 (-100 코인)</span>
                         </label>
                         <p style={{ margin: '0.5rem 0 0 2.2rem', fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4' }}>
                            남은 예산에서 100코인을 사용해 전체 참가자의 최초 입찰가를 확인하고, 다시 한번 입찰 금액을 변경할 수 있는 기회를 얻습니다. (1회 한정)
                         </p>
                      </div>
                  )}
                  {errorMsg && (
                    <div style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold' }}>
                      <AlertCircle size={16} /> {errorMsg}
                    </div>
                  )}
                  {bidLimits.maxBid === 0 && (
                    <div style={{ color: '#d4af37', marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.5' }}>
                      안내: 이 범주의 항목을 이미 낙찰받았거나, 다른 필수 항목 획득을 위해 남겨두어야 할 최소 안전 예산입니다. 이번 경매에는 참여할 수 없습니다.
                    </div>
                  )}
                  <button 
                    type="submit" 
                    className="btn-primary w-full"
                    disabled={bidLimits.maxBid === 0}
                    style={{ padding: '1.2rem', fontSize: '1.3rem', letterSpacing: '2px' }}
                  >
                    밀봉 입찰서 제출
                  </button>
                </form>
              )}

              {participationMode === 'GUESSING' && (
                <form onSubmit={handleGuessSubmit} style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <button type="button" onClick={() => setParticipationMode(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', textDecoration: 'underline' }}>← 선택으로 돌아가기</button>
                  </div>
                  <div style={{ marginBottom: '1rem', color: '#ccc', lineHeight: '1.5' }}>
                    입찰을 포기하는 대신 <strong style={{color: '#d4af37'}}>최종 낙찰가 금액</strong>을 예측하세요.<br/>
                    실제 낙찰가와 가장 가까운 금액을 맞춘 모둠에게는 <strong>보너스 100 코인</strong>이 지급됩니다!
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                    <label>예상 낙찰가 (코인)</label>
                  </div>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={guessAmount}
                    onChange={(e) => setGuessAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="50"
                    autoFocus
                    style={{ fontSize: '1.5rem', textAlign: 'right', padding: '1rem', marginBottom: '1rem' }}
                  />
                  {errorMsg && (
                    <div style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold' }}>
                      <AlertCircle size={16} /> {errorMsg}
                    </div>
                  )}
                  <button 
                    type="submit" 
                    className="btn-primary w-full"
                    style={{ padding: '1.2rem', fontSize: '1.3rem', letterSpacing: '2px', backgroundColor: '#60a5fa', borderColor: '#3b82f6' }}
                  >
                    예측 금액 제출
                  </button>
                </form>
              )}
            </div>
          )}

          {(gameState.auctionPhase === 'BIDDING' || gameState.auctionPhase === 'REBIDDING') && bidSubmitted && (
            <div className="panel" style={{ maxWidth: '500px', margin: '0 auto', border: '2px dashed #d4af37', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
              <h3 className="gold-text" style={{ fontSize: '1.5rem' }}>{participationMode === 'GUESSING' ? '예측 금액이 제출되었습니다!' : '입찰서가 제출되었습니다!'}</h3>
              <p style={{ color: '#ccc', margin: '1rem 0', fontSize: '1.1rem' }}>재판장이 모든 입찰을 확인하고 마감할 때까지 대기해 주십시오.</p>
              <div style={{ fontSize: '1.8rem', marginTop: '1.5rem' }}>
                {participationMode === 'GUESSING' ? '제출한 예측 금액' : '최종 제출 금액'}: <strong className="gold-text">{participationMode === 'GUESSING' ? guessAmount : bidAmount}</strong>
              </div>
            </div>
          )}

          {(gameState.auctionPhase === 'REVEALING' || gameState.auctionPhase === 'TIE_BREAKER' || gameState.auctionPhase === 'NO_BIDS') && (
             <div style={{ padding: '2rem' }}>
               {gameState.auctionPhase === 'NO_BIDS' ? (
                 <div className="stamp-anim">
                   <h3 className="gold-text" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>🚫 유찰</h3>
                   <p style={{ fontSize: '1.2rem', color: '#ccc' }}>유효한 입찰이 없어 유찰되었습니다. 재판장이 다음 경매로 진행합니다.</p>
                 </div>
               ) : gameState.auctionPhase === 'TIE_BREAKER' ? (
                 <div className="stamp-anim">
                   <h3 className="gold-text" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ef4444' }}>⚔️ 동점 발생!</h3>
                   <p style={{ fontSize: '1.2rem', color: '#ccc' }}>최고 입찰가가 같습니다. 재판장 앞에서 가위바위보 대결을 준비하십시오.</p>
                 </div>
               ) : (
                 <div className="stamp-anim">
                   <Gavel size={80} className="gold-text mx-auto" style={{ marginBottom: '2rem' }} />
                   <h3 className="gold-text" style={{ fontSize: '2rem', marginBottom: '1rem' }}>입찰 결과 공개 중...</h3>
                   <p style={{ fontSize: '1.2rem', color: '#ccc' }}>재판장의 화면을 주목해 주십시오.</p>
                 </div>
               )}
             </div>
          )}
        </div>
      ) : (
        <div style={{ opacity: gameState.auctionPhase === 'SOLD' ? 1 : 0.9 }}>
          {gameState.auctionPhase === 'SOLD' && currentItem && (
            <div className="panel stamp-anim" style={{ textAlign: 'center', marginBottom: '2rem', backgroundColor: 'rgba(212, 175, 55, 0.15)', borderSize: '3px' }}>
              <h2 className="gold-text" style={{ margin: 0, fontSize: '1.8rem' }}>
                최종 낙찰: {gameState.teams.find(t => t.id === currentItem.winner)?.name || '유찰 (입찰자 없음)'} <br/>
                {currentItem.winner && (
                  <span style={{ fontSize: '1.3rem', color: '#f4ecd8', fontWeight: 'normal', marginTop: '0.5rem', display: 'inline-block' }}>
                    ({currentItem.winningBid} 코인)
                  </span>
                )}
              </h2>
              
              {gameState.lastGuessWinners && gameState.lastGuessWinners.teams.includes(team.id) && (
                 <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(52, 211, 153, 0.2)', border: '2px solid #34d399', borderRadius: '8px', animation: 'pulse 2s infinite' }}>
                    <h3 style={{ margin: 0, color: '#34d399', fontSize: '1.4rem' }}>🎉 낙찰가 예측 적중! 🎉</h3>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#f4ecd8', fontSize: '1.1rem' }}>
                       가장 근접한 금액 예측하여 <strong>보너스 100 코인</strong>을 획득했습니다! (팀 예산에 자동 합산됨)
                    </p>
                 </div>
              )}
            </div>
          )}
          <AuctionBoard 
            gameState={gameState} 
            selectedItemId={null} 
            onSelectItem={() => {}} 
            isTeacher={false} 
          />
        </div>
      )}
    </div>
  );
}
