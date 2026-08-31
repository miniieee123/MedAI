import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInteractions, deleteInteraction, setSelectedInteraction, setFormMode } from '../store/interactionsSlice';
import { setActiveView, setActiveTab, showNotification } from '../store/uiSlice';
import { outcomeClass, getSentimentIcon, getTypeIcon } from '../utils/helpers';

export default function InteractionHistory() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.interactions);
  const [search, setSearch] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterType, setFilterType] = useState('');
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'table'

  const filtered = useMemo(() => list.filter(i => {
    const matchSearch = !search ||
      i.hcp_name?.toLowerCase().includes(search.toLowerCase()) ||
      (i.notes && i.notes.toLowerCase().includes(search.toLowerCase())) ||
      (i.topic && i.topic.toLowerCase().includes(search.toLowerCase()));
    const matchOutcome = !filterOutcome || i.outcome === filterOutcome || i.outcomes?.toLowerCase() === filterOutcome;
    const matchType = !filterType || i.interaction_type === filterType;
    return matchSearch && matchOutcome && matchType;
  }), [list, search, filterOutcome, filterType]);

  const handleEdit = (interaction) => {
    dispatch(setSelectedInteraction(interaction));
    dispatch(setFormMode('edit'));
    dispatch(setActiveTab('form'));
    dispatch(setActiveView('log'));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this interaction record?')) {
      await dispatch(deleteInteraction(id));
      dispatch(showNotification({ message: 'Interaction deleted successfully', type: 'success' }));
      dispatch(fetchInteractions());
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Interaction Logs & Timeline</div>
          <div className="topbar-subtitle">{filtered.length} of {list.length} records shown</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* View switcher */}
          <div className="tab-switcher" style={{ marginRight: 8 }}>
            <button
              className={`tab-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Timeline
            </button>
            <button
              className={`tab-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Table View
            </button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => dispatch(fetchInteractions())}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          className="list-search"
          style={{ maxWidth: 280 }}
          placeholder="Search doctor, topic, notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-control" style={{ width: 150 }} value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}>
          <option value="">All Outcomes</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
          <option value="follow_up_required">Follow-up Required</option>
        </select>
        <select className="form-control" style={{ width: 150 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="visit">Visit</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="conference">Conference</option>
          <option value="webinar">Webinar</option>
        </select>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>Loading interactions...</div>}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <h3>No interactions found</h3>
            <p>Adjust your filters or log a new meeting with a doctor.</p>
          </div>
        )}

        {/* Timeline Mode */}
        {!loading && filtered.length > 0 && viewMode === 'timeline' && (
          <div className="timeline-container" style={{ position: 'relative', paddingLeft: '32px', margin: '10px 0' }}>
            {/* Vertical Line */}
            <div style={{
              position: 'absolute',
              left: '11px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              background: 'var(--border)',
              borderRadius: '1px'
            }} />

            {filtered.map((item) => (
              <div key={item.id} className="timeline-item" style={{ position: 'relative', marginBottom: '24px', animation: 'slideUp 0.3s ease' }}>
                
                {/* Type Bullet Circle */}
                <div style={{
                  position: 'absolute',
                  left: '-32px',
                  top: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: `2px solid ${item.outcome === 'positive' ? 'var(--success)' : item.outcome === 'negative' ? 'var(--danger)' : 'var(--primary)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  zIndex: 2,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {getTypeIcon(item.interaction_type)}
                </div>

                {/* Timeline Card */}
                <div className="card" style={{ padding: '16px 20px' }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{item.hcp_name}</h4>
                        <span className={`outcome-badge ${outcomeClass(item.outcome)}`}>{item.outcome || 'neutral'}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--bg)', color: 'var(--primary)', fontWeight: 600 }}>
                          {item.interaction_type?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                        📅 {item.date || 'No Date'} | ⏰ {item.time || 'No Time'} | 👥 Attendees: {item.attendees || 'None'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleEdit(item)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }} onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>AI Summary & Notes</div>
                      <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8, fontStyle: 'italic', background: 'var(--bg)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                        {item.summary || item.notes || 'No description provided.'}
                      </p>
                      
                      {item.topic && (
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8 }}>
                          <strong>Topic / Products:</strong> {item.topic}
                        </div>
                      )}
                    </div>

                    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>Interaction Metadata</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                        <div><strong>Sentiment:</strong> {getSentimentIcon(item.sentiment)} {item.sentiment || 'Neutral'}</div>
                        <div><strong>Materials Shared:</strong> {item.materials || 'None'}</div>
                        <div><strong>Samples Distributed:</strong> {item.samples || 'None'}</div>
                        
                        {item.follow_up && (
                          <div style={{ marginTop: 6, padding: '8px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(0,87,255,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <div style={{ fontWeight: 700, color: '#D97706', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              SUGGESTED FOLLOW-UP
                            </div>
                            <div style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>{item.follow_up}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Table Mode */}
        {!loading && filtered.length > 0 && viewMode === 'table' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['ID', 'HCP', 'Type', 'Date', 'Time', 'Topic', 'Sentiment', 'Outcome', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>#{item.id}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.hcp_name}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)', textTransform: 'capitalize' }}>{item.interaction_type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{item.date || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)' }}>{item.time || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{item.topic || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    {getSentimentIcon(item.sentiment)} {item.sentiment || 'Neutral'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`outcome-badge ${outcomeClass(item.outcome)}`}>{item.outcome || 'neutral'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: 6 }} onClick={() => handleEdit(item)} title="Edit">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: 'none', padding: 6 }} onClick={() => handleDelete(item.id)} title="Delete">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
