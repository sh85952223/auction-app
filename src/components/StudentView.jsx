import { useState, useEffect } from 'react';
import { Gavel, AlertCircle } from 'lucide-react';
import AuctionBoard from './AuctionBoard';

export default function StudentView({ gameState, socket, teamId, bidLimits, initialBids, onLogout }) {
  const [bidAmount, setBidAmount] = useState('');
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [useSecretTicket, setUseSecretTicket] = useState(false);
  // 'BID' | 'GUESS' — default is BID (no intersticial)
  const [mode, setMode] = useState('BID');
  const [guessAmount, setGuessAmount] = useState('');

  const team = gameState.teams.find(t => t.id === teamId);
  const currentItem = gameState.currentAuctionItemId
    ? gameState.items.find(i => i.id === gameState.currentAuctionItemId)
    : null;

  useEffect(() => {
    if (gameState.auctionPhase === 'BIDDING') {
      setBidAmount('');
      setBidSubmitted(false);
      setErrorMsg('');
      setUseSecretTicket(false);
      setMode('BID');
      setGuessAmount('');
    } else if (gameState.auctionPhase === 'REBIDDING') {
      setBidAmount('');
      setBidSubmitted(false);
      setErrorMsg('');
      setUseSecretTicket(false);
      setGuessAmount('');
      setMode('BID');
    }
  }, [gameState.auctionPhase]);

  // Quick-add buttons: +50 / +100 / +200 / +500
  const adjustBid = (delta) => {
    const current = parseInt(bidAmount, 10) || 0;
    const next = Math.max(0, Math.min(bidLimits.maxBid, current + delta));
    const snapped = Math.round(next / 50) * 50;
    setBidAmount(String(snapped));
  };

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
      setErrorMsg(`최대 입찰 가능 금액은 ${actualMaxBid} 코인입니다.`);
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

  const isBiddingPhase = gameState.auctionPhase === 'BIDDING' || gameState.auctionPhase === 'REBIDDING';

  return (
    <div className="flex flex-col gap-6" style={{ paddingBottom: isBiddingPhase && !bidSubmitted ? '300px' : '2rem' }}>
      {/* Header */}
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

      {currentItem && (isBiddingPhase || gameState.auctionPhase === 'REVEALING' || gameState.auctionPhase === 'TIE_BREAKER' || gameState.auctionPhase === 'NO_BIDS') ? (
        <div className="panel bidding-area" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div className="badge" style={{ fontSize: '1rem', padding: '0.4rem 1rem' }}>{currentItem.categoryName}</div>
          <h2 className="gold-text" style={{ fontSize: '2.2rem', margin: '1rem 0 1.5rem 0' }}>
            "{currentItem.name}"
          </h2>

          {/* Rebid info banners */}
          {gameState.auctionPhase === 'REBIDDING' && gameState.secretTicketApprovedTeams?.includes(team.id) && (
            <div className="panel" style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', borderColor: '#60a5fa', marginBottom: '1.5rem', padding: '1.5rem', textAlign: 'left' }}>
              <h4 style={{ color: '#60a5fa', fontSize: '1.3rem', marginTop: 0, borderBottom: '1px solid #60a5fa', paddingBottom: '0.5rem' }}>비밀 첩보: 1차 입찰 결과</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem', marginTop: '1.5rem' }}>
                {gameState.teams.map(t => {
                  if (initialBids && initialBids[t.id] !== undefined) {
                    return (
                      <div key={t.id} style={{ padding: '0.8rem', backgroundColor: 'rgba(0,0,0,0.4)', borderLeft: '3px solid #60a5fa', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#ccc' }}>{t.name}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f4ecd8' }}>{initialBids[t.id]} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>코인</span></div>
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
                다른 누군가가 <strong>시크릿 해제권</strong>을 사용하여 모든 모둠의 1차 입찰가를 파악했습니다!<br /><br />
                모든 입찰이 무효화되었으니, 방어 전략을 세워 <strong>새로운 최종 금액</strong>을 다시 제출해주십시오.
              </p>
            </div>
          )}

          {/* ── 입찰 입력 (sticky bottom) ── */}
          {isBiddingPhase && !bidSubmitted && (
            <div className="panel sticky-bottom-bar" style={{ maxWidth: '768px', margin: '0 auto' }}>

              {/* Mode tab switcher */}
              <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #d4af37', marginBottom: '1.2rem' }}>
                <button
                  type="button"
                  onClick={() => { setMode('BID'); setErrorMsg(''); }}
                  style={{ flex: 1, padding: '0.7rem', background: mode === 'BID' ? '#d4af37' : 'transparent', color: mode === 'BID' ? '#1a1a1a' : '#d4af37', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.15s' }}
                >
                  💰 경매 참여
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('GUESS'); setErrorMsg(''); }}
                  style={{ flex: 1, padding: '0.7rem', background: mode === 'GUESS' ? '#60a5fa' : 'transparent', color: mode === 'GUESS' ? '#1a1a1a' : '#60a5fa', border: 'none', borderLeft: '1px solid #d4af37', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.15s' }}
                >
                  🤔 입찰 포기 + 예측
                </button>
              </div>

              {/* BID mode */}
              {mode === 'BID' && (
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '1rem', color: '#ccc' }}>
                    <span>입찰 금액 (코인)</span>
                    <span style={{ color: '#d4af37' }}>최대: {bidLimits.maxBid}</span>
                  </div>

                  {/* Amount input + quick-add buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.7rem', alignItems: 'center' }}>
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
                      style={{ fontSize: '1.6rem', textAlign: 'right', padding: '0.8rem', flex: 1 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                    {[50, 100, 200, 500].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => adjustBid(d)}
                        style={{ flex: 1, background: 'rgba(212,175,55,0.12)', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '4px', padding: '0.4rem 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}
                      >
                        +{d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBidAmount(String(bidLimits.maxBid))}
                      style={{ flex: 1, background: 'rgba(212,175,55,0.12)', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '4px', padding: '0.4rem 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}
                    >
                      MAX
                    </button>
                  </div>

                  {team.hasSecretTicket && gameState.auctionPhase === 'BIDDING' && (
                    <div style={{ padding: '0.8rem 1rem', backgroundColor: 'rgba(96,165,250,0.1)', border: '1px solid #60a5fa', borderRadius: '4px', marginBottom: '0.8rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={useSecretTicket}
                          onChange={(e) => setUseSecretTicket(e.target.checked)}
                          style={{ width: '20px', height: '20px' }}
                        />
                        <span style={{ fontSize: '1.05rem', color: '#60a5fa', fontWeight: 'bold' }}>시크릿 해제권 사용 (-100 코인)</span>
                      </label>
                      <p style={{ margin: '0.4rem 0 0 2.2rem', fontSize: '0.85rem', color: '#ccc', lineHeight: '1.4' }}>
                        100코인을 소모해 전체 1차 입찰가를 확인하고 재입찰 기회를 얻습니다. (1회 한정)
                      </p>
                    </div>
                  )}

                  {bidLimits.maxBid === 0 && (
                    <div style={{ color: '#d4af37', marginBottom: '0.8rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                      이 범주를 이미 낙찰받았거나 최소 안전 예산 부족으로 이번 경매에 참여할 수 없습니다.
                    </div>
                  )}
                  {errorMsg && (
                    <div style={{ color: '#ef4444', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold' }}>
                      <AlertCircle size={16} /> {errorMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={bidLimits.maxBid === 0}
                    style={{ padding: '1.1rem', fontSize: '1.2rem', letterSpacing: '2px' }}
                  >
                    밀봉 입찰서 제출
                  </button>
                </form>
              )}

              {/* GUESS mode */}
              {mode === 'GUESS' && (
                <form onSubmit={handleGuessSubmit}>
                  <div style={{ marginBottom: '0.8rem', color: '#ccc', lineHeight: '1.5', fontSize: '0.95rem' }}>
                    입찰을 포기하는 대신 <strong style={{ color: '#d4af37' }}>최종 낙찰가</strong>를 예측하세요.<br />
                    가장 가까운 금액을 맞춘 모둠에게 <strong>보너스 100 코인</strong>이 지급됩니다!
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '1rem', color: '#ccc' }}>
                    <span>예상 낙찰가 (코인)</span>
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
                    style={{ fontSize: '1.6rem', textAlign: 'right', padding: '0.8rem', marginBottom: '0.7rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                    {[50, 100, 200, 500].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const c = parseInt(guessAmount, 10) || 0;
                          setGuessAmount(String(Math.round(Math.max(0, c + d) / 50) * 50));
                        }}
                        style={{ flex: 1, background: 'rgba(96,165,250,0.12)', border: '1px solid #60a5fa', color: '#60a5fa', borderRadius: '4px', padding: '0.4rem 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}
                      >
                        +{d}
                      </button>
                    ))}
                  </div>
                  {errorMsg && (
                    <div style={{ color: '#ef4444', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold' }}>
                      <AlertCircle size={16} /> {errorMsg}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    style={{ padding: '1.1rem', fontSize: '1.2rem', letterSpacing: '2px', backgroundColor: '#1e3a5f', borderColor: '#60a5fa', color: '#f4ecd8' }}
                  >
                    예측 금액 제출
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 제출 완료 대기 */}
          {isBiddingPhase && bidSubmitted && (
            <div className="panel" style={{ maxWidth: '500px', margin: '0 auto', border: '2px dashed #d4af37', backgroundColor: 'rgba(212,175,55,0.05)' }}>
              <h3 className="gold-text" style={{ fontSize: '1.5rem' }}>
                {mode === 'GUESS' ? '예측 금액이 제출되었습니다!' : '입찰서가 제출되었습니다!'}
              </h3>
              <p style={{ color: '#ccc', margin: '1rem 0', fontSize: '1.1rem' }}>재판장이 모든 입찰을 확인하고 마감할 때까지 대기해 주십시오.</p>
              <div style={{ fontSize: '1.8rem', marginTop: '1.5rem' }}>
                {mode === 'GUESS' ? '예측 금액' : '최종 제출 금액'}: <strong className="gold-text">{mode === 'GUESS' ? guessAmount : bidAmount}</strong>
              </div>
            </div>
          )}

          {/* 결과 공개 / 동점 / 유찰 */}
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
            <div className="panel stamp-anim" style={{ textAlign: 'center', marginBottom: '2rem', backgroundColor: 'rgba(212,175,55,0.15)' }}>
              <h2 className="gold-text" style={{ margin: 0, fontSize: '1.8rem' }}>
                최종 낙찰: {gameState.teams.find(t => t.id === currentItem.winner)?.name || '유찰 (입찰자 없음)'}<br />
                {currentItem.winner && (
                  <span style={{ fontSize: '1.3rem', color: '#f4ecd8', fontWeight: 'normal', marginTop: '0.5rem', display: 'inline-block' }}>
                    ({currentItem.winningBid} 코인)
                  </span>
                )}
              </h2>
              {gameState.lastGuessWinners?.teams.includes(team.id) && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(52,211,153,0.2)', border: '2px solid #34d399', borderRadius: '8px', animation: 'pulse 2s infinite' }}>
                  <h3 style={{ margin: 0, color: '#34d399', fontSize: '1.4rem' }}>🎉 낙찰가 예측 적중! 🎉</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#f4ecd8', fontSize: '1.1rem' }}>
                    가장 근접한 금액 예측하여 <strong>보너스 100 코인</strong>을 획득했습니다!
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
