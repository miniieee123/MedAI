import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createInteraction, updateInteraction, fetchInteractions, clearSelected, clearAutofillData } from '../store/interactionsSlice';
import { showNotification } from '../store/uiSlice';
import api from '../api/api';

const INTERACTION_TYPES = ['visit', 'call', 'email', 'conference', 'webinar', 'other'];
const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];

const defaultForm = {
  hcp_id: '',
  interaction_type: 'visit',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
  attendees: '',
  topic: '',
  materials: '',
  samples: '',
  sentiment: 'Neutral',
  outcomes: '',
  follow_up: '',
  
  // Legacy/compatibility fields
  duration_minutes: 30,
  location: '',
  products_discussed: '',
  objectives: '',
  notes: '',
  outcome: 'neutral',
  follow_up_date: '',
  follow_up_notes: '',
  samples_provided: '',
  materials_shared: '',
};

export default function LogForm() {
  const dispatch = useDispatch();
  const { list: hcps } = useSelector(s => s.hcps);
  const { selectedInteraction, formMode, autofillData, loading } = useSelector(s => s.interactions);

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Sync with selected interaction (edit mode)
  useEffect(() => {
    if (selectedInteraction && formMode === 'edit') {
      setForm({
        hcp_id: selectedInteraction.hcp_id || '',
        interaction_type: selectedInteraction.interaction_type || 'visit',
        date: selectedInteraction.date ? selectedInteraction.date.split('T')[0] : new Date().toISOString().split('T')[0],
        time: selectedInteraction.time || '',
        attendees: selectedInteraction.attendees || '',
        topic: selectedInteraction.topic || '',
        materials: selectedInteraction.materials || '',
        samples: selectedInteraction.samples || '',
        sentiment: selectedInteraction.sentiment || 'Neutral',
        outcomes: selectedInteraction.outcomes || '',
        follow_up: selectedInteraction.follow_up || '',
        
        duration_minutes: selectedInteraction.duration_minutes || 30,
        location: selectedInteraction.location || '',
        products_discussed: selectedInteraction.products_discussed || '',
        objectives: selectedInteraction.objectives || '',
        notes: selectedInteraction.notes || '',
        outcome: selectedInteraction.outcome || 'neutral',
        follow_up_date: selectedInteraction.follow_up_date ? selectedInteraction.follow_up_date.split('T')[0] : '',
        follow_up_notes: selectedInteraction.follow_up_notes || '',
        samples_provided: selectedInteraction.samples_provided || '',
        materials_shared: selectedInteraction.materials_shared || '',
      });
      if (selectedInteraction.ai_insights) {
        try { setAiInsights(JSON.parse(selectedInteraction.ai_insights)); }
        catch { setAiInsights(null); }
      }
    } else {
      setForm(defaultForm);
      setAiInsights(null);
    }
  }, [selectedInteraction, formMode]);

  // Sync with autofill events from AI Chat
  useEffect(() => {
    if (autofillData) {
      setForm(prev => ({
        ...prev,
        ...autofillData
      }));
      dispatch(clearAutofillData());
      dispatch(showNotification({ message: 'Form autofilled by AI Assistant!', type: 'success' }));
    }
  }, [autofillData, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAnalyzeAI = async () => {
    if (!form.notes) return;
    setAnalyzingAI(true);
    try {
      const res = await api.post('/agent/chat', {
        message: `Analyze these interaction notes and give me AI insights: "${form.notes}". Products discussed: ${form.topic || 'none'}. Outcome: ${form.outcomes || 'none'}.`,
        session_id: 'form_analysis',
        conversation_history: [],
      });
      if (res.data.data?.ai_insights) {
        setAiInsights(res.data.data.ai_insights);
      } else if (res.data.data?.data) {
        setAiInsights(res.data.data.data);
      }
    } catch (e) {
      console.error(e);
      dispatch(showNotification({ message: 'AI analysis failed. Using offline parsing.', type: 'info' }));
    } finally {
      setAnalyzingAI(false);
    }
  };

  const startVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      dispatch(showNotification({ message: 'Speech recognition is not supported in this browser.', type: 'error' }));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      dispatch(showNotification({ message: 'Listening... speak now.', type: 'info' }));
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setForm(prev => ({
        ...prev,
        notes: prev.notes ? `${prev.notes} ${transcript}` : transcript
      }));
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsRecording(false);
      dispatch(showNotification({ message: `Voice recording error: ${event.error}`, type: 'error' }));
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hcp_id) {
      dispatch(showNotification({ message: 'Please select an HCP', type: 'error' }));
      return;
    }
    setSaving(true);
    try {
      if (formMode === 'edit' && selectedInteraction) {
        await dispatch(updateInteraction({ id: selectedInteraction.id, data: form })).unwrap();
        dispatch(showNotification({ message: 'Interaction updated successfully!', type: 'success' }));
      } else {
        await dispatch(createInteraction(form)).unwrap();
        dispatch(showNotification({ message: 'Interaction logged successfully!', type: 'success' }));
        setForm(defaultForm);
        setAiInsights(null);
      }
      dispatch(fetchInteractions());
    } catch (err) {
      dispatch(showNotification({ message: 'Error saving interaction. Check API connection.', type: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const getSentimentColor = (score) => {
    if (score >= 0.7) return 'var(--success)';
    if (score >= 0.4) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="card-title">{formMode === 'edit' ? `Edit Interaction #${selectedInteraction?.id}` : 'New Interaction'}</span>
          {formMode === 'edit' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => dispatch(clearSelected())}>
              + New
            </button>
          )}
        </div>
        <span className="ai-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          AI-Enhanced Form
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div className="form-grid">
          {/* HCP */}
          <div className="form-group full-width">
            <label className="form-label">HCP Name <span className="required">*</span></label>
            <select className="form-control" name="hcp_id" value={form.hcp_id} onChange={handleChange} required>
              <option value="">Select Healthcare Professional...</option>
              {hcps.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.specialization || h.specialty} | {h.hospital || h.institution} (Tier {h.tier})
                </option>
              ))}
            </select>
          </div>

          {/* Type & Date */}
          <div className="form-group">
            <label className="form-label">Interaction Type</label>
            <select className="form-control" name="interaction_type" value={form.interaction_type} onChange={handleChange}>
              {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-control" name="date" value={form.date} onChange={handleChange} />
          </div>

          {/* Time & Attendees */}
          <div className="form-group">
            <label className="form-label">Time</label>
            <input type="time" className="form-control" name="time" value={form.time} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Attendees</label>
            <input type="text" className="form-control" name="attendees" value={form.attendees} onChange={handleChange} placeholder="e.g. Dr. Raj, Nurse Kelly" />
          </div>

          {/* Topics Discussed */}
          <div className="form-group full-width">
            <label className="form-label">Topics Discussed (Products)</label>
            <input type="text" className="form-control" name="topic" value={form.topic} onChange={handleChange} placeholder="e.g. Diabetes drug, Efficacy results" />
          </div>

          {/* Materials Shared & Samples Distributed */}
          <div className="form-group">
            <label className="form-label">Materials Shared</label>
            <input type="text" className="form-control" name="materials" value={form.materials} onChange={handleChange} placeholder="e.g. Brochure, efficacy report" />
          </div>
          <div className="form-group">
            <label className="form-label">Samples Distributed</label>
            <input type="text" className="form-control" name="samples" value={form.samples} onChange={handleChange} placeholder="e.g. Cardiomax 10mg x5" />
          </div>

          {/* HCP Sentiment & Outcomes */}
          <div className="form-group">
            <label className="form-label">HCP Sentiment</label>
            <select className="form-control" name="sentiment" value={form.sentiment} onChange={handleChange}>
              {SENTIMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Outcomes</label>
            <input type="text" className="form-control" name="outcomes" value={form.outcomes} onChange={handleChange} placeholder="e.g. Doctor showed high interest" />
          </div>

          {/* Follow-up Actions */}
          <div className="form-group full-width">
            <label className="form-label">Follow-up Actions</label>
            <textarea className="form-control" name="follow_up" value={form.follow_up} onChange={handleChange} placeholder="Actions to take next (e.g. send research data in 1 week)" rows={2} />
          </div>

          {/* Raw Rep notes / Transcription */}
          <div className="form-group full-width">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Raw Transcription / Notes</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Voice-to-text button */}
                <button
                  type="button"
                  className={`btn btn-secondary btn-sm ${isRecording ? 'btn-danger' : ''}`}
                  onClick={startVoiceRecording}
                  style={{ textTransform: 'none', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <svg width="12" height="12" fill={isRecording ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/>
                  </svg>
                  {isRecording ? 'Recording...' : 'Voice Log'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAnalyzeAI}
                  disabled={!form.notes || analyzingAI}
                  style={{ textTransform: 'none', fontSize: 11 }}
                >
                  {analyzingAI ? <span className="spinner" style={{ width: 10, height: 10, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} /> : '✦'}
                  {analyzingAI ? 'Analyzing...' : 'AI Analyze'}
                </button>
              </div>
            </label>
            <textarea
              className="form-control"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Record your speech using the Voice Log button or type notes manually..."
              rows={4}
            />
          </div>
        </div>

        {/* AI Insights panel */}
        {aiInsights && (
          <div className="ai-insights">
            <div className="ai-insights-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
              AI Analysis Results
            </div>
            {aiInsights.summary && (
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.6 }}>{aiInsights.summary}</p>
            )}
            {aiInsights.key_topics?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>KEY TOPICS</div>
                <div className="insight-row">
                  {aiInsights.key_topics.map((t, i) => <span key={i} className="insight-chip">{t}</span>)}
                </div>
              </div>
            )}
            {aiInsights.action_items?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>ACTION ITEMS</div>
                {aiInsights.action_items.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 3, display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--primary)' }}>→</span> {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-actions" style={{ padding: '12px 20px' }}>
        <button type="button" className="btn btn-secondary" onClick={() => { setForm(defaultForm); setAiInsights(null); dispatch(clearSelected()); }}>
          Reset
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          )}
          {formMode === 'edit' ? 'Save Changes' : 'Log Interaction'}
        </button>
      </div>
    </form>
  );
}
