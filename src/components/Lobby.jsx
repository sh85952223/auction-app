import React, { useState } from 'react';
import { Gavel } from 'lucide-react';

export default function Lobby({ onJoin, connectedTeams, teams }) {
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [members, setMembers] = useState(['', '', '', '']);
  const [teacherPin, setTeacherPin] = useState('');
  const [teacherGrade, setTeacherGrade] = useState('');
  const [teacherClassNum, setTeacherClassNum] = useState('');
  const [showTeacherPin, setShowTeacherPin] = useState(false);

  const handleTeacherJoin = () => {
    if (!showTeacherPin) {
      setShowTeacherPin(true);
      return;
    }
    if (!teacherGrade || !teacherClassNum) {
      alert("진행할 학년과 반을 모두 입력하세요.");
      return;
    }
    if (!teacherPin) {
      alert("비밀번호를 입력하세요.");
      return;
    }
    const classInfo = { grade: teacherGrade, classNum: teacherClassNum };
    onJoin('teacher', null, classInfo, teacherPin);
  };

  const handleMemberChange = (index, value) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleTeamJoin = (teamId) => {
    const validMembers = members.map(m => m.trim()).filter(m => m.length > 0).join(', ');
    if (!grade || !classNum || !validMembers) {
      alert("학년, 반, 모둠원 이름을 최소 1명 이상 입력해주세요.");
      return;
    }
    const studentInfo = { grade, classNum, members: validMembers };
    onJoin('team', teamId, studentInfo);
  };

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '80vh', padding: '2rem' }}>
      <div className="panel text-center" style={{ maxWidth: '800px', width: '100%' }}>
        <Gavel size={64} className="gold-text mx-auto" style={{ marginBottom: '1rem' }} />
        <h1 className="gold-text" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>가족문화 역할극 경매소</h1>
        <p style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '2rem' }}>귀하의 역할을 선택해 주십시오.</p>
        
        <div className="flex flex-col gap-6">
          {!showTeacherPin ? (
            <button 
              className="btn-primary" 
              onClick={handleTeacherJoin}
              style={{ padding: '1rem', fontSize: '1.3rem', width: '100%' }}
            >
              교사 (재판장) 입장
            </button>
          ) : (
            <div className="flex flex-col gap-3" style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1.5rem', border: '1px solid #d4af37', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                placeholder="교사 비밀번호 (기본: 1234)" 
                value={teacherPin}
                onChange={(e) => setTeacherPin(e.target.value)}
                style={{ textAlign: 'center' }}
              />
              <button 
                className="btn-primary" 
                onClick={handleTeacherJoin}
                style={{ width: '100%' }}
              >
                확인 및 입장
              </button>
              <button 
                className="btn-primary" 
                style={{ width: '100%', backgroundColor: 'transparent', borderColor: '#aaa', color: '#aaa', marginTop: '0.2rem' }}
                onClick={() => setShowTeacherPin(false)}
              >
                뒤로 가기
              </button>
            </div>
          )}
          
          <div style={{ borderTop: '1px solid #d4af37', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <h3 className="gold-text" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>학생 (모둠) 입장</h3>
            
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="학년" 
                  value={grade} 
                  onChange={(e) => setGrade(e.target.value)}
                  style={{ textAlign: 'center', flex: 1 }}
                  min="1" max="6"
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxWidth: '400px', width: '100%' }}>
                {members.map((m, i) => (
                  <input 
                    key={i}
                    type="text" 
                    className="input-field" 
                    placeholder={`모둠원 ${i + 1} 이름`} 
                    value={m} 
                    onChange={(e) => handleMemberChange(i, e.target.value)}
                    style={{ textAlign: 'center', width: '100%' }}
                    maxLength={10}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px', width: '100%' }}>
                <button 
                  onClick={() => setMembers([...members, ''])} 
                  style={{ background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', flex: 1, transition: 'all 0.2s' }}
                >
                  + 인원 추가
                </button>
                {members.length > 1 && (
                  <button 
                    onClick={() => setMembers(members.slice(0, -1))} 
                    style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', flex: 1, transition: 'all 0.2s' }}
                  >
                    - 인원 빼기
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '0.5rem' }}>※ 모둠별로 대표 기기 1대만 접속해야 합니다.</p>
            </div>

            <div className="items-grid">
              {teams.map((team) => {
                const isConnected = connectedTeams && connectedTeams.includes(team.id);
                return (
                  <button
                    key={team.id}
                    className="btn-primary"
                    disabled={isConnected}
                    onClick={() => handleTeamJoin(team.id)}
                    style={{ 
                      backgroundColor: isConnected ? '#333' : '#2c1608',
                      borderColor: '#d4af37',
                      color: isConnected ? '#888' : '#f4ecd8'
                    }}
                  >
                    {team.name} {isConnected ? '(접속중)' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
