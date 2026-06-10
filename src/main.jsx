import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { supabase } from './lib/supabase';

// Global fetch interceptor to automatically attach Supabase JWT bearer token to backend API requests
const originalFetch = window.fetch;
window.fetch = async function (resource, config) {
  const url = typeof resource === 'string' ? resource : resource?.url || '';
  
  if (url.includes('http://localhost:8000/api') || url.includes('/api/')) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (token) {
        config = config || {};
        config.headers = config.headers || {};
        
        if (config.headers instanceof Headers) {
          if (!config.headers.has('Authorization')) {
            config.headers.append('Authorization', `Bearer ${token}`);
          }
        } else if (Array.isArray(config.headers)) {
          const hasAuth = config.headers.some(([key]) => key.toLowerCase() === 'authorization');
          if (!hasAuth) {
            config.headers.push(['Authorization', `Bearer ${token}`]);
          }
        } else {
          if (!config.headers['Authorization'] && !config.headers['authorization']) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }
      }
    } catch (e) {
      console.warn('[DEBUG] Fetch interceptor error:', e);
    }
  }
  
  return originalFetch(resource, config);
};

// Initialize Vercel Analytics and Speed Insights
inject();
injectSpeedInsights();

// Simple error handler to prevent blank screens
const handleError = (error) => {
  console.error('Caught error:', error);
  
  // Render a basic error message if the app fails to load
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: white; background: #0B1221; min-height: 100vh;">
        <h1>Something went wrong</h1>
        <p>The application failed to load. Please refresh the page or try again later.</p>
        <pre style="margin-top: 20px; padding: 10px; background: rgba(255,255,255,0.1); overflow: auto; max-height: 200px; border-radius: 5px;">
          ${error?.message || 'Unknown error'}\n${error?.stack || ''}
        </pre>
        <button 
          onclick="window.location.reload()" 
          style="margin-top: 20px; padding: 10px 20px; background: #00FFD1; color: #0B1221; border: none; border-radius: 5px; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    `;
  }
};

// Wrap the app rendering in a try-catch
try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  );
} catch (error) {
  handleError(error);
}

// Add global error handler
window.addEventListener('error', (event) => {
  handleError(event.error);
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  handleError(event.reason);
});


