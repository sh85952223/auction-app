import { useState, useRef, useEffect } from 'react';
import AuctionBoard from './AuctionBoard';
import {
  Gavel, Play, Eye, Check, FileText, X, Settings, UserPlus,
  Trash2, RefreshCw, BookOpen, PlusCircle, MoreVertical, Download, Copy, LogOut
} from 'lucide-react';
import * as XLSX from 'xlsx';

const CAT_COLORS = ['#a78bfa','#38bdf8','#34d399','#fb923c','#f472b6','#facc15'];
function getCatColor(i) { return CAT_COLORS[i % CAT_COLORS.length]; }

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '255,255,255';
}

const PHASE_LABELS = {
  WAITING:    { text: '대기 중', color: 'var(--text-2)',  bg: 'rgba(255,255,255,0.06)' },
  BIDDING:    { text: '입찰 진행',color: 'var(--violet)', bg: 'var(--violet-dim)' },
  REBIDDING:  { text: '재입찰',  color: 'var(--sky)',    bg: 'var(--sky-dim)' },
  REVEALING:  { text: '결과 공개',color: 'var(--amber)', bg: 'var(--amber-dim)' },
  TIE_BREAKER:{ text: '동점 결정',color: 'var(--rose)',  bg: 'var(--rose-dim)' },
  NO_BIDS:    { text: '유찰',    color: 'var(--text-2)', bg: 'rgba(255,255,255,0.06)' },
  SOLD:       { text: '낙찰 완료',color: 'var(--emerald)',bg: 'var(--emerald-dim)' },
};

