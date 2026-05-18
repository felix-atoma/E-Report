import { useLanguage } from '../../../context/LanguageContext';
import './LanguageSwitcher.css';

const FLAG_FR = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" className="lang-switcher__flag-svg" aria-hidden="true">
    <rect width="10" height="20" fill="#002395"/>
    <rect x="10" width="10" height="20" fill="#fff"/>
    <rect x="20" width="10" height="20" fill="#ED2939"/>
  </svg>
);

const FLAG_GB = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="lang-switcher__flag-svg" aria-hidden="true">
    <clipPath id="lang-gb-clip">
      <rect width="60" height="30"/>
    </clipPath>
    <rect width="60" height="30" fill="#012169"/>
    {/* White diagonals */}
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#lang-gb-clip)"/>
    {/* Red diagonals */}
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#lang-gb-clip)"/>
    {/* White cross */}
    <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
    {/* Red cross */}
    <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
  </svg>
);

function LanguageSwitcher({ collapsed = false }) {
  const { language, setLanguage } = useLanguage();
  const next = language === 'fr' ? 'en' : 'fr';

  return (
    <button
      className={`lang-switcher${collapsed ? ' lang-switcher--icon' : ''}`}
      onClick={() => setLanguage(next)}
      title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
      aria-label={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
    >
      {language === 'fr' ? FLAG_FR : FLAG_GB}
      {!collapsed && (
        <span className="lang-switcher__label">
          {language === 'fr' ? 'FR' : 'EN'}
          <span className="lang-switcher__next"> → {next.toUpperCase()}</span>
        </span>
      )}
    </button>
  );
}

export default LanguageSwitcher;
