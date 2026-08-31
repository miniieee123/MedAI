import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

export default function Dashboard() {
  const { list } = useSelector(s => s.interactions);
  const { list: hcps } = useSelector(s => s.hcps);

  const stats = useMemo(() => {
    const total = list.length;
    const positive = list.filter(i => i.outcome === 'positive' || i.sentiment === 'Positive').length;
    const followUps = list.filter(i => i.follow_up || i.outcome === 'follow_up_required').length;
    
    const sentimentScores = list.filter(i => i.sentiment_score != null);
    const avgSentiment = sentimentScores.reduce((sum, i) => sum + i.sentiment_score, 0) / Math.max(sentimentScores.length, 1);

    const byType = list.reduce((acc, i) => { acc[i.interaction_type] = (acc[i.interaction_type] || 0) + 1; return acc; }, {});
    const byOutcome = list.reduce((acc, i) => { 
      const out = i.outcome || 'neutral';
      acc[out] = (acc[out] || 0) + 1; 
      return acc; 
    }, {});
    
    const bySentiment = list.reduce((acc, i) => {
      const sent = i.sentiment || 'Neutral';
      acc[sent] = (acc[sent] || 0) + 1;
      return acc;
    }, { Positive: 0, Neutral: 0, Negative: 0 });

    const byHCP = list.reduce((acc, i) => { acc[i.hcp_name] = (acc[i.hcp_name] || 0) + 1; return acc; }, {});
    const topHCPs = Object.entries(byHCP).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // List of interactions with active AI follow-up suggestions
    const followUpActionables = list.filter(i => i.follow_up).slice(0, 3);

    return { total, positive, followUps, avgSentiment, byType, byOutcome, bySentiment, topHCPs, followUpActionables };
  }, [list]);

  const outcomePalette = {
    positive: 'var(--success)', 
    neutral: 'var(--text-3)', 
    negative: 'var(--danger)', 
    follow_up_required: 'var(--warning)'
  };

  // SVG Gauge calculations
  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const sentimentPercent = stats.avgSentiment || 0.55;
  const strokeDashoffset = circumference - (sentimentPercent * circumference);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Performance Dashboard</div>
          <div className="topbar-subtitle">Real-time HCP metrics, sentiment trends & follow-up planner</div>
        </div>
        <span className="ai-badge">Live Analytics</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* Stats Row */}
        <div className="stats-row" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Interactions', value: stats.total, sub: 'All time logs' },
            { label: 'Positive Outcomes', value: stats.positive, sub: `${stats.total ? Math.round(stats.positive / stats.total * 100) : 0}% Positive Rate` },
            { label: 'Pending Follow-ups', value: stats.followUps, sub: 'Require sales contact' },
            { label: 'Avg Sentiment', value: `${Math.round(sentimentPercent * 100)}%`, sub: 'AI feedback score' },
            { label: 'Doctors Engaged', value: hcps.length, sub: 'In territory' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 20, marginBottom: 20 }}>
          
          {/* Sentiment Gauge & Breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Doctor Sentiment Analysis</span>
            </div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Circular Gauge */}
              <div style={{ position: 'relative', width: 96, height: 96 }}>
                <svg width="96" height="96" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--border)" strokeWidth={strokeWidth} />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    fill="transparent" 
                    stroke="var(--primary)" 
                    strokeWidth={strokeWidth} 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(sentimentPercent * 100)}%</span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600 }}>SCORE</span>
                </div>
              </div>

              {/* Sentiment Legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Positive', count: stats.bySentiment.Positive, color: 'var(--success)' },
                  { label: 'Neutral', count: stats.bySentiment.Neutral, color: 'var(--warning)' },
                  { label: 'Negative', count: stats.bySentiment.Negative, color: 'var(--danger)' },
                ].map(item => {
                  const pct = stats.total ? Math.round((item.count / stats.total) * 100) : 0;
                  return (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                        <span>{item.label}</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>{item.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Outcome & Interaction Type Breakdown */}
          <div className="card">
            <div className="card-header"><span className="card-title">Outcome Distribution</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(stats.byOutcome).length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No data recorded</div>}
              {Object.entries(stats.byOutcome).map(([outcome, count]) => (
                <div key={outcome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{outcome.replace(/_/g, ' ')}</span>
                    <span style={{ fontWeight: 700, color: outcomePalette[outcome] }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${stats.total ? (count / stats.total) * 100 : 0}%`,
                      height: '100%',
                      background: outcomePalette[outcome] || 'var(--primary)',
                      borderRadius: 3,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Follow-up Suggestions Board */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">✦ AI Follow-up Suggestions</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px' }}>
              {stats.followUpActionables.length === 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                  No pending AI follow-up actions. Log a meeting to get suggestions.
                </div>
              )}
              {stats.followUpActionables.map(item => (
                <div 
                  key={item.id} 
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(0,87,255,0.05))',
                    border: '1px solid var(--border)',
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ color: 'var(--primary)' }}>{item.hcp_name}</strong>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>📅 {item.date}</span>
                  </div>
                  <div style={{ color: 'var(--text-2)', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "{item.follow_up}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row: Top HCPs & Activity Log */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
          
          {/* Top Engaged HCPs */}
          <div className="card">
            <div className="card-header"><span className="card-title">Top Engaged HCPs</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.topHCPs.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No data recorded</div>}
              {stats.topHCPs.map(([name, count], idx) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', 
                    background: idx === 0 ? 'rgba(0,87,255,0.12)' : 'var(--bg)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: 11, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{count} calls</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card">
            <div className="card-header"><span className="card-title">Recent Activity Feed</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              {list.length === 0 && <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13 }}>No interactions logged yet</div>}
              {list.slice(0, 4).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    {item.interaction_type === 'visit' ? '🏥' : item.interaction_type === 'call' ? '📞' : item.interaction_type === 'email' ? '📧' : '📋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.hcp_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.summary || item.notes || 'Discussed product efficacy.'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className={`outcome-badge outcome-${item.outcome || 'neutral'}`}>{item.outcome || item.sentiment || 'neutral'}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                      {item.date || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
