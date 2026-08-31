import React, { useEffect, Component } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store/store';
import { fetchHCPs } from './store/hcpSlice';
import { fetchInteractions } from './store/interactionsSlice';
import { setActiveView, clearNotification } from './store/uiSlice';
import Sidebar from './components/Sidebar';
import LogInteractionScreen from './components/LogInteractionScreen';
import InteractionHistory from './components/InteractionHistory';
import Dashboard from './components/Dashboard';
import './styles/global.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 40, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-2)', marginBottom: 20 }}>{this.state.error?.message}</p>
          <button className="btn btn-primary" onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const dispatch = useDispatch();
  const { activeView, notification } = useSelector(s => s.ui);

  useEffect(() => {
    dispatch(fetchHCPs());
    dispatch(fetchInteractions());
  }, [dispatch]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => dispatch(clearNotification()), 3500);
      return () => clearTimeout(t);
    }
  }, [notification, dispatch]);

  return (
    <div className="app">
      <Sidebar activeView={activeView} setActiveView={(v) => dispatch(setActiveView(v))} />
      <div className="main-content">
        {activeView === 'log' && <LogInteractionScreen />}
        {activeView === 'history' && <InteractionHistory />}
        {activeView === 'dashboard' && <Dashboard />}
      </div>

      {notification && (
        <div className={`notification ${notification.type || 'info'}`}>
          {notification.type === 'success' && <span>✓</span>}
          {notification.type === 'error' && <span>✗</span>}
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </Provider>
  );
}
