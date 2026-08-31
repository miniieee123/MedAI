import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import LogForm from './LogForm';
import ChatInterface from './ChatInterface';
import InteractionPanel from './InteractionPanel';

export default function LogInteractionScreen() {
  const { list } = useSelector(s => s.interactions);
  const [showRecent, setShowRecent] = useState(false);

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Log HCP Interaction</div>
          <div className="topbar-subtitle">Enter details manually or converse with the AI Assistant side-by-side</div>
        </div>
        <div className="topbar-actions">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setShowRecent(!showRecent)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {showRecent ? 'Hide Recent Logs' : 'Show Recent Logs'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area" style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0, overflow: 'hidden', padding: '20px' }}>
        {/* Left Side: Form */}
        <div className="card" style={{ flex: '1.2', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <LogForm />
        </div>

        {/* Right Side: AI Assistant Chat */}
        <div className="card" style={{ flex: '0.8', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <ChatInterface />
        </div>

        {/* Collapsible Recent Interactions Sidebar */}
        {showRecent && (
          <div className="card" style={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0, minWidth: 0, overflow: 'hidden' }}>
            <div className="card-header">
              <span className="card-title">Recent Interactions</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <InteractionPanel interactions={list.slice(0, 20)} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
