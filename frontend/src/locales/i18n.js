import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr/common.json';
import en from './en/common.json';

const stored = localStorage.getItem('lang');
const lng = ['fr', 'en'].includes(stored) ? stored : 'fr';

i18n
  .use(initReactI18next)
  .init({
    lng,
    fallbackLng: 'fr',
    resources: {
      fr: { common: fr },
      en: { common: en },
    },
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

export default i18n;
