import React, { Component, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type BoundaryState = { error: Error | null };

class AppErrorBoundary extends Component<React.PropsWithChildren, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Friendpool render failure:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', background: '#041810', color: '#e2e8f0', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 680, margin: '40px auto', padding: 20, border: '1px solid #7f1d1d', borderRadius: 16, background: '#160d12' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fecaca' }}>Friendpool encountered an error</h1>
            <p style={{ marginTop: 12, color: '#cbd5e1' }}>The app could not finish rendering. This diagnostic message can help us fix the problem.</p>
            <pre style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#020617', color: '#fca5a5', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13 }}>{this.state.error.message || String(this.state.error)}</pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: 18, padding: '10px 16px', borderRadius: 9, background: '#00f090', color: '#041810', fontWeight: 700 }}>Reload Friendpool</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function RuntimeErrorNotice() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setMessage(event.message || 'An unexpected browser error occurred.');
      console.error('Friendpool runtime error:', event.error || event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const detail = reason instanceof Error ? reason.message : String(reason ?? 'Unknown rejection');
      setMessage(detail);
      console.error('Friendpool unhandled promise rejection:', reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!message) return null;
  return (
    <div role="alert" style={{ position: 'fixed', zIndex: 99999, inset: 'auto 12px 12px', maxHeight: '45vh', overflow: 'auto', padding: 14, borderRadius: 12, border: '1px solid #f87171', background: '#1c1014', color: '#fee2e2', font: '13px system-ui, sans-serif', overflowWrap: 'anywhere' }}>
      <strong>Friendpool runtime error</strong>
      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{message}</pre>
      <button onClick={() => setMessage('')} style={{ marginTop: 8, padding: '6px 10px', borderRadius: 7, background: '#7f1d1d', color: 'white' }}>Dismiss</button>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Friendpool could not find the root page element.');
}

createRoot(rootElement).render(
  <AppErrorBoundary>
    <App />
    <RuntimeErrorNotice />
  </AppErrorBoundary>
);