export default function TeacherView({ gameState, socket, teamBidStatus, connectedTeams, initialBids, sessionCode, onLogout }) {
  const [selectedItemId, setSelectedItemId]     = useState(null);
  const [showDashboard, setShowDashboard]       = useState(false);
  const [showTeamMgmt, setShowTeamMgmt]         = useState(false);
  const [showCategoryConfig, setShowCategoryConfig] = useState(false);
  const [editingConfig, setEditingConfig]       = useState(null);
  const [isProjectorMode, setIsProjectorMode]   = useState(true);
  const [showMenu, setShowMenu]                 = useState(false);
  const [codeCopied, setCodeCopied]             = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const categoryConfig = gameState.categoryConfig || [];

  const handleCopyCode = () => {
    if (sessionCode) { navigator.clipboard?.writeText(sessionCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }
  };

  const handleExportExcel = () => {
    const rows = gameState.teams.map(team => {
      const row = {
        '모둠명': team.name,
        '학년': team.studentInfo?.grade ?? '',
        '반': team.studentInfo?.classNum ?? '',
        '모둠원': team.studentInfo?.members ?? '',
        '남은 예산(코인)': team.budget,
      };
      let totalSpent = 0;
      categoryConfig.forEach(cat => {
        const item = team.wonItems?.[cat.id] ? gameState.items.find(i => i.id === team.wonItems[cat.id]) : null;
        row[`[${cat.name}] 낙찰 항목`] = item?.name ?? '';
        row[`[${cat.name}] 낙찰 금액`] = item?.winningBid ?? '';
        totalSpent += item?.winningBid || 0;
      });
      row['총 사용 금액(코인)'] = totalSpent;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const name = gameState.classInfo ? `${gameState.classInfo.grade}학년${gameState.classInfo.classNum}반` : '경매결과';
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `${name}_경매결과.xlsx`);
  };

  const openCategoryConfig = () => { setEditingConfig(JSON.parse(JSON.stringify(categoryConfig))); setShowCategoryConfig(true); };

  const handleApplyCategoryConfig = () => {
    if (editingConfig.some(c => !c.name.trim() || c.items.some(i => !i.trim()))) { alert('카테고리 이름과 항목을 모두 입력하세요.'); return; }
    if (!confirm('적용 시 현재 경매가 초기화됩니다. 계속하시겠습니까?')) return;
    const sanitized = editingConfig.map(c => ({ ...c, name: c.name.trim(), items: c.items.map(i => i.trim()).filter(Boolean) })).filter(c => c.items.length > 0);
    socket.emit('updateCategoryConfig', sanitized);
    setShowCategoryConfig(false);
  };

  const phase = gameState.auctionPhase;
  const phaseInfo = PHASE_LABELS[phase] || PHASE_LABELS.WAITING;

  /* ── Styles ── */
  const S = {
    header: {
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(13,15,26,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-default)',
      padding: '0.75rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      flexWrap: 'wrap',
    },
    phaseChip: {
      padding: '0.3rem 0.75rem',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.8rem', fontWeight: 700,
      color: phaseInfo.color,
      background: phaseInfo.bg,
      border: `1px solid ${phaseInfo.color}40`,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    },
    actionBtn: (color = 'var(--violet)') => ({
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.55rem 1rem',
      background: color === 'var(--violet)' ? color : color,
      color: color === 'var(--amber)' ? '#1a1000' : '#fff',
      border: `1px solid ${color}`,
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer', fontFamily: 'Inter,sans-serif',
      fontSize: '0.875rem', fontWeight: 700,
      boxShadow: `0 2px 8px ${color}40`,
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    }),
    menuBtn: {
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      width: '100%', padding: '0.65rem 1rem',
      background: 'transparent', border: 'none',
      color: 'var(--text-1)', cursor: 'pointer',
      fontFamily: 'Inter,sans-serif', fontSize: '0.875rem',
      textAlign: 'left', transition: 'background 0.12s',
      borderRadius: 'var(--radius-sm)',
    },
    teamCard: (connected) => ({
      padding: '0.85rem 1rem',
      background: connected ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${connected ? 'rgba(52,211,153,0.2)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }),
    modal: {
      position: 'fixed', inset: 0,
      background: 'var(--bg-overlay)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999, padding: '1.5rem',
      overflowY: 'auto', display: 'flex',
      alignItems: 'flex-start', justifyContent: 'center',
    },
    modalBox: {
      background: 'var(--bg-card-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-xl)',
      padding: '2rem', width: '100%',
      maxWidth: '1100px', position: 'relative',
      margin: 'auto',
      boxShadow: 'var(--shadow-lg)',
    },
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>

      {/* ── Sticky Header ── */}
      <div style={S.header}>
        {/* Left: title + phase */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gavel size={20} color="var(--amber)" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
              재판장 대시보드
              {gameState.classInfo && <span style={{ color: 'var(--text-2)', fontWeight: 500 }}> · {gameState.classInfo.grade}학년 {gameState.classInfo.classNum}반</span>}
            </span>
          </div>

          {/* Session code */}
          {sessionCode && (
            <button
              onClick={handleCopyCode}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: 'var(--sky-dim)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace', fontSize: '0.95rem', fontWeight: 700, color: 'var(--sky)', letterSpacing: '0.18em', transition: 'all 0.15s' }}
              title="클릭하여 복사"
            >
              {sessionCode}
              {codeCopied ? <Check size={13} color="var(--emerald)" /> : <Copy size={13} />}
            </button>
          )}

          {/* Phase chip */}
          <span style={S.phaseChip}>{phaseInfo.text}</span>

          {/* Projector toggle */}
          <button
            onClick={() => setIsProjectorMode(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.7rem', background: isProjectorMode ? 'var(--amber-dim)' : 'transparent', border: `1px solid ${isProjectorMode ? 'rgba(245,158,11,0.4)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: isProjectorMode ? 'var(--amber)' : 'var(--text-2)', transition: 'all 0.15s', fontFamily: 'Inter,sans-serif' }}
          >
            <Eye size={13} /> {isProjectorMode ? '프로젝터 ON' : '프로젝터 OFF'}
          </button>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {phase === 'WAITING' && (
            <button style={S.actionBtn()} disabled={!selectedItemId} onClick={() => socket.emit('startAuctionFor', selectedItemId)}>
              <Play size={15} /> 경매 시작
            </button>
          )}
          {phase === 'BIDDING' && (
            <>
              {Object.values(gameState.secretTicketRequests || {}).some(Boolean) && (
                <button style={S.actionBtn('var(--sky)')} onClick={() => socket.emit('approveSecretTickets')}>
                  <Eye size={15} /> 해제권 허가
                </button>
              )}
              <button style={S.actionBtn()} onClick={() => socket.emit('revealBids')}>
                <Eye size={15} /> 마감 · 공개
              </button>
            </>
          )}
          {phase === 'REBIDDING' && (
            <button style={S.actionBtn()} onClick={() => socket.emit('revealBids')}>
              <Eye size={15} /> 재입찰 마감
            </button>
          )}
          {phase === 'REVEALING' && (
            <button style={S.actionBtn('var(--amber)')} onClick={() => socket.emit('completeSale')}>
              <Gavel size={15} /> 낙찰 확정
            </button>
          )}
          {phase === 'TIE_BREAKER' && gameState.tiedTeams?.map(tId => {
            const team = gameState.teams.find(t => t.id === tId);
            return (
              <button key={tId} style={S.actionBtn('var(--rose)')} onClick={() => socket.emit('resolveTie', tId)}>
                <Gavel size={15} /> {team?.name} 승리
              </button>
            );
          })}
          {(phase === 'SOLD' || phase === 'NO_BIDS') && (
            <button style={S.actionBtn('var(--emerald)')} onClick={() => { setSelectedItemId(null); socket.emit('nextItem'); }}>
              <Check size={15} /> 다음 경매
            </button>
          )}

          {/* ⋮ Menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ padding: '0.5rem', background: showMenu ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'var(--bg-card-2)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200, minWidth: '190px', padding: '0.4rem', overflow: 'hidden' }}>
                {[
                  { icon: <FileText size={15} />, label: '결과 리포트', action: () => { setShowDashboard(true); setShowMenu(false); } },
                  { icon: <Settings size={15} />, label: '모둠 관리', action: () => { setShowTeamMgmt(true); setShowMenu(false); } },
                  { icon: <BookOpen size={15} />, label: '경매 설정', action: () => { openCategoryConfig(); setShowMenu(false); } },
                ].map(item => (
                  <button key={item.label} style={S.menuBtn} onClick={item.action}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {item.icon} {item.label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.3rem 0' }} />
                {phase === 'WAITING' && (
                  <button style={{ ...S.menuBtn, color: 'var(--rose)' }}
                    onClick={() => { if (confirm('전체 경매를 초기화하시겠습니까?')) { socket.emit('resetGame'); setShowMenu(false); } }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--rose-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <RefreshCw size={15} /> 전체 초기화
                  </button>
                )}
                <button style={{ ...S.menuBtn, color: 'var(--text-2)' }}
                  onClick={() => { setShowMenu(false); onLogout(); }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <LogOut size={15} /> 로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Left: Team sidebar ── */}
        <div style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'sticky', top: '72px', flex: '0 0 280px' }}>

          {/* Guess winner banner */}
          {gameState.lastGuessWinners?.teams?.length > 0 && (
            <div style={{ padding: '0.85rem', background: 'var(--emerald-dim)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--emerald)', marginBottom: '0.4rem' }}>🎯 낙찰가 예측 보너스</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>오차 {gameState.lastGuessWinners.minDiff}코인</div>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {gameState.lastGuessWinners.teams.map(tId => {
                  const t = gameState.teams.find(t => t.id === tId);
                  return <span key={tId} style={{ padding: '0.15rem 0.5rem', background: 'rgba(52,211,153,0.2)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: 'var(--emerald)' }}>{t?.name}</span>;
                })}
              </div>
            </div>
          )}

          {/* Teams header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.2rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>모둠 현황</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{gameState.teams.length}팀</span>
          </div>

          {/* Team cards */}
          {gameState.teams.map(team => {
            const connected = connectedTeams?.includes(team.id);
            const hasBid = teamBidStatus?.[team.id];
            const wonList = categoryConfig.map((cat, ci) => {
              const itemId = team.wonItems?.[cat.id];
              return { cat, ci, item: itemId ? gameState.items.find(i => i.id === itemId) : null };
            }).filter(e => e.item);

            return (
              <div key={team.id} style={S.teamCard(connected)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--emerald)' : 'var(--text-3)', flexShrink: 0, boxShadow: connected ? '0 0 6px var(--emerald)' : 'none' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.85rem', fontWeight: 700, color: 'var(--amber)', flexShrink: 0 }}>{team.budget}</span>
                </div>

                {team.studentInfo && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{team.studentInfo.grade}학년 {team.studentInfo.classNum}반 · {team.studentInfo.members}</div>
                )}

                {/* Bid status */}
                {(phase === 'BIDDING' || phase === 'REBIDDING') && hasBid && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', background: hasBid.isGuess ? 'var(--sky-dim)' : 'var(--emerald-dim)', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 700, color: hasBid.isGuess ? 'var(--sky)' : 'var(--emerald)', alignSelf: 'flex-start' }}>
                    <Check size={10} /> {hasBid.isGuess ? '예측 완료' : '제출 완료'}
                  </div>
                )}

                {/* Rebid 1차 금액 */}
                {phase === 'REBIDDING' && initialBids?.[team.id] !== undefined && (
                  <div style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono,monospace' }}>
                    {isProjectorMode
                      ? <span className="mask-hover" style={{ background: 'rgba(255,255,255,0.05)', padding: '0 0.4rem', borderRadius: 4, cursor: 'help' }}>{initialBids[team.id]}</span>
                      : <span style={{ color: 'var(--sky)' }}>{initialBids[team.id]} (1차)</span>}
                  </div>
                )}

                {/* Revealing bids */}
                {phase === 'REVEALING' && gameState.bids[team.id] !== undefined && (
                  <div className="anim-stamp" style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 800, fontSize: '1.1rem', color: 'var(--amber)' }}>
                    {gameState.bids[team.id]}
                  </div>
                )}

                {/* Won items */}
                {wonList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingTop: '0.3rem', borderTop: '1px solid var(--border-subtle)' }}>
                    {wonList.map(({ cat, ci, item }) => (
                      <div key={cat.id} style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', gap: '0.25rem' }}>
                        <span style={{ color: getCatColor(ci), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        <span style={{ color: 'var(--text-3)', flexShrink: 0, fontFamily: 'JetBrains Mono,monospace' }}>{item.winningBid}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right: Auction board ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AuctionBoard
            gameState={gameState}
            selectedItemId={gameState.currentAuctionItemId || selectedItemId}
            onSelectItem={setSelectedItemId}
            isTeacher={true}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* Result Report Modal */}
      {showDashboard && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <button onClick={() => setShowDashboard(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-2)', cursor: 'pointer', padding: '0.35rem', display: 'flex' }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '0.3rem', letterSpacing: '-0.03em' }}>
              {gameState.classInfo ? `${gameState.classInfo.grade}학년 ${gameState.classInfo.classNum}반 ` : ''}경매 결과 리포트
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1.5rem' }}>최종 낙찰 및 예산 현황</p>

            <button
              onClick={handleExportExcel}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 'var(--radius-md)', color: '#4ade80', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.5rem', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.15)'}
            >
              <Download size={16} /> 엑셀로 내보내기
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {gameState.teams.map(team => {
                const wonEntries = categoryConfig.map((cat, ci) => {
                  const itemId = team.wonItems?.[cat.id];
                  return { cat, ci, item: itemId ? gameState.items.find(i => i.id === itemId) : null };
                });
                const totalSpent = wonEntries.reduce((s, e) => s + (e.item?.winningBid || 0), 0);

                return (
                  <div key={team.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-1)' }}>{team.name}</div>
                        {team.studentInfo && <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '0.15rem' }}>{team.studentInfo.grade}학년 {team.studentInfo.classNum}반 · {team.studentInfo.members}</div>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0.6rem', background: 'var(--amber-dim)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginBottom: '0.2rem' }}>남은 예산</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'JetBrains Mono,monospace' }}>{team.budget}</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', marginBottom: '0.2rem' }}>사용 금액</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-1)', fontFamily: 'JetBrains Mono,monospace' }}>{totalSpent}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {wonEntries.map(({ cat, ci, item }) => {
                        const col = getCatColor(ci);
                        return (
                          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.65rem', background: `rgba(${hexToRgb(col)},0.08)`, borderRadius: 'var(--radius-sm)', border: `1px solid rgba(${hexToRgb(col)},0.2)` }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: col, minWidth: '60px' }}>{cat.name}</span>
                            {item
                              ? <><span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-1)' }}>{item.name}</span><span style={{ fontSize: '0.75rem', color: col, fontFamily: 'JetBrains Mono,monospace' }}>{item.winningBid}</span></>
                              : <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-3)' }}>기록 없음</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Team Management Modal */}
      {showTeamMgmt && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, maxWidth: '620px' }}>
            <button onClick={() => setShowTeamMgmt(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-2)', cursor: 'pointer', padding: '0.35rem', display: 'flex' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.25rem' }}>모둠 관리</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1.25rem' }}>학생 정보를 초기화하거나 모둠 수를 조정하세요.</p>
            <button
              onClick={() => socket.emit('addTeam')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'var(--violet-dim)', border: '1px solid rgba(124,106,255,0.4)', borderRadius: 'var(--radius-md)', color: 'var(--violet)', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,106,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--violet-dim)'}
            >
              <UserPlus size={15} /> 모둠 추가
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {gameState.teams.map(team => (
                <div key={team.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{team.name}</div>
                    {team.studentInfo
                      ? <div style={{ fontSize: '0.78rem', color: 'var(--emerald)', marginTop: '0.1rem' }}>{team.studentInfo.grade}학년 {team.studentInfo.classNum}반 ({team.studentInfo.members})</div>
                      : <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>미등록</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      disabled={!team.studentInfo}
                      onClick={() => { if (confirm(`${team.name} 정보를 초기화합니까?`)) socket.emit('resetTeamInfo', team.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.7rem', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: team.studentInfo ? 'var(--text-1)' : 'var(--text-3)', cursor: team.studentInfo ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontFamily: 'Inter,sans-serif', opacity: team.studentInfo ? 1 : 0.5 }}
                    >
                      <RefreshCw size={13} /> 초기화
                    </button>
                    <button
                      onClick={() => { if (confirm(`${team.name}을 삭제합니까?`)) socket.emit('removeTeam', team.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.7rem', background: 'var(--rose-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--rose)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Inter,sans-serif' }}
                    >
                      <Trash2 size={13} /> 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Config Modal */}
      {showCategoryConfig && editingConfig && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, maxWidth: '780px' }}>
            <button onClick={() => setShowCategoryConfig(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-2)', cursor: 'pointer', padding: '0.35rem', display: 'flex' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.25rem' }}>경매 설정</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--orange)', marginBottom: '1.5rem' }}>⚠️ 적용 시 현재 경매가 초기화됩니다.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {editingConfig.map((cat, ci) => {
                const col = getCatColor(ci);
                return (
                  <div key={cat.id} style={{ border: `1px solid rgba(${hexToRgb(col)},0.3)`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', background: `rgba(${hexToRgb(col)},0.1)`, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: col, minWidth: '60px' }}>카테고리 {ci + 1}</span>
                      <input
                        value={cat.name} onChange={e => { const n = [...editingConfig]; n[ci] = { ...n[ci], name: e.target.value }; setEditingConfig(n); }}
                        style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(${hexToRgb(col)},0.4)`, borderRadius: 'var(--radius-sm)', color: 'var(--text-1)', padding: '0.4rem 0.75rem', fontFamily: 'Inter,sans-serif', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                        placeholder="카테고리 이름"
                      />
                      <button onClick={() => { if (editingConfig.length <= 1) { alert('최소 1개 필요'); return; } setEditingConfig(editingConfig.filter((_,i) => i !== ci)); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--rose)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {cat.items.map((item, ii) => (
                        <div key={ii} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', minWidth: '20px', textAlign: 'right' }}>{ii + 1}.</span>
                          <input
                            value={item} onChange={e => { const n = [...editingConfig]; const its = [...n[ci].items]; its[ii] = e.target.value; n[ci] = { ...n[ci], items: its }; setEditingConfig(n); }}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-1)', padding: '0.4rem 0.75rem', fontFamily: 'Inter,sans-serif', fontSize: '0.875rem', outline: 'none' }}
                            placeholder="항목 내용"
                          />
                          <button onClick={() => { if (cat.items.length <= 1) { alert('최소 1개 필요'); return; } const n = [...editingConfig]; n[ci] = { ...n[ci], items: n[ci].items.filter((_,i) => i !== ii) }; setEditingConfig(n); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => { const n = [...editingConfig]; n[ci] = { ...n[ci], items: [...n[ci].items, ''] }; setEditingConfig(n); }}
                        style={{ background: 'transparent', border: `1px dashed rgba(${hexToRgb(col)},0.4)`, borderRadius: 'var(--radius-sm)', color: col, padding: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <PlusCircle size={13} /> 항목 추가
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => setEditingConfig([...editingConfig, { id: `cat_${Date.now()}`, name: '새 카테고리', items: [''] }])}
                style={{ background: 'transparent', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-2)', padding: '0.75rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <PlusCircle size={15} /> 카테고리 추가
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCategoryConfig(false)} style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.9rem' }}>취소</button>
              <button onClick={handleApplyCategoryConfig} style={{ padding: '0.6rem 1.5rem', background: 'var(--amber)', border: 'none', borderRadius: 'var(--radius-md)', color: '#1a1000', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.9rem', fontWeight: 700 }}>적용하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
