import { useState, useRef, useEffect } from 'react';
import AuctionBoard from './AuctionBoard';
import { Gavel, Play, Eye, Check, FileText, X, Settings, UserPlus, Trash2, RefreshCw, BookOpen, PlusCircle, MoreVertical, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// Category colors for consistent styling
const CAT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

function getCatColor(index) {
  return CAT_COLORS[index % CAT_COLORS.length];
}

export default function TeacherView({ gameState, socket, teamBidStatus, connectedTeams, initialBids, onLogout }) {
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTeamMgmt, setShowTeamMgmt] = useState(false);
  const [showCategoryConfig, setShowCategoryConfig] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [isProjectorMode, setIsProjectorMode] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categoryConfig = gameState.categoryConfig || [];

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
        const itemId = team.wonItems?.[cat.id];
        const item = itemId ? gameState.items.find(i => i.id === itemId) : null;
        row[`[${cat.name}] 낙찰 항목`] = item?.name ?? '';
        row[`[${cat.name}] 낙찰 금액`] = item?.winningBid ?? '';
        totalSpent += item?.winningBid || 0;
      });
      row['총 사용 금액(코인)'] = totalSpent;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = gameState.classInfo
      ? `${gameState.classInfo.grade}학년${gameState.classInfo.classNum}반`
      : '경매결과';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName}_경매결과.xlsx`);
  };

  const openCategoryConfig = () => {
    setEditingConfig(JSON.parse(JSON.stringify(categoryConfig)));
    setShowCategoryConfig(true);
  };

  const handleApplyCategoryConfig = () => {
    const hasEmpty = editingConfig.some(
      cat => !cat.name.trim() || cat.items.some(item => !item.trim())
    );
    if (hasEmpty) {
      alert('카테고리 이름과 항목 이름을 모두 입력해주세요.');
      return;
    }
    if (!confirm('카테고리를 변경하면 현재 경매 진행 상황이 초기화됩니다.\n정말 적용하시겠습니까?')) return;

    const sanitized = editingConfig.map(cat => ({
      ...cat,
      name: cat.name.trim(),
      items: cat.items.map(i => i.trim()).filter(i => i.length > 0)
    })).filter(cat => cat.items.length > 0);

    socket.emit('updateCategoryConfig', sanitized);
    setShowCategoryConfig(false);
  };

  const addCategory = () => {
    const newId = `cat_${Date.now()}`;
    setEditingConfig([...editingConfig, { id: newId, name: '새 카테고리', items: [''] }]);
  };

  const removeCategory = (catIdx) => {
    if (editingConfig.length <= 1) { alert('최소 1개의 카테고리가 필요합니다.'); return; }
    setEditingConfig(editingConfig.filter((_, i) => i !== catIdx));
  };

  const updateCategoryName = (catIdx, value) => {
    const next = [...editingConfig];
    next[catIdx] = { ...next[catIdx], name: value };
    setEditingConfig(next);
  };

  const addItem = (catIdx) => {
    const next = [...editingConfig];
    next[catIdx] = { ...next[catIdx], items: [...next[catIdx].items, ''] };
    setEditingConfig(next);
  };

  const updateItem = (catIdx, itemIdx, value) => {
    const next = [...editingConfig];
    const items = [...next[catIdx].items];
    items[itemIdx] = value;
    next[catIdx] = { ...next[catIdx], items };
    setEditingConfig(next);
  };

  const removeItem = (catIdx, itemIdx) => {
    if (editingConfig[catIdx].items.length <= 1) { alert('카테고리당 최소 1개의 항목이 필요합니다.'); return; }
    const next = [...editingConfig];
    next[catIdx] = { ...next[catIdx], items: next[catIdx].items.filter((_, i) => i !== itemIdx) };
    setEditingConfig(next);
  };

  return (
    <div className="flex flex-col gap-6" style={{ paddingBottom: '4rem' }}>
      {/* Header */}
      <div className="panel flex justify-between items-center" style={{ position: 'sticky', top: '1rem', zIndex: 50, backgroundColor: 'rgba(74, 37, 17, 0.95)', backdropFilter: 'blur(10px)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="gold-text m-0 flex items-center gap-2" style={{ marginTop: 0 }}>
            <Gavel size={28} /> 재판장 대시보드 {gameState.classInfo && <span style={{fontSize:'1.2rem', color:'#f4ecd8'}}>[{gameState.classInfo.grade}학년 {gameState.classInfo.classNum}반]</span>}
            <button
              onClick={() => setIsProjectorMode(!isProjectorMode)}
              style={{ marginLeft: '1rem', fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '20px', border: '1px solid #d4af37', backgroundColor: isProjectorMode ? '#d4af37' : 'transparent', color: isProjectorMode ? '#1a1a1a' : '#d4af37', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
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

        {/* ── 진행 액션 버튼 (경매 흐름 전용) ── */}
        <div className="flex gap-4" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          {gameState.auctionPhase === 'WAITING' && (
            <button className="btn-primary" disabled={!selectedItemId} onClick={handleStartAuction} style={{ fontSize: '1.15rem', padding: '0.8rem 1.5rem' }}>
              <Play size={20} /> 경매 시작
            </button>
          )}
          {gameState.auctionPhase === 'BIDDING' && (
            <>
              {Object.values(gameState.secretTicketRequests || {}).some(r => r) && (
                <button className="btn-primary" onClick={() => socket.emit('approveSecretTickets')} style={{ backgroundColor: '#2563eb', borderColor: '#60a5fa' }}>
                  <Eye size={20} /> 해제권 허가 및 재입찰 {isProjectorMode ? '(요청됨)' : `(${Object.values(gameState.secretTicketRequests).filter(v => v).length}팀)`}
                </button>
              )}
              <button className="btn-primary" onClick={handleReveal} style={{ fontSize: '1.15rem', padding: '0.8rem 1.5rem' }}>
                <Eye size={20} /> 경매 마감 및 결과 공개
              </button>
            </>
          )}
          {gameState.auctionPhase === 'REBIDDING' && (
            <button className="btn-primary" onClick={handleReveal} style={{ fontSize: '1.15rem', padding: '0.8rem 1.5rem' }}>
              <Eye size={20} /> 재입찰 마감 및 최종 결과 공개
            </button>
          )}
          {gameState.auctionPhase === 'REVEALING' && (
            <button className="btn-primary" onClick={handleCompleteSale} style={{ backgroundColor: '#1a1a1a', borderColor: '#d4af37', fontSize: '1.15rem', padding: '0.8rem 1.5rem' }}>
              <Gavel size={20} /> 낙찰 확정
            </button>
          )}
          {gameState.auctionPhase === 'TIE_BREAKER' && (
            <div className="panel" style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', padding: '0.8rem 1rem' }}>
              <h4 style={{ color: '#ef4444', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>⚔️ 동점! 가위바위보 승자 선택</h4>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {gameState.tiedTeams?.map(tId => {
                  const team = gameState.teams.find(t => t.id === tId);
                  return (
                    <button key={tId} className="btn-primary" onClick={() => socket.emit('resolveTie', tId)} style={{ backgroundColor: '#d4af37', color: '#1a1a1a', borderColor: '#fff' }}>
                      <Gavel size={16} /> {team?.name} 승리
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {(gameState.auctionPhase === 'SOLD' || gameState.auctionPhase === 'NO_BIDS') && (
            <button className="btn-primary" onClick={handleNext} style={{ fontSize: '1.15rem', padding: '0.8rem 1.5rem' }}>
              <Check size={20} /> 다음 경매로
            </button>
          )}

          {/* ── 관리 도구 드롭다운 (⋮) ── */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ background: showMenu ? 'rgba(212,175,55,0.2)' : 'transparent', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '6px', padding: '0.6rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', transition: 'all 0.15s' }}
              title="관리 도구"
            >
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', backgroundColor: '#2c1608', border: '1px solid #d4af37', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', zIndex: 200, minWidth: '200px', overflow: 'hidden' }}>
                <button onClick={() => { setShowDashboard(true); setShowMenu(false); }} style={menuItemStyle}>
                  <FileText size={16} /> 결과 리포트
                </button>
                <button onClick={() => { setShowTeamMgmt(true); setShowMenu(false); }} style={menuItemStyle}>
                  <Settings size={16} /> 모둠 관리
                </button>
                <button onClick={() => { openCategoryConfig(); setShowMenu(false); }} style={menuItemStyle}>
                  <BookOpen size={16} /> 경매 설정
                </button>
                <button
                  onClick={() => setIsProjectorMode(v => !v)}
                  style={{ ...menuItemStyle, color: isProjectorMode ? '#d4af37' : '#ccc', backgroundColor: isProjectorMode ? 'rgba(212,175,55,0.1)' : 'transparent' }}
                >
                  <Eye size={16} /> 프로젝터 모드 {isProjectorMode ? 'ON ✓' : 'OFF'}
                </button>
                <div style={{ borderTop: '1px solid #444', margin: '4px 0' }} />
                {gameState.auctionPhase === 'WAITING' && (
                  <button
                    onClick={() => { if (confirm('정말로 전체 경매를 처음부터 다시 시작하시겠습니까?\n모든 입찰 결과와 예산이 초기화됩니다.')) { socket.emit('resetGame'); setShowMenu(false); } }}
                    style={{ ...menuItemStyle, color: '#ef4444' }}
                  >
                    <RefreshCw size={16} /> 전체 초기화
                  </button>
                )}
                <button onClick={() => { setShowMenu(false); onLogout(); }} style={{ ...menuItemStyle, color: '#aaa' }}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        {/* Team status sidebar */}
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

                const wonItemsList = categoryConfig.map((cat, catIdx) => {
                  const itemId = team.wonItems?.[cat.id];
                  return { cat, catIdx, item: itemId ? gameState.items.find(i => i.id === itemId) : null };
                }).filter(entry => entry.item);

                return (
                  <div key={team.id} style={{ padding: '0.8rem', backgroundColor: isConnected ? 'rgba(74,222,128,0.07)' : 'rgba(0,0,0,0.3)', borderLeft: `4px solid ${isConnected ? '#4ade80' : '#ef4444'}`, display: 'flex', flexDirection: 'column', gap: '0.8rem', borderRadius: '0 4px 4px 0', position: 'relative', transition: 'background-color 0.4s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isConnected ? '#4ade80' : '#ef4444', flexShrink: 0 }} />
                          {team.name}
                          {team.studentInfo && <span style={{fontSize: '0.9rem', color: '#ccc'}}>({team.studentInfo.grade}학년 {team.studentInfo.classNum}반 {team.studentInfo.members})</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#ccc', marginTop: '0.2rem' }}>
                          보유: <span className="gold-text">{team.budget}</span> 코인 |
                          {isConnected ? <span style={{ color: '#4ade80' }}> 접속중</span> : <span style={{ color: '#ef4444' }}> 미접속</span>}
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

                    {wonItemsList.length > 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#f4ecd8', backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: '4px' }}>
                        {wonItemsList.map(({ cat, catIdx, item }) => (
                          <div key={cat.id} style={{ marginBottom: '2px' }}>
                            <span style={{ color: getCatColor(catIdx) }}>[{cat.name}]</span> {item.name} <span style={{ color: '#d4af37' }}>({item.winningBid}코인)</span>
                          </div>
                        ))}
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

      {/* Result Report Modal */}
      {showDashboard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, padding: '2rem', overflowY: 'auto' }}>
          <div className="panel" style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
             <button onClick={() => setShowDashboard(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}>
               <X size={32} />
             </button>
             <h2 className="gold-text" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '1rem', borderBottom: '2px solid #d4af37', paddingBottom: '1rem' }}>
               {gameState.classInfo ? `${gameState.classInfo.grade}학년 ${gameState.classInfo.classNum}반 ` : ''}경매 최종 결과 리포트
             </h2>
             <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
               <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#217346', border: '1px solid #34a85a', color: '#fff', padding: '0.6rem 1.4rem', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
                 <Download size={18} /> 엑셀로 내보내기
               </button>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
               {gameState.teams.map(team => {
                 const wonEntries = categoryConfig.map((cat, catIdx) => {
                   const itemId = team.wonItems?.[cat.id];
                   return { cat, catIdx, item: itemId ? gameState.items.find(i => i.id === itemId) : null };
                 });
                 const totalSpent = wonEntries.reduce((sum, e) => sum + (e.item?.winningBid || 0), 0);

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
                        {wonEntries.map(({ cat, catIdx, item }) => {
                          const color = getCatColor(catIdx);
                          return (
                            <div key={cat.id} style={{ backgroundColor: `rgba(${hexToRgb(color)}, 0.15)`, borderLeft: `3px solid ${color}`, padding: '0.8rem', borderRadius: '0 4px 4px 0' }}>
                              <strong style={{ color, fontSize: '0.9rem', display: 'block', marginBottom: '0.3rem' }}>{cat.name}</strong>
                              {item ?
                                <div><span style={{ color: '#f4ecd8' }}>{item.name}</span> <span style={{ float: 'right', color }}>(💰 {item.winningBid})</span></div> :
                                <span style={{ color: '#555' }}>낙찰 기록 없음</span>}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, padding: '2rem', overflowY: 'auto' }}>
          <div className="panel" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
             <button onClick={() => setShowTeamMgmt(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}>
               <X size={32} />
             </button>
             <h2 className="gold-text" style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '1.5rem', borderBottom: '2px solid #d4af37', paddingBottom: '1rem' }}>
               <Settings size={28} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> 모둠 정보 관리
             </h2>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
               <p style={{ color: '#aaa', margin: 0 }}>등록된 학생 정보를 초기화하거나, 모둠의 개수를 조정할 수 있습니다.</p>
               <button className="btn-primary" onClick={() => socket.emit('addTeam')} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
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
                     <button onClick={() => { if(confirm(`${team.name}의 등록 정보를 초기화합니까?`)) socket.emit('resetTeamInfo', team.id); }} disabled={!team.studentInfo} style={{ background: '#374151', color: team.studentInfo ? '#f4ecd8' : '#6b7280', border: '1px solid #4b5563', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: team.studentInfo ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                       <RefreshCw size={14} /> 정보 리셋
                     </button>
                     <button onClick={() => { if(confirm(`정말 ${team.name}을(를) 삭제합니까?`)) socket.emit('removeTeam', team.id); }} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                       <Trash2 size={14} /> 삭제
                     </button>
                   </div>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      )}

      {/* Category Config Modal */}
      {showCategoryConfig && editingConfig && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, padding: '2rem', overflowY: 'auto' }}>
          <div className="panel" style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
            <button onClick={() => setShowCategoryConfig(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}>
              <X size={32} />
            </button>
            <h2 className="gold-text" style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '0.5rem', borderBottom: '2px solid #d4af37', paddingBottom: '1rem' }}>
              <BookOpen size={28} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> 경매 설정 관리
            </h2>
            <p style={{ color: '#f59e0b', textAlign: 'center', marginBottom: '2rem', fontSize: '0.95rem' }}>
              ⚠️ 적용 시 현재 경매 진행 상황이 초기화됩니다. 수업 시작 전에 설정하세요.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {editingConfig.map((cat, catIdx) => {
                const color = getCatColor(catIdx);
                return (
                  <div key={cat.id} style={{ border: `2px solid ${color}`, borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Category header */}
                    <div style={{ backgroundColor: `rgba(${hexToRgb(color)}, 0.2)`, padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <span style={{ color, fontWeight: 'bold', fontSize: '0.9rem', minWidth: '80px' }}>카테고리 {catIdx + 1}</span>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => updateCategoryName(catIdx, e.target.value)}
                        style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: `1px solid ${color}`, color: '#f4ecd8', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold' }}
                        placeholder="카테고리 이름"
                      />
                      <button onClick={() => removeCategory(catIdx)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Trash2 size={14} /> 카테고리 삭제
                      </button>
                    </div>

                    {/* Items list */}
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {cat.items.map((item, itemIdx) => (
                        <div key={itemIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: '#666', fontSize: '0.85rem', minWidth: '24px', textAlign: 'right' }}>{itemIdx + 1}.</span>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => updateItem(catIdx, itemIdx, e.target.value)}
                            style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid #444', color: '#f4ecd8', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.95rem' }}
                            placeholder="항목 내용 입력"
                          />
                          <button onClick={() => removeItem(catIdx, itemIdx)} style={{ background: 'transparent', border: '1px solid #555', color: '#888', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addItem(catIdx)} style={{ marginTop: '0.3rem', background: 'transparent', border: `1px dashed ${color}`, color, padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                        <PlusCircle size={15} /> 항목 추가
                      </button>
                    </div>
                  </div>
                );
              })}

              <button onClick={addCategory} style={{ background: 'transparent', border: '2px dashed #d4af37', color: '#d4af37', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <PlusCircle size={18} /> 카테고리 추가
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCategoryConfig(false)} style={{ background: 'transparent', border: '1px solid #666', color: '#aaa', padding: '0.7rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>
                취소
              </button>
              <button onClick={handleApplyCategoryConfig} style={{ background: '#d4af37', border: 'none', color: '#1a1a1a', padding: '0.7rem 2rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
                적용하기 (경매 초기화)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  width: '100%', padding: '0.7rem 1rem', background: 'transparent',
  border: 'none', color: '#f4ecd8', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: '1rem', textAlign: 'left',
  transition: 'background 0.15s',
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255,255,255';
}
