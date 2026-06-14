import React from 'react';
import axios from 'axios';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send error report to backend
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    axios.post(`${API}/api/auth/log-client-error`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
    }).catch(err => console.error('Failed to send error report to backend:', err));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#3a0000', color: '#ffc0c0', fontFamily: 'monospace', margin: '20px', borderRadius: '8px', border: '2px solid red' }}>
          <h2>React Render Exception Caught</h2>
          <p><strong>Message:</strong> {this.state.error?.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#1e0000', padding: '10px', borderRadius: '4px' }}>
            {this.state.error?.stack}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#1e0000', padding: '10px', borderRadius: '4px' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
