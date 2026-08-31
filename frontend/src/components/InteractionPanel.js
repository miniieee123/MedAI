import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedInteraction, setFormMode } from '../store/interactionsSlice';
import { setActiveTab } from '../store/uiSlice';
import { outcomeClass } from '../utils/helpers';

export default function InteractionPanel({ interactions }) {
  const dispatch = useDispatch();
  const { selectedInteraction } = useSelector(s => s.interactions);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => interactions.filter(i =>
    !search || i.hcp_name?.toLowerCase().includes(search.toLowerCase()) || i.notes?.toLowerCase().includes(search.toLowerCase())
  ), [interactions, search]);

  const handleSelect = (interaction) => {
    dispatch(setSelectedInteraction(interaction));
    dispatch(setFormMode('edit'));
    dispatch(setActiveTab('form'));
  };

  return (
    <div className="card interaction-list" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="card-header">
        <span className="card-title">Recent Interactions</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{interactions.length} total</span>
      </div>
      <div className="list-header" style={{ paddingBottom: 8 }}>
        <input
          className="list-search"
          placeholder="Search by HCP or notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="list-items" style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div className="empty-state">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <h3>No interactions yet</h3>
            <p>Log your first HCP interaction above</p>
          </div>
        )}
        {filtered.map(item => (
          <div
            key={item.id}
            className={`interaction-item ${selectedInteraction?.id === item.id ? 'selected' : ''}`}
            onClick={() => handleSelect(item)}
          >
            <div className="item-top">
              <span className="item-hcp">{item.hcp_name}</span>
              <span className="item-date">
                {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span className="item-type" style={{ textTransform: 'capitalize' }}>{item.interaction_type}</span>
              <span className={`outcome-badge ${outcomeClass(item.outcome)}`}>
                {item.outcome?.replace(/_/g, ' ')}
              </span>
              {item.sentiment_score !== null && item.sentiment_score !== undefined && (
                <span style={{ fontSize: 10, color: item.sentiment_score >= 0.7 ? 'var(--success)' : item.sentiment_score >= 0.4 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600, marginLeft: 'auto' }}>
                  {Math.round(item.sentiment_score * 100)}%
                </span>
              )}
            </div>
            <div className="item-notes">{item.summary || item.notes}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
