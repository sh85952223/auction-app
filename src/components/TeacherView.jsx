import { useState, useEffect } from 'react';
import AuctionBoard from './AuctionBoard';
import {
  Gavel, Play, Eye, Check, FileText, X, Settings, UserPlus,
  Trash2, RefreshCw, BookOpen, PlusCircle, MoreVertical, Download, Copy, LogOut
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AppBar, Toolbar, Box, Chip, Button, IconButton, Menu, MenuItem,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, TextField, Grid,
} from '@mui/material';

const CAT_COLORS = ['#1A3626', '#B54F35', '#D4AF37', '#54483a', '#5b6c50', '#a87c7c'];
function getCatColor(i) { return CAT_COLORS[i % CAT_COLORS.length]; }

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '255,255,255';
}

const PHASE_META = {
  WAITING:          { text: '대기 중',         color: 'default' },
  BIDDING:          { text: '입찰 진행',        color: 'primary' },
  REBIDDING:        { text: '재입찰',           color: 'primary' },
  REVEALING:        { text: '결과 공개',        color: 'secondary' },
  TIE_BREAKER:      { text: '동점 결정',        color: 'error'   },
  NO_BIDS:          { text: '유찰',             color: 'default' },
  SOLD:             { text: '낙찰 완료',        color: 'success' },
  CATEGORY_WRAP_UP: { text: '카테고리 마무리',  color: 'primary' },
};

