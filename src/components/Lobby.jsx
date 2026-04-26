import { useState } from 'react';
import { Gavel, Users, ChevronLeft, Hash, ArrowRight } from 'lucide-react';

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'var(--bg-base)',
  },
  wrap: {
    width: '100%',
    maxWidth: '440px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoRing: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'var(--violet-dim)',
    border: '1px solid rgba(124,106,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: 'var(--text-1)',
    margin: '0 0 0.3rem 0',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-2)',
    margin: 0,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: '2rem',
    boxShadow: 'var(--shadow-lg)',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-1)',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  roleCard: (active) => ({
    width: '100%',
    padding: '1.25rem 1rem',
    background: active ? 'var(--violet-dim)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? 'rgba(124,106,255,0.5)' : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'all 0.18s',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'left',
    color: 'var(--text-1)',
    fontFamily: 'Inter, sans-serif',
  }),
  roleIcon: (color) => ({
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-md)',
    background: `rgba(${color},0.15)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    marginBottom: '0.75rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--text-2)',
  },
  row: {
    display: 'flex',
    gap: '0.5rem',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    background: 'none',
    border: 'none',
    color: 'var(--text-2)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    padding: '0.25rem 0',
    marginBottom: '1.25rem',
    fontFamily: 'Inter, sans-serif',
    transition: 'color 0.15s',
  },
  codeWrap: {
    position: 'relative',
    marginBottom: '0.5rem',
  },
  errorText: {
    fontSize: '0.825rem',
    color: 'var(--rose)',
    marginTop: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  teamBtn: (connected) => ({
    padding: '0.85rem 0.75rem',
    background: connected ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${connected ? 'var(--border-subtle)' : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-md)',
    cursor: connected ? 'not-allowed' : 'pointer',
    color: connected ? 'var(--text-3)' : 'var(--text-1)',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
};

export default function Lobby({ onJoin, onRequestTeams, connectedTeams, lobbyTeams }) {
  const [step, setStep] = useState('ROLE');
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [teacherPin, setTeacherPin] = useState('');
  const [teacherGrade, setTeacherGrade] = useState('');
  const [teacherClassNum, setTeacherClassNum] = useState('');

  const [sessionCode, setSessionCode] = useState('');
  const [sessionCodeError, setSessionCodeError] = useState('');
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [members, setMembers] = useState(['', '', '', '']);

  const handleTeacherJoin = () => {
    if (!teacherGrade || !teacherClassNum) { alert('학년과 반을 모두 입력하세요.'); return; }
    if (!teacherPin) { alert('비밀번호를 입력하세요.'); return; }
    onJoin('teacher', null, { grade: teacherGrade, classNum: teacherClassNum }, teacherPin);
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

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Logo */}
        <div style={S.header}>
          <div style={S.logoRing}>
            <Gavel size={28} color="var(--violet)" strokeWidth={2.5} />
          </div>
          <h1 style={S.title}>가족문화 경매소</h1>
          <p style={S.subtitle}>역할극 기반 실시간 경매 플랫폼</p>
        </div>

        <div style={S.card}>

          {/* ── STEP: 역할 선택 ── */}
          {step === 'ROLE' && (
            <>
              <p style={{ ...S.sectionTitle, fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500, margin: '0 0 1.25rem' }}>
                역할을 선택하세요
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  style={S.roleCard(false)}
                  onClick={() => setStep('TEACHER')}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,106,255,0.4)'; e.currentTarget.style.background = 'var(--violet-dim)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <div style={S.roleIcon('124,106,255')}>
                    <Gavel size={22} color="var(--violet)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>교사 (재판장)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>경매를 시작하고 관리합니다</div>
                  </div>
                  <ArrowRight size={18} color="var(--text-3)" />
                </button>

                <button
                  style={S.roleCard(false)}
                  onClick={() => setStep('SESSION_CODE')}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; e.currentTarget.style.background = 'var(--sky-dim)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <div style={S.roleIcon('56,189,248')}>
                    <Users size={22} color="var(--sky)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>학생 (모둠)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>세션 코드로 경매에 참여합니다</div>
                  </div>
                  <ArrowRight size={18} color="var(--text-3)" />
                </button>
              </div>
            </>
          )}

          {/* ── STEP: 교사 입장 ── */}
          {step === 'TEACHER' && (
            <>
              <button style={S.backBtn} onClick={() => setStep('ROLE')}>
                <ChevronLeft size={16} /> 뒤로
              </button>
              <p style={S.sectionTitle}><Gavel size={18} color="var(--violet)" /> 교사로 입장</p>

              <div style={S.fieldGroup}>
                <span style={S.label}>학년 / 반</span>
                <div style={S.row}>
                  <input className="input-field" type="number" placeholder="학년" value={teacherGrade}
                    onChange={e => setTeacherGrade(e.target.value)} min="1" max="9" autoFocus style={{ textAlign: 'center' }} />
                  <input className="input-field" type="number" placeholder="반" value={teacherClassNum}
                    onChange={e => setTeacherClassNum(e.target.value)} min="1" max="20" style={{ textAlign: 'center' }} />
                </div>
              </div>

              <div style={S.fieldGroup}>
                <span style={S.label}>비밀번호</span>
                <input className="input-field" type="password" placeholder="교사 PIN 입력" value={teacherPin}
                  onChange={e => setTeacherPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTeacherJoin()} />
              </div>

              <button
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem', background: 'var(--violet)', color: '#fff', border: '1px solid var(--violet)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.18s', boxShadow: '0 2px 8px rgba(124,106,255,0.3)' }}
                onClick={handleTeacherJoin}
                onMouseEnter={e => { e.currentTarget.style.background = '#6a58f0'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,106,255,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--violet)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(124,106,255,0.3)'; }}
              >
                세션 시작 <ArrowRight size={18} />
              </button>
            </>
          )}

          {/* ── STEP: 세션 코드 입력 ── */}
          {step === 'SESSION_CODE' && (
            <>
              <button style={S.backBtn} onClick={() => setStep('ROLE')}>
                <ChevronLeft size={16} /> 뒤로
              </button>
              <p style={S.sectionTitle}><Hash size={18} color="var(--sky)" /> 세션 코드 입력</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                교사(재판장) 화면에 표시된 6자리 코드를 입력하세요.
              </p>

              <div style={S.fieldGroup}>
                <input
                  className="input-field"
                  type="text"
                  value={sessionCode}
                  onChange={e => { setSessionCode(e.target.value.toUpperCase()); setSessionCodeError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSessionCodeSubmit()}
                  placeholder="AB3X7K"
                  maxLength={6}
                  autoFocus
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2rem', fontWeight: 700, textAlign: 'center', letterSpacing: '0.3em', padding: '1rem' }}
                />
                {sessionCodeError && <p style={S.errorText}>{sessionCodeError}</p>}
              </div>

              <button
                style={{ width: '100%', padding: '0.85rem', background: 'var(--sky)', color: '#071520', border: '1px solid var(--sky)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.18s' }}
                onClick={handleSessionCodeSubmit}
                onMouseEnter={e => e.currentTarget.style.background = '#29aae8'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--sky)'}
              >
                모둠 목록 불러오기 <ArrowRight size={18} />
              </button>
            </>
          )}

          {/* ── STEP: 모둠 선택 ── */}
          {step === 'TEAM_SELECT' && (
            <>
              <button style={S.backBtn} onClick={() => setStep('SESSION_CODE')}>
                <ChevronLeft size={16} /> 코드 재입력
              </button>
              <p style={S.sectionTitle}><Users size={18} color="var(--sky)" /> 우리 모둠 선택</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
                모둠별로 대표 기기 1대만 접속해야 합니다.
              </p>

              {lobbyTeams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-2)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
                  <div style={{ fontSize: '0.9rem' }}>교사가 아직 세션을 시작하지 않았거나<br />코드가 올바르지 않습니다.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {lobbyTeams.map(team => {
                    const connected = connectedTeams?.includes(team.id);
                    return (
                      <button
                        key={team.id}
                        style={S.teamBtn(connected)}
                        disabled={connected}
                        onClick={() => { setSelectedTeam(team); setStep('TEAM_INFO'); }}
                        onMouseEnter={e => { if (!connected) { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; e.currentTarget.style.background = 'var(--sky-dim)'; } }}
                        onMouseLeave={e => { if (!connected) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                      >
                        <span>{team.name}</span>
                        {connected
                          ? <span style={{ fontSize: '0.7rem', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />접속중</span>
                          : <ArrowRight size={14} color="var(--text-3)" />
                        }
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── STEP: 모둠원 정보 입력 ── */}
          {step === 'TEAM_INFO' && selectedTeam && (
            <>
              <button style={S.backBtn} onClick={() => { setStep('TEAM_SELECT'); setSelectedTeam(null); }}>
                <ChevronLeft size={16} /> 모둠 선택으로
              </button>

              <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'var(--sky-dim)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--sky)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>선택한 모둠</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-1)' }}>{selectedTeam.name}</div>
              </div>

              <div style={S.fieldGroup}>
                <span style={S.label}>학년 / 반</span>
                <div style={S.row}>
                  <input className="input-field" type="number" placeholder="학년" value={grade}
                    onChange={e => setGrade(e.target.value)} min="1" max="9" autoFocus style={{ textAlign: 'center' }} />
                  <input className="input-field" type="number" placeholder="반" value={classNum}
                    onChange={e => setClassNum(e.target.value)} min="1" max="20" style={{ textAlign: 'center' }} />
                </div>
              </div>

              <div style={S.fieldGroup}>
                <span style={S.label}>모둠원 이름</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  {members.map((m, i) => (
                    <input key={i} className="input-field" type="text" placeholder={`모둠원 ${i + 1}`}
                      value={m} onChange={e => handleMemberChange(i, e.target.value)} maxLength={10} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                  <button
                    onClick={() => setMembers([...members, ''])}
                    style={{ flex: 1, padding: '0.4rem', background: 'transparent', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Inter,sans-serif' }}
                  >+ 추가</button>
                  {members.length > 1 && (
                    <button
                      onClick={() => setMembers(members.slice(0, -1))}
                      style={{ flex: 1, padding: '0.4rem', background: 'transparent', border: '1px dashed rgba(248,113,113,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--rose)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Inter,sans-serif' }}
                    >- 빼기</button>
                  )}
                </div>
              </div>

              <button
                style={{ width: '100%', marginTop: '0.25rem', padding: '0.85rem', background: 'var(--sky)', color: '#071520', border: '1px solid var(--sky)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.18s' }}
                onClick={handleTeamJoin}
                onMouseEnter={e => e.currentTarget.style.background = '#29aae8'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--sky)'}
              >
                {selectedTeam.name}으로 입장 <ArrowRight size={18} />
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
