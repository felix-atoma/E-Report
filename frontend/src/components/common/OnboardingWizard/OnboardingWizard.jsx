import { useState } from 'react';
import { Link } from 'react-router-dom';
import './OnboardingWizard.css';

const STEPS = [
  {
    id: 'branding',
    icon: '🎨',
    title: 'Personnalisez votre école',
    desc: 'Ajoutez le logo et les couleurs de votre établissement sur les bulletins.',
    link: '/admin/branding',
    linkLabel: 'Configurer l\'apparence',
    check: () => true, // always show first
  },
  {
    id: 'class',
    icon: '🏫',
    title: 'Créez votre première classe',
    desc: 'Ex : 6ème A, Terminale C, CP1. Vous pouvez en ajouter autant que nécessaire.',
    link: '/admin/classes',
    linkLabel: 'Gérer les classes',
    check: (stats) => (stats?.classes ?? 0) === 0,
  },
  {
    id: 'subject',
    icon: '📚',
    title: 'Ajoutez les matières',
    desc: 'Maths, Français, Sciences… avec leurs coefficients respectifs.',
    link: '/admin/subjects',
    linkLabel: 'Gérer les matières',
    check: (stats) => (stats?.subjects ?? 0) === 0,
  },
  {
    id: 'teacher',
    icon: '👨‍🏫',
    title: 'Invitez vos enseignants',
    desc: 'Créez les comptes de vos professeurs. Ils recevront un code OTP par email.',
    link: '/admin/users',
    linkLabel: 'Gérer les utilisateurs',
    check: (stats) => (stats?.teachers ?? 0) === 0,
  },
  {
    id: 'student',
    icon: '🎓',
    title: 'Importez vos élèves',
    desc: 'Ajoutez les élèves un par un ou importez-les depuis un fichier CSV.',
    link: '/admin/students',
    linkLabel: 'Gérer les élèves',
    check: (stats) => (stats?.students ?? 0) === 0,
  },
  {
    id: 'fee',
    icon: '💰',
    title: 'Configurez les frais scolaires',
    desc: 'Définissez les frais de scolarité par classe. Les bulletins seront bloqués si impayés.',
    link: '/admin/fees',
    linkLabel: 'Configurer les frais',
    check: () => true,
  },
];

export default function OnboardingWizard({ stats }) {
  const dismissed = localStorage.getItem('onboarding-dismissed') === 'true';
  const [hidden, setHidden] = useState(dismissed);

  const pending = STEPS.filter((s) => s.check(stats));
  const total = STEPS.length;
  const done = total - pending.length;
  const pct = Math.round((done / total) * 100);

  // Hide if all done or manually dismissed
  if (hidden || done === total) return null;

  const dismiss = () => {
    localStorage.setItem('onboarding-dismissed', 'true');
    setHidden(true);
  };

  return (
    <div className="onboard">
      <div className="onboard__header">
        <div className="onboard__header-left">
          <span className="onboard__emoji">🚀</span>
          <div>
            <h2 className="onboard__title">Configurez votre école</h2>
            <p className="onboard__sub">{done} sur {total} étapes complétées</p>
          </div>
        </div>
        <button type="button" className="onboard__dismiss" onClick={dismiss} aria-label="Masquer">
          Masquer
        </button>
      </div>

      <div className="onboard__bar">
        <div className="onboard__bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="onboard__steps">
        {STEPS.map((step) => {
          const isDone = !step.check(stats);
          return (
            <div key={step.id} className={`onboard__step${isDone ? ' onboard__step--done' : ''}`}>
              <div className="onboard__step-check">
                {isDone
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span className="onboard__step-num">{step.icon}</span>
                }
              </div>
              <div className="onboard__step-body">
                <p className="onboard__step-title">{step.title}</p>
                <p className="onboard__step-desc">{step.desc}</p>
              </div>
              {!isDone && (
                <Link to={step.link} className="onboard__step-link">
                  {step.linkLabel} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
