import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Gate from './components/Gate.jsx';
import './index.css';
import { reduceMotion } from './motion/scroll.js';

// content below the hero starts hidden and reveals as you scroll, but only when motion is welcome
// (and only once this script runs, so the page never stays blank without it)
if (!reduceMotion) document.documentElement.classList.add('motion');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Gate>
      <App />
    </Gate>
  </React.StrictMode>,
);
