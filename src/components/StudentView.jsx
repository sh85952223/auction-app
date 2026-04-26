import { useReducer, useEffect } from 'react';
import { Gavel, AlertCircle, Check, LogOut, Clock } from 'lucide-react';
import AuctionBoard from './AuctionBoard';

const INIT = { bidAmount: '', bidSubmitted: false, errorMsg: '', useSecretTicket: false, mode: 'BID', guessAmount: '' };

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':      return INIT;
    case 'BID_AMT':    return { ...state, bidAmount: action.v, errorMsg: '' };
    case 'GUESS_AMT':  return { ...state, guessAmount: action.v, errorMsg: '' };
    case 'SET_MODE':   return { ...state, mode: action.v, errorMsg: '' };
    case 'SET_SECRET': return { ...state, useSecretTicket: action.v };
    case 'SET_ERROR':  return { ...state, errorMsg: action.v };
    case 'SUBMITTED':  return { ...state, bidSubmitted: true, errorMsg: '' };
    default:           return state;
  }
}

export default function StudentView({ gameState, socket, teamId, bidLimits, initialBids, connectedTeams, onLogout }) {
  const [form, dispatch] = useReducer(reducer, INIT);
  const { bidAmount, bidSubmitted, errorMsg, useSecretTicket, mode, guessAmount } = form;

  const team = gameState.teams.find(t => t.id === teamId);
  const bidUnit = gameState.gameConfig?.bidUnit || 50;
  const currentItem = gameState.currentAuctionItemId
    ? gameState.items.find(i => i.id === gameState.currentAuctionItemId)
    : null;

  useEffect(() => {
    if (gameState.auctionPhase === 'BIDDING' || gameState.auctionPhase === 'REBIDDING') {
      dispatch({ type: 'RESET' });
    }
  }, [gameState.auctionPhase]);

  const clamp = (val, max) => Math.max(0, Math.min(max, val));

  const adjustBid = (d) => {
    const cur = parseInt(bidAmount, 10) || 0;
    dispatch({ type: 'BID_AMT', v: String(Math.round(clamp(cur + d, bidLimits.maxBid) / bidUnit) * bidUnit) });
  };

  const adjustGuess = (d) => {
    const cur = parseInt(guessAmount, 10) || 0;
    dispatch({ type: 'GUESS_AMT', v: String(Math.round(Math.max(0, cur + d) / bidUnit) * bidUnit) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount < bidUnit) { dispatch({ type: 'SET_ERROR', v: `최소 ${bidUnit} 코인 이상 입력하세요.` }); return; }
    if (amount % bidUnit !== 0) { dispatch({ type: 'SET_ERROR', v: `${bidUnit} 코인 단위로 입력해야 합니다.` }); return; }
    const maxBid = (gameState.auctionPhase === 'BIDDING' && useSecretTicket && team.hasSecretTicket)
      ? bidLimits.maxBid - 100 : bidLimits.maxBid;
    if (amount > maxBid) { dispatch({ type: 'SET_ERROR', v: `최대 ${maxBid} 코인까지 입찰 가능합니다.` }); return; }
    socket.emit('submitBid', { amount, useSecretTicket: useSecretTicket && team.hasSecretTicket });
    dispatch({ type: 'SUBMITTED' });
  };

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    const amount = parseInt(guessAmount, 10);
    if (isNaN(amount) || amount < 0) { dispatch({ type: 'SET_ERROR', v: '올바른 금액을 입력하세요.' }); return; }
    if (amount % bidUnit !== 0) { dispatch({ type: 'SET_ERROR', v: `${bidUnit} 코인 단위로 입력해야 합니다.` }); return; }
    socket.emit('submitGuess', { amount });
    dispatch({ type: 'SUBMITTED' });
  };

  const isBidding = gameState.auctionPhase === 'BIDDING' || gameState.auctionPhase === 'REBIDDING';

  /* ── small helpers ── */
  const QuickBtn = ({ label, onClick, color = 'var(--violet)' }) => (
    <button type="button" onClick={onClick}
      style={{ flex: 1, padding: '0.4rem 0', background: `rgba(${color === 'var(--violet)' ? '124,106,255' : '56,189,248'},0.1)`, border: `1px solid ${color === 'var(--violet)' ? 'rgba(124,106,255,0.3)' : 'rgba(56,189,248,0.3)'}`, borderRadius: 'var(--radius-sm)', color, cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background = `rgba(${color === 'var(--violet)' ? '124,106,255' : '56,189,248'},0.22)`}
      onMouseLeave={e => e.currentTarget.style.background = `rgba(${color === 'var(--violet)' ? '124,106,255' : '56,189,248'},0.1)`}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: isBidding && !bidSubmitted ? '340px' : '2rem' }}>

      {/* ── Top header bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(13,15,26,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-default)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>{team?.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '0.1rem' }}>
            {team?.studentInfo ? `${team.studentInfo.grade}학년 ${team.studentInfo.classNum}반 · ${team.studentInfo.members}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginBottom: '0.1rem' }}>보유 코인</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 800, fontSize: '1.5rem', color: 'var(--amber)', lineHeight: 1 }}>{team?.budget}</div>
          </div>
          <button onClick={onLogout}
            style={{ padding: '0.4rem', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.color = 'var(--rose)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '0 1rem' }}>

        {currentItem && (isBidding || ['REVEALING','TIE_BREAKER','NO_BIDS'].includes(gameState.auctionPhase)) ? (
          <>
            {/* Current item display */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '1.75rem 1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', background: 'var(--violet-dim)', border: '1px solid rgba(124,106,255,0.35)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, color: '#a99aff', marginBottom: '1rem' }}>
                {currentItem.categoryName}
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 0.25rem', lineHeight: 1.3 }}>
                "{currentItem.name}"
              </h2>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-2)' }}>현재 경매 진행 중</div>
            </div>

            {/* Rebid banners */}
            {gameState.auctionPhase === 'REBIDDING' && gameState.secretTicketApprovedTeams?.includes(team.id) && (
              <div style={{ background: 'var(--sky-dim)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--sky)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>🔓 비밀 첩보 — 1차 입찰 결과</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                  {gameState.teams.map(t => initialBids?.[t.id] !== undefined ? (
                    <div key={t.id} style={{ padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--sky)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{t.name}</div>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>{initialBids[t.id]}</div>
                    </div>
                  ) : null)}
                </div>
                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--sky)', fontWeight: 600 }}>💡 전략을 수정해 2차 입찰을 제출하세요.</p>
              </div>
            )}

            {gameState.auctionPhase === 'REBIDDING' && !gameState.secretTicketApprovedTeams?.includes(team.id) && (
              <div className="anim-stamp" style={{ background: 'var(--rose-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rose)', marginBottom: '0.5rem' }}>🚨 전원 재입찰 발생!</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  다른 모둠이 시크릿 해제권을 사용했습니다.<br />새로운 최종 금액을 제출하세요.
                </p>
              </div>
            )}

            {/* Bidding UI (fixed bottom) */}
            {isBidding && !bidSubmitted && (
              <div className="sticky-bottom-bar" style={{ maxWidth: '720px', margin: '0 auto' }}>
                {/* Mode tab */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: '3px', marginBottom: '1rem', border: '1px solid var(--border-subtle)' }}>
                  {[
                    { key: 'BID', label: '💰 경매 참여', color: 'var(--violet)' },
                    { key: 'GUESS', label: '🤔 포기 + 예측', color: 'var(--sky)' },
                  ].map(tab => (
                    <button key={tab.key} type="button"
                      onClick={() => dispatch({ type: 'SET_MODE', v: tab.key })}
                      style={{ flex: 1, padding: '0.55rem', borderRadius: 'calc(var(--radius-md) - 3px)', border: 'none', background: mode === tab.key ? (tab.key === 'BID' ? 'var(--violet)' : 'var(--sky)') : 'transparent', color: mode === tab.key ? (tab.key === 'BID' ? '#fff' : '#071520') : 'var(--text-2)', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.15s' }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* BID mode */}
                {mode === 'BID' && (
                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>
                      <span>입찰 금액 (코인)</span>
                      <span style={{ color: 'var(--amber)' }}>최대 {bidLimits.maxBid}</span>
                    </div>
                    <input type="range" min="0" max={bidLimits.maxBid || 1} step={bidUnit}
                      value={parseInt(bidAmount,10)||0}
                      onChange={e => dispatch({ type: 'BID_AMT', v: e.target.value })}
                      disabled={bidLimits.maxBid === 0}
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                    />
                    <input type="number" className="input-field"
                      value={bidAmount} onChange={e => dispatch({ type: 'BID_AMT', v: e.target.value })}
                      placeholder="0" min="0" max={bidLimits.maxBid} step={bidUnit} autoFocus
                      style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '1.6rem', fontWeight: 700, textAlign: 'right', marginBottom: '0.5rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      {[1,2,4,10].map(m => <QuickBtn key={m} label={`+${bidUnit*m}`} onClick={() => adjustBid(bidUnit*m)} />)}
                      <QuickBtn label="MAX" onClick={() => dispatch({ type: 'BID_AMT', v: String(bidLimits.maxBid) })} />
                    </div>

                    {team.hasSecretTicket && gameState.auctionPhase === 'BIDDING' && (
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem', background: 'var(--sky-dim)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: '0.75rem' }}>
                        <input type="checkbox" checked={useSecretTicket} onChange={e => dispatch({ type: 'SET_SECRET', v: e.target.checked })} style={{ width: 18, height: 18, flexShrink: 0, marginTop: '0.1rem', accentColor: 'var(--sky)' }} />
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--sky)' }}>시크릿 해제권 사용 (-100 코인)</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '0.2rem', lineHeight: 1.5 }}>1차 입찰가 전체 공개 후 재입찰 기회를 얻습니다.</div>
                        </div>
                      </label>
                    )}

                    {bidLimits.maxBid === 0 && (
                      <div style={{ padding: '0.65rem 0.9rem', background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--amber)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                        이미 낙찰받았거나 예산 부족으로 참여할 수 없습니다.
                      </div>
                    )}
                    {errorMsg && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--rose)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        <AlertCircle size={15} /> {errorMsg}
                      </div>
                    )}
                    <button type="submit" disabled={bidLimits.maxBid === 0}
                      style={{ width: '100%', padding: '0.9rem', background: bidLimits.maxBid === 0 ? 'rgba(255,255,255,0.04)' : 'var(--violet)', border: `1px solid ${bidLimits.maxBid === 0 ? 'var(--border-subtle)' : 'var(--violet)'}`, borderRadius: 'var(--radius-lg)', color: bidLimits.maxBid === 0 ? 'var(--text-3)' : '#fff', cursor: bidLimits.maxBid === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.05em', transition: 'all 0.15s', boxShadow: bidLimits.maxBid !== 0 ? '0 2px 12px rgba(124,106,255,0.4)' : 'none' }}>
                      밀봉 입찰서 제출
                    </button>
                  </form>
                )}

                {/* GUESS mode */}
                {mode === 'GUESS' && (
                  <form onSubmit={handleGuessSubmit}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                      입찰을 포기하고 <strong style={{ color: 'var(--amber)' }}>최종 낙찰가</strong>를 예측하면,<br />
                      가장 근접한 모둠에게 <strong style={{ color: 'var(--emerald)' }}>보너스 100 코인</strong>이 지급됩니다.
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.4rem' }}>예상 낙찰가 (코인)</div>
                    <input type="number" className="input-field"
                      value={guessAmount} onChange={e => dispatch({ type: 'GUESS_AMT', v: e.target.value })}
                      placeholder="0" min="0" step={bidUnit} autoFocus
                      style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '1.6rem', fontWeight: 700, textAlign: 'right', marginBottom: '0.5rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      {[1,2,4,10].map(m => <QuickBtn key={m} label={`+${bidUnit*m}`} onClick={() => adjustGuess(bidUnit*m)} color="var(--sky)" />)}
                    </div>
                    {errorMsg && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--rose)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        <AlertCircle size={15} /> {errorMsg}
                      </div>
                    )}
                    <button type="submit"
                      style={{ width: '100%', padding: '0.9rem', background: 'var(--sky)', border: '1px solid var(--sky)', borderRadius: 'var(--radius-lg)', color: '#071520', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.05em', transition: 'all 0.15s' }}>
                      예측 금액 제출
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Submitted wait state */}
            {isBidding && bidSubmitted && (
              <div style={{ textAlign: 'center', padding: '2rem 1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--emerald-dim)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Check size={24} color="var(--emerald)" />
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-1)', marginBottom: '0.4rem' }}>
                  {mode === 'GUESS' ? '예측 금액이 제출되었습니다!' : '입찰서가 제출되었습니다!'}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '1.8rem', fontWeight: 800, color: 'var(--amber)', margin: '0.75rem 0' }}>
                  {mode === 'GUESS' ? guessAmount : bidAmount}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  <Clock size={13} /> 재판장이 마감할 때까지 대기해 주세요.
                </div>
              </div>
            )}

            {/* Result states */}
            {['REVEALING','TIE_BREAKER','NO_BIDS'].includes(gameState.auctionPhase) && (
              <div className="anim-stamp" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                {gameState.auctionPhase === 'NO_BIDS' && (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚫</div>
                    <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--rose)', marginBottom: '0.5rem' }}>유찰</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>유효한 입찰이 없어 유찰되었습니다.</div>
                  </>
                )}
                {gameState.auctionPhase === 'TIE_BREAKER' && (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚔️</div>
                    <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--rose)', marginBottom: '0.5rem' }}>동점 발생!</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>재판장 앞에서 가위바위보 대결을 준비하세요.</div>
                  </>
                )}
                {gameState.auctionPhase === 'REVEALING' && (
                  <>
                    <Gavel size={52} color="var(--amber)" style={{ marginBottom: '1rem' }} />
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--amber)', marginBottom: '0.4rem' }}>결과 공개 중</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>재판장 화면을 주목해 주세요.</div>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* WAITING state */}
            {gameState.auctionPhase === 'WAITING' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '1.75rem 1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Clock size={26} color="var(--text-2)" />
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-1)', marginBottom: '0.4rem' }}>경매 준비 중</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1.25rem' }}>재판장이 경매 항목을 선택하면 시작됩니다.</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                  {gameState.teams.map(t => {
                    const online = connectedTeams?.includes(t.id);
                    const isMe = t.id === teamId;
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', border: `1px solid ${isMe ? 'rgba(245,158,11,0.4)' : online ? 'rgba(52,211,153,0.25)' : 'var(--border-subtle)'}`, background: isMe ? 'var(--amber-dim)' : online ? 'var(--emerald-dim)' : 'transparent', fontSize: '0.8rem', fontWeight: isMe ? 700 : 400, color: isMe ? 'var(--amber)' : online ? 'var(--emerald)' : 'var(--text-3)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? 'var(--emerald)' : 'var(--text-3)', flexShrink: 0 }} />
                        {t.name}{isMe ? ' (나)' : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SOLD state */}
            {gameState.auctionPhase === 'SOLD' && currentItem && (
              <div className="anim-stamp" style={{ background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-xl)', padding: '1.75rem 1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
                <Gavel size={40} color="var(--amber)" style={{ marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--amber)', marginBottom: '0.25rem' }}>낙찰 완료</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-1)' }}>
                  {gameState.teams.find(t => t.id === currentItem.winner)?.name || '(낙찰자 없음)'}
                </div>
                {currentItem.winner && (
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-2)', marginTop: '0.25rem' }}>{currentItem.winningBid} 코인</div>
                )}
                {gameState.lastGuessWinners?.teams.includes(team.id) && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--emerald-dim)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--emerald)', marginBottom: '0.25rem' }}>🎉 낙찰가 예측 적중!</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>보너스 <strong style={{ color: 'var(--emerald)' }}>100 코인</strong> 획득!</div>
                  </div>
                )}
              </div>
            )}

            <AuctionBoard gameState={gameState} selectedItemId={null} onSelectItem={() => {}} isTeacher={false} />
          </>
        )}
      </div>
    </div>
  );
}
