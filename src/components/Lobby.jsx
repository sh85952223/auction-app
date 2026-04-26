import { useState } from 'react';
import { Gavel, Users, ChevronLeft } from 'lucide-react';

// step: 'ROLE' | 'TEACHER' | 'TEAM_CLASS' | 'TEAM_SELECT' | 'TEAM_INFO'
export default function Lobby({ onJoin, onRequestTeams, connectedTeams, teams, lobbyTeams }) {
  const [step, setStep] = useState('ROLE');
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Teacher state
  const [teacherPin, setTeacherPin] = useState('');
  const [teacherGrade, setTeacherGrade] = useState('');
  const [teacherClassNum, setTeacherClassNum] = useState('');

  // Student class selection state (TEAM_CLASS step)
  const [studentGrade, setStudentGrade] = useState('');
  const [studentClassNum, setStudentClassNum] = useState('');

  // Student info state (TEAM_INFO step) — pre-filled from TEAM_CLASS
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [members, setMembers] = useState(['', '', '', '']);

  const handleTeacherJoin = () => {
    if (!teacherGrade || !teacherClassNum) {
      alert('진행할 학년과 반을 모두 입력하세요.');
      return;
    }
    if (!teacherPin) {
      alert('비밀번호를 입력하세요.');
      return;
    }
    onJoin('teacher', null, { grade: teacherGrade, classNum: teacherClassNum }, teacherPin);
  };

  const handleClassSubmit = () => {
    if (!studentGrade || !studentClassNum) {
      alert('학년과 반을 입력하세요.');
      return;
    }
    // 해당 반의 팀 목록을 서버에 요청
    onRequestTeams({ grade: studentGrade, classNum: studentClassNum });
    // TEAM_INFO에서 재입력 불필요하도록 미리 채워둠
    setGrade(studentGrade);
    setClassNum(studentClassNum);
    setStep('TEAM_SELECT');
  };

  const handleMemberChange = (index, value) => {
    const next = [...members];
    next[index] = value;
    setMembers(next);
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setStep('TEAM_INFO');
  };

  const handleTeamJoin = () => {
    const validMembers = members.map(m => m.trim()).filter(m => m.length > 0).join(', ');
    if (!grade || !classNum || !validMembers) {
      alert('학년, 반, 모둠원 이름을 최소 1명 이상 입력해주세요.');
      return;
    }
    onJoin('team', selectedTeam.id, { grade, classNum, members: validMembers });
  };

  // TEAM_SELECT에 표시할 팀 목록: 서버에서 받은 반별 팀 목록 우선, 없으면 전역 teams 사용
  const displayTeams = lobbyTeams && lobbyTeams.length > 0 ? lobbyTeams : teams;

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '80vh', padding: '1.5rem' }}>
      <div className="panel text-center" style={{ maxWidth: '640px', width: '100%' }}>
        <Gavel size={56} className="gold-text mx-auto" style={{ marginBottom: '0.75rem' }} />
        <h1 className="gold-text" style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
          가족문화 역할극 경매소
        </h1>

        {/* ── STEP 0: 역할 선택 ── */}
        {step === 'ROLE' && (
          <div style={{ marginTop: '2rem' }}>
            <p style={{ color: '#ccc', marginBottom: '2rem', fontSize: '1.1rem' }}>
              역할을 선택하세요
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                className="btn-primary"
                onClick={() => setStep('TEACHER')}
                style={{ padding: '1.2rem', fontSize: '1.3rem', width: '100%' }}
              >
                <Gavel size={22} /> 교사 (재판장)로 입장
              </button>
              <button
                className="btn-primary"
                onClick={() => setStep('TEAM_CLASS')}
                style={{ padding: '1.2rem', fontSize: '1.3rem', width: '100%', backgroundColor: '#1e3a5f', borderColor: '#60a5fa', color: '#f4ecd8' }}
              >
                <Users size={22} /> 학생 (모둠)으로 입장
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1a: 교사 입장 ── */}
        {step === 'TEACHER' && (
          <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
            <button
              onClick={() => setStep('ROLE')}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.95rem' }}
            >
              <ChevronLeft size={16} /> 역할 선택으로
            </button>
            <h3 className="gold-text" style={{ margin: '0 0 1.5rem 0', textAlign: 'center' }}>
              교사 입장
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <input
                type="number"
                className="input-field"
                placeholder="학년"
                value={teacherGrade}
                onChange={(e) => setTeacherGrade(e.target.value)}
                style={{ textAlign: 'center', flex: 1 }}
                min="1" max="6"
                autoFocus
              />
              <input
                type="number"
                className="input-field"
                placeholder="반"
                value={teacherClassNum}
                onChange={(e) => setTeacherClassNum(e.target.value)}
                style={{ textAlign: 'center', flex: 1 }}
                min="1" max="20"
              />
            </div>
            <input
              type="password"
              className="input-field"
              placeholder="교사 비밀번호"
              value={teacherPin}
              onChange={(e) => setTeacherPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTeacherJoin()}
              style={{ textAlign: 'center', marginBottom: '1rem' }}
            />
            <button className="btn-primary" onClick={handleTeacherJoin} style={{ width: '100%', padding: '1rem' }}>
              확인 및 입장
            </button>
          </div>
        )}

        {/* ── STEP 1b: 학생 — 학년/반 선택 ── */}
        {step === 'TEAM_CLASS' && (
          <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
            <button
              onClick={() => setStep('ROLE')}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.95rem' }}
            >
              <ChevronLeft size={16} /> 역할 선택으로
            </button>
            <h3 className="gold-text" style={{ margin: '0 0 1.5rem 0', textAlign: 'center' }}>
              우리 반 선택
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.2rem', textAlign: 'center' }}>
              경매에 참여 중인 학년과 반을 입력하세요
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="number"
                className="input-field"
                placeholder="학년"
                value={studentGrade}
                onChange={(e) => setStudentGrade(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClassSubmit()}
                style={{ textAlign: 'center', flex: 1 }}
                min="1" max="6"
                autoFocus
              />
              <input
                type="number"
                className="input-field"
                placeholder="반"
                value={studentClassNum}
                onChange={(e) => setStudentClassNum(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClassSubmit()}
                style={{ textAlign: 'center', flex: 1 }}
                min="1" max="20"
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleClassSubmit}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', backgroundColor: '#1e3a5f', borderColor: '#60a5fa', color: '#f4ecd8' }}
            >
              모둠 목록 불러오기
            </button>
          </div>
        )}

        {/* ── STEP 2: 모둠 선택 ── */}
        {step === 'TEAM_SELECT' && (
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={() => setStep('TEAM_CLASS')}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.95rem' }}
            >
              <ChevronLeft size={16} /> 반 선택으로
            </button>
            <h3 className="gold-text" style={{ margin: '0 0 0.5rem 0' }}>
              {studentGrade}학년 {studentClassNum}반 — 우리 모둠을 선택하세요
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              ※ 모둠별로 대표 기기 1대만 접속해야 합니다
            </p>
            {displayTeams.length === 0 ? (
              <p style={{ color: '#888', padding: '2rem' }}>
                교사가 아직 경매를 시작하지 않았거나 해당 반이 없습니다. 잠시 대기해 주세요.
              </p>
            ) : (
              <div className="items-grid">
                {displayTeams.map((team) => {
                  const isConnected = connectedTeams && connectedTeams.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      className="btn-primary"
                      disabled={isConnected}
                      onClick={() => handleTeamSelect(team)}
                      style={{
                        backgroundColor: isConnected ? '#333' : '#1e3a5f',
                        borderColor: isConnected ? '#555' : '#60a5fa',
                        color: isConnected ? '#666' : '#f4ecd8',
                        fontSize: '1.15rem',
                        padding: '1rem',
                      }}
                    >
                      {team.name}
                      {isConnected && (
                        <span style={{ fontSize: '0.8rem', color: '#4ade80', marginLeft: '0.4rem' }}>● 접속중</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: 모둠원 정보 입력 ── */}
        {step === 'TEAM_INFO' && selectedTeam && (
          <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
            <button
              onClick={() => { setStep('TEAM_SELECT'); setSelectedTeam(null); }}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.95rem' }}
            >
              <ChevronLeft size={16} /> 모둠 선택으로
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-block', padding: '0.5rem 1.5rem', backgroundColor: '#1e3a5f', border: '2px solid #60a5fa', borderRadius: '8px' }}>
                <span style={{ fontSize: '1.4rem', color: '#60a5fa', fontWeight: 'bold' }}>{selectedTeam.name}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <input
                type="number"
                className="input-field"
                placeholder="학년"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                style={{ textAlign: 'center', flex: 1 }}
                min="1" max="6"
                autoFocus
              />
              <input
                type="number"
                className="input-field"
                placeholder="반"
                value={classNum}
                onChange={(e) => setClassNum(e.target.value)}
                style={{ textAlign: 'center', flex: 1 }}
                min="1" max="20"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.8rem' }}>
              {members.map((m, i) => (
                <input
                  key={i}
                  type="text"
                  className="input-field"
                  placeholder={`모둠원 ${i + 1} 이름`}
                  value={m}
                  onChange={(e) => handleMemberChange(i, e.target.value)}
                  style={{ textAlign: 'center' }}
                  maxLength={10}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={() => setMembers([...members, ''])}
                style={{ background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
              >
                + 인원 추가
              </button>
              {members.length > 1 && (
                <button
                  onClick={() => setMembers(members.slice(0, -1))}
                  style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
                >
                  - 인원 빼기
                </button>
              )}
            </div>

            <button
              className="btn-primary"
              onClick={handleTeamJoin}
              style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', backgroundColor: '#1e3a5f', borderColor: '#60a5fa', color: '#f4ecd8' }}
            >
              <Users size={20} /> {selectedTeam.name} 으로 입장
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
