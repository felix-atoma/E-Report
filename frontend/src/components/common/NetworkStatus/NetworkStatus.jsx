import { useState, useEffect } from 'react';
import './NetworkStatus.css';

export default function NetworkStatus() {
  const [online, setOnline]       = useState(navigator.onLine);
  const [showBack, setShowBack]   = useState(false);

  useEffect(() => {
    let timer;
    const goOnline  = () => { setOnline(true); setShowBack(true); timer = setTimeout(() => setShowBack(false), 3000); };
    const goOffline = () => { setOnline(false); setShowBack(false); clearTimeout(timer); };
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
      clearTimeout(timer);
    };
  }, []);

  if (online && !showBack) return null;

  return (
    <div className={`network-banner ${online ? 'network-banner--back' : 'network-banner--offline'}`}
         role="status" aria-live="polite">
      <span className="network-banner__icon">{online ? '✅' : '📡'}</span>
      <span>
        {online
          ? 'Connexion rétablie'
          : 'Hors ligne — données en cache disponibles'}
      </span>
    </div>
  );
}
