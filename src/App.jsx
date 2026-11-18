import { useCallback, useState } from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Spirit from './components/Spirit.jsx';

export default function App() {
  // `ready` starts the load sequence: the night fades up and each line of the hero arrives in turn
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <div className={`site${ready ? ' ready' : ''}`}>
      <Nav />
      <main id="top">
        <Hero onReady={onReady} />
        <Spirit />
      </main>
    </div>
  );
}
