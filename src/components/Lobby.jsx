import { useState } from 'react';
import {
  Box, Paper, Button, TextField, Typography, Stack,
  ButtonBase,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Gavel, Users, ChevronLeft, Hash, ArrowRight } from 'lucide-react';

function RoleCard({ onClick, icon, title, desc }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        p: '1.25rem 1rem',
        bgcolor: 'rgba(255,255,255,0.03)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        textAlign: 'left',
        transition: 'all 0.18s',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
        },
      }}
    >
      <Box sx={{
        width: 44, height: 44, borderRadius: 1.5,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography fontWeight={700} sx={{ mb: 0.25 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{desc}</Typography>
      </Box>
      <ArrowRight size={18} color="#4a4b60" />
    </ButtonBase>
  );
}

function FieldLabel({ children }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5 }}
    >
      {children}
    </Typography>
  );
}

export default function Lobby({ onJoin, onRequestTeams, connectedTeams, lobbyTeams, showTeacherMode }) {
  const [step, setStep] = useState(showTeacherMode ? 'ROLE' : 'SESSION_CODE');
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [teacherGrade, setTeacherGrade] = useState('');
  const [teacherClassNum, setTeacherClassNum] = useState('');

  const [sessionCode, setSessionCode] = useState('');
  const [sessionCodeError, setSessionCodeError] = useState('');
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [members, setMembers] = useState(['', '', '', '']);

  const handleTeacherJoin = () => {
    if (!teacherGrade || !teacherClassNum) { alert('학년과 반을 모두 입력하세요.'); return; }
    onJoin('teacher', null, { grade: teacherGrade, classNum: teacherClassNum });
  };

  const handleSessionCodeSubmit = () => {
    const code = sessionCode.trim().toUpperCase();
    if (code.length !== 6) { setSessionCodeError('세션 코드는 6자리입니다.'); return; }
    setSessionCodeError('');
    onRequestTeams(code);
    setStep('TEAM_SELECT');
  };

  const handleMemberChange = (i, v) => {
    const next = [...members]; next[i] = v; setMembers(next);
  };

  const handleTeamJoin = () => {
    const validMembers = members.map(m => m.trim()).filter(Boolean).join(', ');
    if (!grade || !classNum || !validMembers) { alert('학년, 반, 모둠원 이름을 입력해주세요.'); return; }
    onJoin('team', selectedTeam.id, { grade, classNum, members: validMembers }, null, sessionCode.trim().toUpperCase());
  };

  const BackBtn = ({ onClick, label = '뒤로' }) => (
    <Button
      startIcon={<ChevronLeft size={16} />}
      onClick={onClick}
      color="inherit"
      size="small"
      sx={{
        color: 'text.secondary', mb: 2, pl: 0.5,
        '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
      }}
    >
      {label}
    </Button>
  );

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2.5,
      bgcolor: 'background.default',
    }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>

        {/* Logo Header */}
        <Stack alignItems="center" sx={{ mb: 4 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
            border: '1px solid',
            borderColor: (t) => alpha(t.palette.primary.main, 0.4),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mb: 1.5,
          }}>
            <Gavel size={28} color="#7c6aff" strokeWidth={2.5} />
          </Box>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.03em">
            가족문화 경매소
          </Typography>
          <Typography variant="body2" color="text.secondary">
            역할극 기반 실시간 경매 플랫폼
          </Typography>
        </Stack>

        <Paper elevation={9} sx={{ p: 4, borderRadius: '20px' }}>

          {/* ── STEP: 역할 선택 ── */}
          {step === 'ROLE' && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                역할을 선택하세요
              </Typography>

              {showTeacherMode && (
                <RoleCard
                  onClick={() => setStep('TEACHER')}
                  icon={<Gavel size={22} color="#7c6aff" />}
                  title="교사 (재판장)"
                  desc="경매를 시작하고 관리합니다"
                />
              )}

              <RoleCard
                onClick={() => setStep('SESSION_CODE')}
                icon={<Users size={22} color="#7c6aff" />}
                title="학생 (모둠)"
                desc="세션 코드로 경매에 참여합니다"
              />
            </Stack>
          )}

          {/* ── STEP: 교사 입장 ── */}
          {step === 'TEACHER' && (
            <>
              <BackBtn onClick={() => setStep('ROLE')} />

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                <Gavel size={18} color="#7c6aff" />
                <Typography fontWeight={700}>교사로 입장</Typography>
              </Stack>

              <FieldLabel>학년 / 반</FieldLabel>
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <TextField
                  fullWidth type="number" placeholder="학년"
                  value={teacherGrade}
                  onChange={e => setTeacherGrade(e.target.value)}
                  inputProps={{ min: 1, max: 9, style: { textAlign: 'center' } }}
                  autoFocus
                />
                <TextField
                  fullWidth type="number" placeholder="반"
                  value={teacherClassNum}
                  onChange={e => setTeacherClassNum(e.target.value)}
                  inputProps={{ min: 1, max: 20, style: { textAlign: 'center' } }}
                  onKeyDown={e => e.key === 'Enter' && handleTeacherJoin()}
                />
              </Stack>

              <Button
                fullWidth variant="contained" size="large"
                endIcon={<ArrowRight size={18} />}
                onClick={handleTeacherJoin}
              >
                세션 시작
              </Button>
            </>
          )}

          {/* ── STEP: 세션 코드 입력 ── */}
          {step === 'SESSION_CODE' && (
            <>
              {showTeacherMode && <BackBtn onClick={() => setStep('ROLE')} />}

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Hash size={18} color="#7c6aff" />
                <Typography fontWeight={700}>세션 코드 입력</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
                교사(재판장) 화면에 표시된 6자리 코드를 입력하세요.
              </Typography>

              <TextField
                fullWidth
                value={sessionCode}
                onChange={e => { setSessionCode(e.target.value.toUpperCase()); setSessionCodeError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSessionCodeSubmit()}
                placeholder="AB3X7K"
                inputProps={{
                  maxLength: 6,
                  style: {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '2rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    letterSpacing: '0.3em',
                    padding: '1rem',
                  },
                }}
                error={!!sessionCodeError}
                helperText={sessionCodeError}
                autoFocus
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth variant="contained" size="large"
                endIcon={<ArrowRight size={18} />}
                onClick={handleSessionCodeSubmit}
              >
                모둠 목록 불러오기
              </Button>
            </>
          )}

          {/* ── STEP: 모둠 선택 ── */}
          {step === 'TEAM_SELECT' && (
            <>
              <BackBtn onClick={() => setStep('SESSION_CODE')} label="코드 재입력" />

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Users size={18} color="#7c6aff" />
                <Typography fontWeight={700}>우리 모둠 선택</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem' }}>
                모둠별로 대표 기기 1대만 접속해야 합니다.
              </Typography>

              {lobbyTeams.length === 0 ? (
                <Box sx={{
                  textAlign: 'center', py: 4, px: 2,
                  bgcolor: 'rgba(255,255,255,0.02)',
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                }}>
                  <Typography sx={{ fontSize: '2rem', mb: 1.5 }}>⏳</Typography>
                  <Typography variant="body2" color="text.secondary">
                    교사가 아직 세션을 시작하지 않았거나<br />코드가 올바르지 않습니다.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                  {lobbyTeams.map(team => {
                    const connected = connectedTeams?.includes(team.id);
                    return (
                      <ButtonBase
                        key={team.id}
                        disabled={connected}
                        onClick={() => { setSelectedTeam(team); setStep('TEAM_INFO'); }}
                        sx={{
                          p: '0.85rem 0.75rem',
                          bgcolor: connected ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid',
                          borderColor: connected ? 'rgba(255,255,255,0.05)' : 'divider',
                          borderRadius: 1.5,
                          cursor: connected ? 'not-allowed' : 'pointer',
                          color: connected ? 'text.disabled' : 'text.primary',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: connected ? 0.6 : 1,
                          transition: 'all 0.15s',
                          '&:hover:not(.Mui-disabled)': {
                            borderColor: 'primary.main',
                            bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                          },
                        }}
                      >
                        <span>{team.name}</span>
                        {connected ? (
                          <Stack direction="row" alignItems="center" spacing={0.5}
                            sx={{ fontSize: '0.7rem', color: 'success.main' }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                            <span>접속중</span>
                          </Stack>
                        ) : (
                          <ArrowRight size={14} />
                        )}
                      </ButtonBase>
                    );
                  })}
                </Box>
              )}
            </>
          )}

          {/* ── STEP: 모둠원 정보 입력 ── */}
          {step === 'TEAM_INFO' && selectedTeam && (
            <>
              <BackBtn onClick={() => { setStep('TEAM_SELECT'); setSelectedTeam(null); }} label="모둠 선택으로" />

              <Box sx={{
                textAlign: 'center', mb: 3, p: 1.75,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                borderRadius: 2,
                border: '1px solid',
                borderColor: (t) => alpha(t.palette.primary.main, 0.2),
              }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 0.5 }}
                >
                  선택한 모둠
                </Typography>
                <Typography variant="h5" fontWeight={800}>{selectedTeam.name}</Typography>
              </Box>

              <FieldLabel>학년 / 반</FieldLabel>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  fullWidth type="number" placeholder="학년"
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  inputProps={{ min: 1, max: 9, style: { textAlign: 'center' } }}
                  autoFocus
                />
                <TextField
                  fullWidth type="number" placeholder="반"
                  value={classNum}
                  onChange={e => setClassNum(e.target.value)}
                  inputProps={{ min: 1, max: 20, style: { textAlign: 'center' } }}
                />
              </Stack>

              <FieldLabel>모둠원 이름</FieldLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mt: 0.5, mb: 1 }}>
                {members.map((m, i) => (
                  <TextField
                    key={i} size="small"
                    placeholder={`모둠원 ${i + 1}`}
                    value={m}
                    onChange={e => handleMemberChange(i, e.target.value)}
                    inputProps={{ maxLength: 10 }}
                  />
                ))}
              </Box>

              <Stack direction="row" spacing={0.75} sx={{ mb: 3 }}>
                <Button
                  fullWidth variant="outlined" size="small"
                  onClick={() => setMembers([...members, ''])}
                  sx={{ borderStyle: 'dashed', color: 'text.secondary', borderColor: 'divider' }}
                >
                  + 추가
                </Button>
                {members.length > 1 && (
                  <Button
                    fullWidth variant="outlined" size="small" color="error"
                    onClick={() => setMembers(members.slice(0, -1))}
                    sx={{ borderStyle: 'dashed' }}
                  >
                    - 빼기
                  </Button>
                )}
              </Stack>

              <Button
                fullWidth variant="contained" size="large"
                endIcon={<ArrowRight size={18} />}
                onClick={handleTeamJoin}
              >
                {selectedTeam.name}으로 입장
              </Button>
            </>
          )}

        </Paper>
      </Box>
    </Box>
  );
}
