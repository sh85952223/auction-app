import React from 'react';

export default function AuctionBoard({ gameState, selectedItemId, onSelectItem, isTeacher }) {
  const categories = [
    { id: 'condition', name: '가족의 조건' },
    { id: 'atmosphere', name: '가족의 분위기 코드' },
    { id: 'scene', name: '필수 장면' }
  ];

  return (
    <div className="flex flex-col" style={{ gap: '1.5rem' }}>
      {categories.map((cat) => {
        const catItems = gameState.items.filter(i => i.category === cat.id);
        
        return (
          <div key={cat.id} className="panel">
            <h3 className="gold-text" style={{ fontSize: '1.5rem', borderBottom: '1px solid #d4af37', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: 0 }}>
              {cat.name}
            </h3>
            <div className="items-grid">
              {catItems.map(item => {
                const isSelected = selectedItemId === item.id || gameState.currentAuctionItemId === item.id;
                const activeClass = isSelected ? 'active' : '';
                const soldClass = item.isSold ? 'sold' : '';
                
                return (
                  <div 
                    key={item.id} 
                    className={`item-card ${activeClass} ${soldClass}`}
                    onClick={() => {
                        if (isTeacher && !item.isSold && gameState.auctionPhase === 'WAITING') {
                            onSelectItem(item.id);
                        }
                    }}
                    style={{ cursor: (isTeacher && !item.isSold && gameState.auctionPhase === 'WAITING') ? 'pointer' : 'default' }}
                  >
                    <div style={{ fontSize: '1.1rem', marginBottom: '1rem', minHeight: '3rem', wordBreak: 'keep-all' }}>
                      {item.name}
                    </div>
                    {item.isSold ? (
                      <div>
                        <div className="gold-text" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                          낙찰: {gameState.teams.find(t => t.id === item.winner)?.name}
                        </div>
                        <div style={{ fontSize: '1rem', marginTop: '0.5rem' }}>{item.winningBid} 코인</div>
                      </div>
                    ) : (
                      <div style={{ color: isSelected ? '#fff' : '#aaa' }}>
                        {isSelected ? '현장 진행중...' : '경매 대기중'}
                      </div>
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