export default function TeacherView({ gameState, socket, teamBidStatus, connectedTeams, initialBids, sessionCode, onLogout }) {
  const [selectedItemId, setSelectedItemId]     = useState(null);
  const [showDashboard, setShowDashboard]       = useState(false);
  const [showTeamMgmt, setShowTeamMgmt]         = useState(false);
  const [showCategoryConfig, setShowCategoryConfig] = useState(false);
  const [editingConfig, setEditingConfig]       = useState(null);
  const [editingGameConfig, setEditingGameConfig] = useState(null);
  const [isProjectorMode, setIsProjectorMode]   = useState(true);
  const [menuAnchor, setMenuAnchor]             = useState(null);
  const [codeCopied, setCodeCopied]             = useState(false);
  const [savedSubjects, setSavedSubjects]       = useState([]);
  const [subjectsLoading, setSubjectsLoading]   = useState(false);
  const [subjectSaveName, setSubjectSaveName]   = useState('');

  useEffect(() => {
    const handler = (subjects) => { setSavedSubjects(subjects); setSubjectsLoading(false); };
    socket.on('subjects', handler);
    return () => socket.off('subjects', handler);
  }, [socket]);

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

  const openCategoryConfig = () => {
    setEditingConfig(JSON.parse(JSON.stringify(categoryConfig)));
    setEditingGameConfig({ ...(gameState.gameConfig || { initialBudget: 1000, bidUnit: 50 }) });
    setShowCategoryConfig(true);
    setSubjectsLoading(true);
    socket.emit('loadSubjects');
  };

  const handleLoadSubject = (subject) => {
    setEditingConfig(JSON.parse(JSON.stringify(subject.categories)));
    setEditingGameConfig({ ...(subject.gameConfig || { initialBudget: 1000, bidUnit: 50 }) });
  };

  const handleSaveSubject = () => {
    if (!subjectSaveName.trim()) { alert('저장할 이름을 입력하세요.'); return; }
    const sanitized = editingConfig
      .map(c => ({ ...c, name: c.name.trim(), items: c.items.map(i => i.trim()).filter(Boolean) }))
      .filter(c => c.name && c.items.length > 0);
    if (sanitized.length === 0) { alert('저장할 카테고리가 없습니다.'); return; }
    socket.emit('saveSubject', { name: subjectSaveName.trim(), categories: sanitized, gameConfig: editingGameConfig });
    setSubjectSaveName('');
    setSubjectsLoading(true);
  };

  const handleDeleteSubject = (id, name) => {
    if (!confirm(`'${name}' 수업을 삭제할까요?`)) return;
    socket.emit('deleteSubject', { subjectId: id });
    setSubjectsLoading(true);
  };

  const handleApplyCategoryConfig = () => {
    if (editingConfig.some(c => !c.name.trim() || c.items.some(i => !i.trim()))) { alert('카테고리 이름과 항목을 모두 입력하세요.'); return; }
    const { initialBudget, bidUnit } = editingGameConfig;
    if (!initialBudget || initialBudget < 100) { alert('초기 코인은 100 이상이어야 합니다.'); return; }
    if (!bidUnit || bidUnit < 10) { alert('입찰 단위는 10 이상이어야 합니다.'); return; }
    if (!confirm('적용 시 현재 경매가 초기화됩니다. 계속하시겠습니까?')) return;
    const sanitized = editingConfig.map(c => ({ ...c, name: c.name.trim(), items: c.items.map(i => i.trim()).filter(Boolean) })).filter(c => c.items.length > 0);
    socket.emit('updateCategoryConfig', { categoryConfig: sanitized, gameConfig: { initialBudget: Number(initialBudget), bidUnit: Number(bidUnit) } });
    setShowCategoryConfig(false);
  };

  const phase = gameState.auctionPhase;
  const phaseMeta = PHASE_META[phase] || PHASE_META.WAITING;

  const teamCardSx = (connected) => ({
    p: '0.85rem 1rem',
    background: connected ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${connected ? 'rgba(52,211,153,0.2)' : 'var(--border-subtle)'}`,
    borderRadius: 2.5,
    display: 'flex', flexDirection: 'column', gap: 1,
  });

  return (
    <Box sx={{ pb: 6 }}>

      {/* ── Sticky AppBar ── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(13,15,26,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-default)',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ gap: 1.5, flexWrap: 'wrap', py: 0.5, minHeight: '56px !important' }}>

          {/* Left: title + code + phase + projector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Gavel size={20} color="var(--amber)" />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary', whiteSpace: 'nowrap' }}>
                재판장 대시보드
                {gameState.classInfo && (
                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {' '}· {gameState.classInfo.grade}학년 {gameState.classInfo.classNum}반
                  </Box>
                )}
              </Typography>
            </Box>

            {/* Session code badge */}
            {sessionCode && (
              <Chip
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.18em' }}>
                      {sessionCode}
                    </Typography>
                    {codeCopied ? <Check size={13} color="var(--emerald)" /> : <Copy size={13} />}
                  </Box>
                }
                onClick={handleCopyCode}
                title="클릭하여 복사"
                size="small"
                sx={{
                  background: 'var(--violet-light-dim)',
                  border: '1px solid rgba(165,153,255,0.35)',
                  color: 'var(--violet-light)',
                  cursor: 'pointer',
                  height: 30,
                  '& .MuiChip-label': { px: 1.25 },
                }}
              />
            )}

            {/* Phase chip */}
            <Chip
              label={phaseMeta.text}
              color={phaseMeta.color}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.8rem', height: 28 }}
            />

            {/* Projector toggle */}
            <Chip
              icon={<Eye size={13} />}
              label={isProjectorMode ? '프로젝터 ON' : '프로젝터 OFF'}
              onClick={() => setIsProjectorMode(v => !v)}
              size="small"
              sx={{
                background: isProjectorMode ? 'var(--amber-dim)' : 'transparent',
                border: `1px solid ${isProjectorMode ? 'rgba(245,158,11,0.4)' : 'var(--border-default)'}`,
                color: isProjectorMode ? 'var(--amber)' : 'text.secondary',
                fontWeight: 700, fontSize: '0.75rem', height: 28, cursor: 'pointer',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          </Box>

          {/* Right: action buttons */}
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
            {phase === 'WAITING' && (
              <Button
                variant="contained" color="primary" size="small"
                disabled={!selectedItemId}
                startIcon={<Play size={15} />}
                onClick={() => socket.emit('startAuctionFor', selectedItemId)}
              >
                경매 시작
              </Button>
            )}
            {phase === 'BIDDING' && (
              <>
                {Object.values(gameState.secretTicketRequests || {}).some(Boolean) && (
                  <Button
                    variant="outlined" color="primary" size="small"
                    startIcon={<Eye size={15} />}
                    onClick={() => socket.emit('approveSecretTickets')}
                  >
                    해제권 허가
                  </Button>
                )}
                <Button
                  variant="contained" color="primary" size="small"
                  startIcon={<Eye size={15} />}
                  onClick={() => socket.emit('revealBids')}
                >
                  마감 · 공개
                </Button>
              </>
            )}
            {phase === 'REBIDDING' && (
              <Button
                variant="contained" color="primary" size="small"
                startIcon={<Eye size={15} />}
                onClick={() => socket.emit('revealBids')}
              >
                재입찰 마감
              </Button>
            )}
            {phase === 'REVEALING' && (
              <Button
                variant="contained" color="secondary" size="small"
                startIcon={<Gavel size={15} />}
                onClick={() => socket.emit('completeSale')}
              >
                낙찰 확정
              </Button>
            )}
            {phase === 'TIE_BREAKER' && gameState.tiedTeams?.map(tId => {
              const team = gameState.teams.find(t => t.id === tId);
              return (
                <Button
                  key={tId}
                  variant="contained" color="error" size="small"
                  startIcon={<Gavel size={15} />}
                  onClick={() => socket.emit('resolveTie', tId)}
                >
                  {team?.name} 승리
                </Button>
              );
            })}
            {(phase === 'SOLD' || phase === 'NO_BIDS') && (
              <Button
                variant="contained" color="success" size="small"
                startIcon={<Check size={15} />}
                onClick={() => { setSelectedItemId(null); socket.emit('nextItem'); }}
                sx={{ background: 'var(--emerald)', '&:hover': { background: '#2ab882' } }}
              >
                다음 경매
              </Button>
            )}
            {phase === 'CATEGORY_WRAP_UP' && (
              <Typography sx={{ fontSize: '0.8rem', color: 'var(--violet-light)', fontWeight: 600 }}>
                아래 모달에서 처리 방식을 선택하세요
              </Typography>
            )}

            {/* ⋮ Menu */}
            <IconButton
              size="small"
              onClick={e => setMenuAnchor(e.currentTarget)}
              sx={{
                border: '1px solid var(--border-default)',
                borderRadius: 2,
                color: 'text.secondary',
                background: menuAnchor ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}
            >
              <MoreVertical size={18} />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              PaperProps={{ sx: { minWidth: 190, mt: 0.75 } }}
            >
              <MenuItem onClick={() => { setShowDashboard(true); setMenuAnchor(null); }}>
                <FileText size={15} style={{ marginRight: 8 }} /> 결과 리포트
              </MenuItem>
              <MenuItem onClick={() => { setShowTeamMgmt(true); setMenuAnchor(null); }}>
                <Settings size={15} style={{ marginRight: 8 }} /> 모둠 관리
              </MenuItem>
              <MenuItem onClick={() => { openCategoryConfig(); setMenuAnchor(null); }}>
                <BookOpen size={15} style={{ marginRight: 8 }} /> 경매 설정
              </MenuItem>
              <Divider />
              {phase === 'WAITING' && (
                <MenuItem
                  sx={{ color: 'error.main' }}
                  onClick={() => { if (confirm('전체 경매를 초기화하시겠습니까?')) { socket.emit('resetGame'); setMenuAnchor(null); } }}
                >
                  <RefreshCw size={15} style={{ marginRight: 8 }} /> 전체 초기화
                </MenuItem>
              )}
              <MenuItem sx={{ color: 'text.secondary' }} onClick={() => { setMenuAnchor(null); onLogout(); }}>
                <LogOut size={15} style={{ marginRight: 8 }} /> 로그아웃
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Main layout ── */}
      <Box sx={{ display: 'flex', gap: 2.5, p: 2.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Left: Team sidebar ── */}
        <Box sx={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: 1.25, position: 'sticky', top: '72px', flex: '0 0 280px' }}>

          {/* Guess winner banner */}
          {gameState.lastGuessWinners?.teams?.length > 0 && (
            <Box sx={{ p: 1.25, background: 'var(--emerald-dim)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 2 }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--emerald)', mb: 0.5 }}>🎯 낙찰가 예측 보너스</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>오차 {gameState.lastGuessWinners.minDiff}코인</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {gameState.lastGuessWinners.teams.map(tId => {
                  const t = gameState.teams.find(t => t.id === tId);
                  return <Chip key={tId} label={t?.name} size="small" sx={{ background: 'rgba(52,211,153,0.2)', color: 'var(--emerald)', height: 22, fontSize: '0.75rem' }} />;
                })}
              </Box>
            </Box>
          )}

          {/* Teams header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.25 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase' }}>모둠 현황</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>{gameState.teams.length}팀</Typography>
          </Box>

          {/* Team cards */}
          {gameState.teams.map(team => {
            const connected = connectedTeams?.includes(team.id);
            const hasBid = teamBidStatus?.[team.id];
            const wonList = categoryConfig.map((cat, ci) => {
              const itemId = team.wonItems?.[cat.id];
              return { cat, ci, item: itemId ? gameState.items.find(i => i.id === itemId) : null };
            }).filter(e => e.item);

            return (
              <Box key={team.id} sx={teamCardSx(connected)}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--emerald)' : 'var(--text-3)', flexShrink: 0, boxShadow: connected ? '0 0 6px var(--emerald)' : 'none' }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.85rem', fontWeight: 700, color: 'secondary.main', flexShrink: 0 }}>{team.budget}</Typography>
                </Box>

                {team.studentInfo && (
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>{team.studentInfo.grade}학년 {team.studentInfo.classNum}반 · {team.studentInfo.members}</Typography>
                )}

                {(phase === 'BIDDING' || phase === 'REBIDDING') && hasBid && (
                  <Chip
                    icon={<Check size={10} />}
                    label={hasBid.isGuess ? '예측 완료' : '제출 완료'}
                    size="small"
                    sx={{
                      alignSelf: 'flex-start', height: 22, fontSize: '0.72rem', fontWeight: 700,
                      background: hasBid.isGuess ? 'var(--violet-light-dim)' : 'var(--emerald-dim)',
                      color: hasBid.isGuess ? 'var(--violet-light)' : 'var(--emerald)',
                      '& .MuiChip-icon': { color: 'inherit' },
                    }}
                  />
                )}

                {phase === 'REBIDDING' && initialBids?.[team.id] !== undefined && (
                  <Typography sx={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono,monospace' }}>
                    {isProjectorMode
                      ? <Box component="span" className="mask-hover" sx={{ background: 'rgba(255,255,255,0.05)', px: 0.5, borderRadius: 0.5, cursor: 'help' }}>{initialBids[team.id]}</Box>
                      : <Box component="span" sx={{ color: 'var(--violet-light)' }}>{initialBids[team.id]} (1차)</Box>}
                  </Typography>
                )}

                {phase === 'REVEALING' && gameState.bids[team.id] !== undefined && (
                  <Typography className="anim-stamp" sx={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 800, fontSize: '1.1rem', color: 'secondary.main' }}>
                    {gameState.bids[team.id]}
                  </Typography>
                )}

                {wonList.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, pt: 0.5, borderTop: '1px solid var(--border-subtle)' }}>
                    {wonList.map(({ cat, ci, item }) => (
                      <Box key={cat.id} sx={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.72rem', color: getCatColor(ci), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', flexShrink: 0, fontFamily: 'JetBrains Mono,monospace' }}>{item.winningBid}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* ── Right: Auction board ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AuctionBoard
            gameState={gameState}
            selectedItemId={gameState.currentAuctionItemId || selectedItemId}
            onSelectItem={setSelectedItemId}
            isTeacher={true}
          />
        </Box>
      </Box>

      {/* ══ Category Wrap-Up Modal ══ */}
      {phase === 'CATEGORY_WRAP_UP' && gameState.categoryWrapUp && (() => {
        const wu = gameState.categoryWrapUp;
        const teamsWithoutWin = wu.teamsWithoutWin.map(id => gameState.teams.find(t => t.id === id)).filter(Boolean);
        const unsoldCount = wu.unsoldItems?.length || 0;
        const canAssign = unsoldCount > 0;

        return (
          <Dialog open maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5 }}>
              <span>📋</span>
              <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--violet-light)' }}>카테고리 마무리</Typography>
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 2 }}>
                <strong style={{ color: 'var(--text-1)' }}>'{wu.categoryName}'</strong> 카테고리의 모든 항목이 진행되었습니다.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: '160px', p: 1.25, background: 'var(--rose-dim)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 2 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'error.main', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>낙찰 미달 모둠 ({teamsWithoutWin.length})</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {teamsWithoutWin.map(t => (
                      <Chip key={t.id} label={t.name} size="small" sx={{ background: 'rgba(248,113,113,0.15)', color: 'error.main', border: '1px solid rgba(248,113,113,0.3)', height: 24, fontSize: '0.8rem', fontWeight: 700 }} />
                    ))}
                  </Box>
                </Box>
                <Box sx={{ flexShrink: 0, p: '0.85rem 1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'JetBrains Mono,monospace', color: canAssign ? 'secondary.main' : 'text.disabled' }}>{unsoldCount}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>유찰 항목</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth variant="outlined"
                  sx={{ justifyContent: 'flex-start', gap: 1, p: 1.5, borderColor: 'var(--border-strong)', color: 'text.secondary' }}
                  onClick={() => socket.emit('categoryWrapUpAction', { action: 'end' })}
                >
                  <span style={{ fontSize: '1.3rem' }}>✋</span>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>이대로 종료</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontWeight: 400 }}>낙찰 없이 다음으로</Typography>
                  </Box>
                </Button>
                <Button
                  fullWidth variant="outlined" disabled={!canAssign}
                  sx={{ justifyContent: 'flex-start', gap: 1, p: 1.5, borderColor: canAssign ? 'rgba(245,158,11,0.4)' : undefined, color: canAssign ? 'secondary.main' : undefined }}
                  onClick={() => canAssign && socket.emit('categoryWrapUpAction', { action: 'random' })}
                >
                  <span style={{ fontSize: '1.3rem' }}>🎲</span>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>무작위 배정</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontWeight: 400 }}>유찰 항목을 랜덤으로</Typography>
                  </Box>
                </Button>
                <Button
                  fullWidth variant="outlined" disabled={!canAssign}
                  sx={{ justifyContent: 'flex-start', gap: 1, p: 1.5, borderColor: canAssign ? 'rgba(124,106,255,0.4)' : undefined, color: canAssign ? 'primary.main' : undefined }}
                  onClick={() => canAssign && socket.emit('categoryWrapUpAction', { action: 'consolation' })}
                >
                  <span style={{ fontSize: '1.3rem' }}>⚔️</span>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>재경매 진행</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontWeight: 400 }}>미달 모둠끼리 재경쟁</Typography>
                  </Box>
                </Button>
              </Box>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ══ Result Report Modal ══ */}
      <Dialog open={showDashboard} onClose={() => setShowDashboard(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 0.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.03em' }}>
            {gameState.classInfo ? `${gameState.classInfo.grade}학년 ${gameState.classInfo.classNum}반 ` : ''}경매 결과 리포트
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.25 }}>최종 낙찰 및 예산 현황</Typography>
        </DialogTitle>
        <DialogContent>
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            onClick={handleExportExcel}
            sx={{ mb: 2.5, borderColor: 'rgba(34,197,94,0.4)', color: '#4ade80', '&:hover': { background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.7)' } }}
          >
            엑셀로 내보내기
          </Button>

          <Grid container spacing={1.5}>
            {gameState.teams.map(team => {
              const wonEntries = categoryConfig.map((cat, ci) => {
                const itemId = team.wonItems?.[cat.id];
                return { cat, ci, item: itemId ? gameState.items.find(i => i.id === itemId) : null };
              });
              const totalSpent = wonEntries.reduce((s, e) => s + (e.item?.winningBid || 0), 0);

              return (
                <Grid item key={team.id} xs={12} sm={6} md={4}>
                  <Box sx={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 2.5, p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{team.name}</Typography>
                        {team.studentInfo && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>{team.studentInfo.grade}학년 {team.studentInfo.classNum}반 · {team.studentInfo.members}</Typography>}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Box sx={{ flex: 1, textAlign: 'center', p: 1, background: 'var(--amber-dim)', borderRadius: 2 }}>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.25 }}>남은 예산</Typography>
                        <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: 'secondary.main', fontFamily: 'JetBrains Mono,monospace' }}>{team.budget}</Typography>
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center', p: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.25 }}>사용 금액</Typography>
                        <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono,monospace' }}>{totalSpent}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {wonEntries.map(({ cat, ci, item }) => {
                        const col = getCatColor(ci);
                        return (
                          <Box key={cat.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: '0.5rem 0.65rem', background: `rgba(${hexToRgb(col)},0.08)`, borderRadius: 1, border: `1px solid rgba(${hexToRgb(col)},0.2)` }}>
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: col, minWidth: '60px' }}>{cat.name}</Typography>
                            {item
                              ? <><Typography sx={{ flex: 1, fontSize: '0.8rem' }}>{item.name}</Typography><Typography sx={{ fontSize: '0.75rem', color: col, fontFamily: 'JetBrains Mono,monospace' }}>{item.winningBid}</Typography></>
                              : <Typography sx={{ flex: 1, fontSize: '0.8rem', color: 'text.disabled' }}>기록 없음</Typography>}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDashboard(false)} variant="outlined" color="inherit">닫기</Button>
        </DialogActions>
      </Dialog>

      {/* ══ Team Management Modal ══ */}
      <Dialog open={showTeamMgmt} onClose={() => setShowTeamMgmt(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem' }}>모둠 관리</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.25 }}>학생 정보를 초기화하거나 모둠 수를 조정하세요.</Typography>
        </DialogTitle>
        <DialogContent>
          <Button
            variant="outlined" color="primary"
            startIcon={<UserPlus size={15} />}
            onClick={() => socket.emit('addTeam')}
            sx={{ mb: 2 }}
          >
            모둠 추가
          </Button>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {gameState.teams.map(team => (
              <Box key={team.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '0.85rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 2, gap: 1.5 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{team.name}</Typography>
                  {team.studentInfo
                    ? <Typography sx={{ fontSize: '0.78rem', color: 'success.main', mt: 0.15 }}>{team.studentInfo.grade}학년 {team.studentInfo.classNum}반 ({team.studentInfo.members})</Typography>
                    : <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', mt: 0.15 }}>미등록</Typography>}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                  <Button
                    variant="outlined" size="small" color="inherit"
                    disabled={!team.studentInfo}
                    startIcon={<RefreshCw size={13} />}
                    onClick={() => { if (confirm(`${team.name} 정보를 초기화합니까?`)) socket.emit('resetTeamInfo', team.id); }}
                  >
                    초기화
                  </Button>
                  <Button
                    variant="outlined" size="small" color="error"
                    startIcon={<Trash2 size={13} />}
                    onClick={() => { if (confirm(`${team.name}을 삭제합니까?`)) socket.emit('removeTeam', team.id); }}
                  >
                    삭제
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTeamMgmt(false)} variant="outlined" color="inherit">닫기</Button>
        </DialogActions>
      </Dialog>

      {/* ══ Category Config Modal ══ */}
      {showCategoryConfig && editingConfig && (
        <Dialog open onClose={() => setShowCategoryConfig(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle>
            <Typography sx={{ fontWeight: 800, fontSize: '1.3rem' }}>경매 설정</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'secondary.main', mt: 0.25 }}>⚠️ 적용 시 현재 경매가 초기화됩니다.</Typography>
          </DialogTitle>
          <DialogContent>
            {/* Subject Library */}
            <Box sx={{ mb: 3, p: 2, background: 'rgba(124,106,255,0.05)', border: '1px solid rgba(124,106,255,0.2)', borderRadius: 2.5 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'primary.main', letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1.25 }}>수업 라이브러리</Typography>
              {subjectsLoading ? (
                <Typography sx={{ fontSize: '0.85rem', color: 'text.disabled', mb: 1.25 }}>불러오는 중...</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.25 }}>
                  {savedSubjects.map(s => (
                    <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: '0.3rem 0.5rem 0.3rem 0.75rem', background: s.builtin ? 'rgba(124,106,255,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${s.builtin ? 'rgba(124,106,255,0.4)' : 'var(--border-default)'}`, borderRadius: 99 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: s.builtin ? 700 : 400, color: s.builtin ? 'primary.main' : 'text.primary' }}>{s.name}</Typography>
                      {s.builtin && <Typography sx={{ fontSize: '0.68rem', color: 'primary.main', opacity: 0.65 }}>기본</Typography>}
                      <Button size="small" variant="outlined" color="success" onClick={() => handleLoadSubject(s)}
                        sx={{ py: 0.25, px: 0.75, fontSize: '0.72rem', minHeight: 0, height: 24 }}>불러오기</Button>
                      {!s.builtin && (
                        <IconButton size="small" onClick={() => handleDeleteSubject(s.id, s.name)} sx={{ p: 0.25, color: 'text.disabled' }}>
                          <X size={12} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', borderTop: '1px solid var(--border-subtle)', pt: 1.25 }}>
                <TextField
                  size="small" fullWidth
                  value={subjectSaveName}
                  onChange={e => setSubjectSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSubject()}
                  placeholder="현재 설정을 이름 붙여 저장..."
                />
                <Button variant="outlined" color="primary" onClick={handleSaveSubject} sx={{ whiteSpace: 'nowrap' }}>저장</Button>
              </Box>
            </Box>

            {/* Game Rules */}
            {editingGameConfig && (
              <Box sx={{ mb: 3, p: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-default)', borderRadius: 2.5 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>게임 규칙</Typography>
                <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: '160px' }}>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 600, mb: 0.75 }}>모둠 초기 코인</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        type="number" size="small"
                        inputProps={{ min: 100, max: 99999, step: 50 }}
                        value={editingGameConfig.initialBudget}
                        onChange={e => setEditingGameConfig(g => ({ ...g, initialBudget: parseInt(e.target.value, 10) || g.initialBudget }))}
                        sx={{ width: 120, '& input': { fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, textAlign: 'right' } }}
                      />
                      <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled' }}>코인</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: '160px' }}>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 600, mb: 0.75 }}>최소 입찰 단위</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        select size="small"
                        value={editingGameConfig.bidUnit}
                        onChange={e => setEditingGameConfig(g => ({ ...g, bidUnit: parseInt(e.target.value, 10) }))}
                        SelectProps={{ native: true }}
                        sx={{ '& select': { fontFamily: 'JetBrains Mono,monospace', fontWeight: 700 } }}
                      >
                        {[10, 25, 50, 100, 200].map(v => <option key={v} value={v}>{v}</option>)}
                      </TextField>
                      <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled' }}>코인 단위</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Categories */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              {editingConfig.map((cat, ci) => {
                const col = getCatColor(ci);
                return (
                  <Box key={cat.id} sx={{ border: `1px solid rgba(${hexToRgb(col)},0.3)`, borderRadius: 2.5, overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.25, background: `rgba(${hexToRgb(col)},0.1)`, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: col, minWidth: '60px' }}>카테고리 {ci + 1}</Typography>
                      <TextField
                        size="small" fullWidth
                        value={cat.name}
                        onChange={e => { const n = [...editingConfig]; n[ci] = { ...n[ci], name: e.target.value }; setEditingConfig(n); }}
                        placeholder="카테고리 이름"
                        sx={{ '& input': { fontWeight: 700 } }}
                      />
                      <IconButton size="small" onClick={() => { if (editingConfig.length <= 1) { alert('최소 1개 필요'); return; } setEditingConfig(editingConfig.filter((_,i) => i !== ci)); }} sx={{ color: 'error.main' }}>
                        <Trash2 size={16} />
                      </IconButton>
                    </Box>
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {cat.items.map((item, ii) => (
                        <Box key={ii} sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', minWidth: '20px', textAlign: 'right' }}>{ii + 1}.</Typography>
                          <TextField
                            size="small" fullWidth
                            value={item}
                            onChange={e => { const n = [...editingConfig]; const its = [...n[ci].items]; its[ii] = e.target.value; n[ci] = { ...n[ci], items: its }; setEditingConfig(n); }}
                            placeholder="항목 내용"
                          />
                          <IconButton size="small" onClick={() => { if (cat.items.length <= 1) { alert('최소 1개 필요'); return; } const n = [...editingConfig]; n[ci] = { ...n[ci], items: n[ci].items.filter((_,i) => i !== ii) }; setEditingConfig(n); }} sx={{ color: 'text.disabled' }}>
                            <X size={14} />
                          </IconButton>
                        </Box>
                      ))}
                      <Button
                        variant="outlined" size="small" fullWidth
                        startIcon={<PlusCircle size={13} />}
                        onClick={() => { const n = [...editingConfig]; n[ci] = { ...n[ci], items: [...n[ci].items, ''] }; setEditingConfig(n); }}
                        sx={{ borderStyle: 'dashed', borderColor: `rgba(${hexToRgb(col)},0.4)`, color: col, mt: 0.25 }}
                      >
                        항목 추가
                      </Button>
                    </Box>
                  </Box>
                );
              })}
              <Button
                variant="outlined" fullWidth
                startIcon={<PlusCircle size={15} />}
                onClick={() => setEditingConfig([...editingConfig, { id: `cat_${Date.now()}`, name: '새 카테고리', items: [''] }])}
                sx={{ borderStyle: 'dashed', borderColor: 'var(--border-strong)', color: 'text.secondary' }}
              >
                카테고리 추가
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setShowCategoryConfig(false)} variant="outlined" color="inherit">취소</Button>
            <Button onClick={handleApplyCategoryConfig} variant="contained" color="secondary">적용하기</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
