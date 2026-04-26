const CAT_COLORS = [
  { text: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  { text: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.25)' },
  { text: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  { text: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)' },
  { text: '#f472b6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)' },
  { text: '#facc15', bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.25)' },
];

function getCat(i) { return CAT_COLORS[i % CAT_COLORS.length]; }

export default function AuctionBoard({ gameState, selectedItemId, onSelectItem, isTeacher }) {
  const categories = (gameState.categoryConfig || []).map(c => ({ id: c.id, name: c.name }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {categories.map((cat, catIdx) => {
        const col = getCat(catIdx);
        const catItems = gameState.items.filter(i => i.category === cat.id);

        return (
          <div key={cat.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* Category header */}
            <div style={{ padding: '0.75rem 1.25rem', background: col.bg, borderBottom: `1px solid ${col.border}`, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.text, flexShrink: 0, boxShadow: `0 0 8px ${col.text}` }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: col.text, letterSpacing: '0.02em' }}>{cat.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: col.text, opacity: 0.7 }}>
                {catItems.filter(i => i.isSold).length}/{catItems.length} 낙찰
              </span>
            </div>

            {/* Items grid */}
            <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
              {catItems.map(item => {
                const isActive = selectedItemId === item.id || gameState.currentAuctionItemId === item.id;
                const canSelect = isTeacher && !item.isSold && gameState.auctionPhase === 'WAITING';

                return (
                  <div
                    key={item.id}
                    onClick={() => canSelect && onSelectItem(item.id)}
                    style={{
                      padding: '0.9rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isActive ? col.text : item.isSold ? 'var(--border-subtle)' : 'var(--border-default)'}`,
                      background: isActive ? col.bg : item.isSold ? 'transparent' : 'rgba(255,255,255,0.02)',
                      cursor: canSelect ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                      opacity: item.isSold ? 0.5 : 1,
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: isActive ? `0 0 16px ${col.border}` : 'none',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    }}
                    onMouseEnter={e => { if (canSelect) { e.currentTarget.style.borderColor = col.text; e.currentTarget.style.background = col.bg; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={e => { if (canSelect && !isActive) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.transform = 'scale(1)'; } }}
                  >
                    <div style={{ fontSize: '0.875rem', color: item.isSold ? 'var(--text-3)' : 'var(--text-1)', fontWeight: 500, lineHeight: 1.4, wordBreak: 'keep-all', marginBottom: '0.6rem' }}>
                      {item.name}
                    </div>

                    {item.isSold ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)', marginBottom: '0.15rem' }}>
                          {gameState.teams.find(t => t.id === item.winner)?.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {item.winningBid} 코인
                        </div>
                      </div>
                    ) : isActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.text, animation: 'pulse-glow 1.5s infinite' }} />
                        <span style={{ fontSize: '0.75rem', color: col.text, fontWeight: 600 }}>진행 중</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>대기 중</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
