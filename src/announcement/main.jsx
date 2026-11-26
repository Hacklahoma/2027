// The root page (/): the plain 2027 announcement, as it was before the new site.
// The new site lives at /preview (preview/index.html → src/main.jsx).
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './announcement.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
