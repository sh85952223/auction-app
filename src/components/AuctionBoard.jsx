import { Box, Typography, Card, CardContent, Grid } from '@mui/material';

const CAT_COLORS = [
  { text: '#7c6aff', bg: 'rgba(124,106,255,0.1)', border: 'rgba(124,106,255,0.25)' },
  { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
  { text: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  { text: '#a599ff', bg: 'rgba(165,153,255,0.1)', border: 'rgba(165,153,255,0.25)' },
  { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)'  },
  { text: '#fca5a5', bg: 'rgba(252,165,165,0.1)', border: 'rgba(252,165,165,0.25)' },
];

function getCat(i) { return CAT_COLORS[i % CAT_COLORS.length]; }

export default function AuctionBoard({ gameState, selectedItemId, onSelectItem, isTeacher }) {
  const categories = (gameState.categoryConfig || []).map(c => ({ id: c.id, name: c.name }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {categories.map((cat, catIdx) => {
        const col = getCat(catIdx);
        const catItems = gameState.items.filter(i => i.category === cat.id);

        return (
          <Box
            key={cat.id}
            sx={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 2.5,
              overflow: 'hidden',
            }}
          >
            {/* Category header */}
            <Box
              sx={{
                px: 2, py: 1.25,
                background: col.bg,
                borderBottom: `1px solid ${col.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 10, height: 10,
                  borderRadius: '50%',
                  background: col.text,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${col.text}`,
                }}
              />
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: col.text, letterSpacing: '0.02em' }}>
                {cat.name}
              </Typography>
              <Typography sx={{ ml: 'auto', fontSize: '0.75rem', color: col.text, opacity: 0.7 }}>
                {catItems.filter(i => i.isSold).length}/{catItems.length} 낙찰
              </Typography>
            </Box>

            {/* Items grid */}
            <Box sx={{ p: 1.5 }}>
              <Grid container spacing={1}>
                {catItems.map(item => {
                  const isActive = selectedItemId === item.id || gameState.currentAuctionItemId === item.id;
                  const canSelect = isTeacher && !item.isSold && gameState.auctionPhase === 'WAITING';

                  return (
                    <Grid item key={item.id} xs={6} sm={4} md={3}>
                      <Card
                        onClick={() => canSelect && onSelectItem(item.id)}
                        sx={{
                          border: `1px solid ${isActive ? col.text : item.isSold ? 'var(--border-subtle)' : 'var(--border-default)'}`,
                          background: isActive ? col.bg : item.isSold ? 'transparent' : 'rgba(255,255,255,0.02)',
                          cursor: canSelect ? 'pointer' : 'default',
                          opacity: item.isSold ? 0.5 : 1,
                          boxShadow: isActive ? `0 0 16px ${col.border}` : 'none',
                          transform: isActive ? 'scale(1.02)' : 'scale(1)',
                          transition: 'all 0.15s',
                          '&:hover': canSelect ? {
                            borderColor: col.text,
                            background: col.bg,
                            transform: 'translateY(-2px)',
                          } : {},
                        }}
                      >
                        <CardContent sx={{ p: '0.9rem 1rem !important' }}>
                          <Typography
                            sx={{
                              fontSize: '0.875rem',
                              color: item.isSold ? 'var(--text-3)' : 'var(--text-1)',
                              fontWeight: 500,
                              lineHeight: 1.4,
                              wordBreak: 'keep-all',
                              mb: 0.75,
                            }}
                          >
                            {item.name}
                          </Typography>

                          {item.isSold ? (
                            <Box>
                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)', mb: 0.25 }}>
                                {gameState.teams.find(t => t.id === item.winner)?.name}
                              </Typography>
                              <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {item.winningBid} 코인
                              </Typography>
                            </Box>
                          ) : isActive ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: col.text, animation: 'pulse-glow 1.5s infinite' }} />
                              <Typography sx={{ fontSize: '0.75rem', color: col.text, fontWeight: 600 }}>진행 중</Typography>
                            </Box>
                          ) : (
                            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>대기 중</Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
