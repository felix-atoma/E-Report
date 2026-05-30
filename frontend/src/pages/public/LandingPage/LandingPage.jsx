import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './LandingPage.css';

const SITE_URL = 'https://e-report-frontend.vercel.app';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

/* ─── Data ──────────────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: '🧮', color: '#dbeafe', iconColor: '#1d4ed8', title: 'Calcul automatique des moyennes', desc: 'Devoir, composition, coefficients — tout est calculé instantanément. Aucune formule Excel, aucune erreur possible. Le rang de chaque élève est recalculé automatiquement à chaque saisie.' },
  { icon: '📄', color: '#dcfce7', iconColor: '#16a34a', title: 'Bulletins PDF en 1 clic', desc: 'Chaque bulletin est généré au format PDF professionnel avec le logo, les couleurs et le cachet de votre école. Prêt à imprimer ou à partager digitalement.' },
  { icon: '📱', color: '#fce7f3', iconColor: '#be185d', title: 'Envoi WhatsApp & Email', desc: 'Les parents reçoivent automatiquement le bulletin de leur enfant sur WhatsApp et par email dès la publication. Notification en temps réel, zéro distribution manuelle.' },
  { icon: '💰', color: '#fef3c7', iconColor: '#d97706', title: 'Frais scolaires intégrés', desc: 'Gérez les cotisations scolaires directement depuis la plateforme. Le bulletin est automatiquement bloqué si les frais ne sont pas réglés — plus besoin de courir après les parents.' },
  { icon: '📊', color: '#ede9fe', iconColor: '#7c3aed', title: 'Analytics & Statistiques', desc: 'Tableau de bord complet avec taux de recouvrement, progression par classe, comparatif trimestres, et suivi des bulletins publiés vs en attente.' },
  { icon: '👥', color: '#e0f2fe', iconColor: '#0369a1', title: 'Multi-rôles & accès sécurisés', desc: 'Chaque acteur a son propre espace : l\'admin gère tout, l\'enseignant saisit ses notes, l\'économe suit les paiements, le parent consulte les résultats.' },
  { icon: '☁️', color: '#f0fdf4', iconColor: '#15803d', title: 'Cloud & sauvegarde automatique', desc: 'Toutes vos données sont sauvegardées en temps réel dans le cloud. Aucun risque de fichier corrompu ou perdu. Accès depuis n\'importe quel appareil.' },
  { icon: '📥', color: '#fff7ed', iconColor: '#c2410c', title: 'Import CSV & export', desc: 'Importez vos élèves, enseignants et notes depuis Excel ou CSV en quelques secondes. Exportez les données quand vous en avez besoin.' },
  { icon: '🏆', color: '#fdf4ff', iconColor: '#9333ea', title: 'Examens blancs & palmarès', desc: 'Organisez des examens blancs, publiez les résultats et générez le palmarès de l\'établissement. Les élèves et parents y accèdent directement depuis leur portail.' },
];

const STEPS = [
  { num: '01', icon: '🏫', title: 'Inscrivez votre école', desc: 'Remplissez le formulaire d\'inscription en 2 minutes. Notre équipe valide votre demande sous 24h et active votre compte gratuitement.', detail: 'Nom de l\'école · Type d\'établissement · Niveau d\'enseignement · Contact' },
  { num: '02', icon: '⚙️', title: 'Configurez en 30 minutes', desc: 'Ajoutez vos classes, matières avec coefficients, enseignants et élèves. Personnalisez les bulletins avec le logo et les couleurs de votre école.', detail: 'Classes · Matières · Coefficients · Import CSV élèves · Logo école' },
  { num: '03', icon: '✏️', title: 'Les enseignants saisissent les notes', desc: 'Vos professeurs se connectent sur leur téléphone ou ordinateur et saisissent les notes de leurs matières. Ils signent numériquement leur fiche.', detail: 'Devoir · Composition · Appréciations · Signature numérique' },
  { num: '04', icon: '🚀', title: 'Publiez & les parents reçoivent', desc: 'L\'admin publie les bulletins en 1 clic. Chaque parent reçoit instantanément le bulletin de son enfant sur WhatsApp. Les frais impayés bloquent automatiquement l\'envoi.', detail: 'PDF auto-généré · WhatsApp · Email · Blocage frais impayés' },
];

const ROLES = [
  {
    icon: '🏫', title: 'Administrateur', color: '#1E2A78',
    desc: 'Une vision complète de votre établissement en temps réel.',
    features: ['Tableau de bord analytique complet', 'Gestion des classes, matières, enseignants', 'Création et gestion des comptes utilisateurs', 'Paramétrage des frais scolaires', 'Personnalisation des bulletins (logo, couleurs)', 'Publication des bulletins d\'un clic', 'Suivi du taux de recouvrement des frais', 'Accès aux statistiques par classe et par trimestre'],
  },
  {
    icon: '👨‍🏫', title: 'Enseignant', color: '#0369a1',
    desc: 'Saisissez les notes depuis votre téléphone, n\'importe où.',
    features: ['Saisie des notes sur mobile et desktop', 'Calcul automatique des moyennes', 'Appréciations et commentaires par élève', 'Signature numérique des fiches de notes', 'Gestion de l\'emploi du temps', 'Dépôt de cours, devoirs et quiz LMS', 'Correction des examens blancs', 'Historique de toutes ses fiches'],
  },
  {
    icon: '💼', title: 'Économe / Bursar', color: '#d97706',
    desc: 'Gérez les frais scolaires sans effort.',
    features: ['Enregistrement des paiements (TMoney, Flooz, cash)', 'Vue en temps réel des impayés par classe', 'Génération de reçus PDF', 'Suivi par cotisation et par période', 'Rapport financier exportable', 'Statistiques de recouvrement', 'Notification automatique des bulletins retenus', 'Accès multi-classe multi-établissement'],
  },
  {
    icon: '👨‍👩‍👧', title: 'Parent', color: '#15803d',
    desc: 'Restez informé de la scolarité de vos enfants en temps réel.',
    features: ['Bulletins reçus sur WhatsApp & Email', 'Portail parent accessible 24h/24', 'Suivi de la progression trimestre par trimestre', 'Historique complet de tous les bulletins', 'Paiement des frais scolaires en ligne', 'Accès aux annonces de l\'école', 'Consulter les devoirs et cours du LMS', 'Notifications instantanées'],
  },
];

const TESTIMONIALS = [
  { name: 'Directeur Kodjo A.', school: 'Collège Sainte-Marie, Lomé', text: 'Avant NovaBulletin, nous passions 5 jours à préparer les bulletins chaque trimestre. Maintenant c\'est 30 minutes. Les parents adorent recevoir les bulletins sur WhatsApp.', rating: 5, initials: 'KA' },
  { name: 'Mme Afi D.', school: 'École Primaire Les Colibris, Lomé', text: 'Le système de blocage automatique pour frais impayés a transformé notre recouvrement. Nous avons récupéré 40% de créances en un trimestre.', rating: 5, initials: 'AD' },
  { name: 'Prof. Edem K.', school: 'Lycée Technique, Kara', text: 'En tant qu\'enseignant, je saisie mes notes depuis mon téléphone entre deux cours. C\'est rapide, intuitif et je ne me souviens plus pourquoi on utilisait Excel.', rating: 5, initials: 'EK' },
  { name: 'Parent — Mme Sena F.', school: 'Parent d\'élève, Lomé', text: 'Recevoir le bulletin de ma fille sur WhatsApp le jour même, c\'est fantastique. Je suis informée instantanément et je n\'ai plus à attendre la distribution papier.', rating: 5, initials: 'SF' },
];

const FAQS = [
  { q: 'Est-ce que je dois payer pour essayer ?', a: 'Non. Utilisez NovaBulletin pendant tout un trimestre. Si vous êtes satisfait, vous payez à la fin. Sinon, vous revenez à votre ancien système. Aucun engagement, aucune carte bancaire requise.' },
  { q: 'Combien de temps faut-il pour configurer l\'école ?', a: 'Environ 30 minutes pour une école de taille moyenne. Vous pouvez importer vos élèves depuis un fichier Excel ou CSV. Notre équipe est disponible pour vous aider à chaque étape.' },
  { q: 'Les enseignants doivent-ils être formés ?', a: 'L\'interface est conçue pour être intuitive sur mobile. La plupart des enseignants maîtrisent la plateforme en moins de 10 minutes. Nous fournissons un guide de démarrage rapide.' },
  { q: 'Que se passe-t-il si un parent n\'utilise pas WhatsApp ?', a: 'NovaBulletin envoie aussi les bulletins par email. Si le parent n\'a ni WhatsApp ni email, l\'admin peut imprimer le bulletin PDF directement depuis la plateforme.' },
  { q: 'Les données de nos élèves sont-elles sécurisées ?', a: 'Oui. Toutes les données sont chiffrées, sauvegardées en temps réel sur Supabase (infrastructure cloud de niveau bancaire) et accessibles uniquement aux utilisateurs autorisés de votre école.' },
  { q: 'Peut-on personnaliser les bulletins aux couleurs de notre école ?', a: 'Absolument. Vous pouvez ajouter le logo, choisir les couleurs primaires et secondaires, et personnaliser l\'en-tête de vos bulletins depuis le module Apparence.' },
];

const COMPARISON = [
  { feature: 'Calcul des moyennes', excel: '❌ Manuel, formules', autres: '⚠️ Partiel', nova: '✅ Automatique' },
  { feature: 'Bulletins PDF', excel: '❌ Mise en page manuelle', autres: '✅ Oui', nova: '✅ En 1 clic' },
  { feature: 'Envoi WhatsApp', excel: '❌ Non', autres: '❌ Non', nova: '✅ Automatique' },
  { feature: 'Frais scolaires intégrés', excel: '❌ Séparé', autres: '⚠️ Partiel', nova: '✅ Complet + blocage' },
  { feature: 'Portail parent', excel: '❌ Non', autres: '⚠️ Basique', nova: '✅ 24h/24 + mobile' },
  { feature: 'Analytics dashboard', excel: '⚠️ Tableaux manuels', autres: '✅ Oui', nova: '✅ Temps réel' },
  { feature: 'Import CSV élèves', excel: '✅ Oui', autres: '✅ Oui', nova: '✅ Oui' },
  { feature: 'Examens blancs & palmarès', excel: '❌ Non', autres: '❌ Non', nova: '✅ Inclus' },
  { feature: 'Adapté à l\'Afrique francophone', excel: '❌ Non', autres: '❌ Non', nova: '✅ Conçu pour Togo+' },
  { feature: 'Prix', excel: '~0 (mais heures perdues)', autres: '50k–200k FCFA/mois', nova: '✅ Payez si satisfait' },
];

const STATS = [
  { value: '3 jours', label: 'de travail manuel', sub: 'éliminés chaque trimestre' },
  { value: '30 min', label: 'suffisent désormais', sub: 'pour préparer un trimestre' },
  { value: '100%', label: 'des parents informés', sub: 'le jour même de la publication' },
  { value: '0', label: 'erreur de calcul', sub: 'grâce au calcul automatique' },
];

/* ─── Animated Counter ──────────────────────────────────────────────────── */
function useCountUp(target, duration = 1500, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView) { setStarted(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    const num = parseInt(target.replace(/[^\d]/g, ''));
    if (!num) return;
    let start = 0;
    const step = num / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= num) { setCount(num); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  const display = typeof target === 'string'
    ? target.replace(/\d+/, count.toString())
    : count;

  return { display, ref };
}

/* ─── Components ────────────────────────────────────────────────────────── */
function StarRating({ n }) {
  return <div className="lp-stars">{Array.from({ length: n }).map((_, i) => <span key={i}>★</span>)}</div>;
}

function StatCard({ value, label, sub }) {
  const { display, ref } = useCountUp(value);
  return (
    <div className="lp-stat-card" ref={ref}>
      <strong>{display}</strong>
      <span>{label}</span>
      <small>{sub}</small>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-faq-item${open ? ' lp-faq-item--open' : ''}`}>
      <button className="lp-faq-q" onClick={() => setOpen(v => !v)}>
        <span>{q}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>
      {open && <div className="lp-faq-a">{a}</div>}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeRole, setActiveRole] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="lp">
      <Helmet>
        <html lang="fr" />
        <title>NovaBulletin — Logiciel de gestion scolaire pour les écoles d'Afrique</title>
        <meta name="description" content="NovaBulletin remplace Excel pour la gestion des bulletins scolaires. Calcul automatique des moyennes, bulletins PDF en 1 clic, envoi WhatsApp aux parents. Conçu pour les écoles du Togo et d'Afrique francophone." />
        <meta name="keywords" content="logiciel bulletin scolaire, gestion notes scolaires, bulletin scolaire PDF, application école Togo, gestion scolaire numérique Afrique" />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content="NovaBulletin — Logiciel de gestion scolaire pour les écoles d'Afrique" />
        <meta property="og:description" content="Fini Excel. NovaBulletin calcule les moyennes, génère les bulletins PDF et les envoie aux parents sur WhatsApp. 3 jours → 30 minutes." />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:locale" content="fr_TG" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Helmet>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <Link to="/" className="lp-nav__brand">
            <img src={logoIcon} alt="NovaBulletin" className="lp-nav__logo" />
            <span>NovaBulletin</span>
          </Link>
          <ul className={`lp-nav__links${menuOpen ? ' lp-nav__links--open' : ''}`}>
            <li><a href="#features" onClick={() => setMenuOpen(false)}>Fonctionnalités</a></li>
            <li><a href="#how" onClick={() => setMenuOpen(false)}>Comment ça marche</a></li>
            <li><a href="#roles" onClick={() => setMenuOpen(false)}>Pour qui</a></li>
            <li><a href="#comparison" onClick={() => setMenuOpen(false)}>Comparaison</a></li>
            <li><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a></li>
          </ul>
          <div className="lp-nav__ctas">
            <Link to="/login" className="lp-btn lp-btn--ghost">Se connecter</Link>
            <Link to="/register-school" className="lp-btn lp-btn--primary">Commencer gratuitement →</Link>
          </div>
          <button className="lp-nav__hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__bg" aria-hidden="true">
          <div className="lp-hero__blob lp-hero__blob--1" />
          <div className="lp-hero__blob lp-hero__blob--2" />
          <div className="lp-hero__blob lp-hero__blob--3" />
          <div className="lp-hero__grid" />
        </div>
        <div className="lp-container lp-hero__inner">
          <div className="lp-hero__text">
            <div className="lp-hero__pill">
              <span className="lp-hero__pill-dot" />
              🌍 Conçu pour les écoles d'Afrique francophone
            </div>
            <h1 className="lp-hero__title">
              Fini Excel pour vos<br />
              <span className="lp-hero__gradient">bulletins scolaires.</span>
            </h1>
            <p className="lp-hero__sub">
              NovaBulletin calcule les moyennes <strong>automatiquement</strong>, génère les bulletins PDF en <strong>1 clic</strong> et les envoie aux parents directement sur <strong>WhatsApp</strong>.<br /><br />
              Ce qui vous prenait <del>3 à 5 jours</del> ne prend désormais que <strong>30 minutes</strong>.
            </p>
            <div className="lp-hero__actions">
              <Link to="/register-school" className="lp-btn lp-btn--hero">
                Essayer ce trimestre gratuitement →
              </Link>
              <a href="#how" className="lp-btn lp-btn--outline">
                ▶ Voir comment ça marche
              </a>
            </div>
            <div className="lp-hero__trust">
              <div className="lp-hero__trust-item">✅ Essai un trimestre complet</div>
              <div className="lp-hero__trust-item">🤝 Payez seulement si satisfait</div>
              <div className="lp-hero__trust-item">❌ Sans engagement</div>
            </div>
          </div>

          <div className="lp-hero__visual">
            {/* Browser mockup */}
            <div className="lp-browser">
              <div className="lp-browser__bar">
                <div className="lp-browser__dots">
                  <span style={{background:'#ef4444'}} /><span style={{background:'#f59e0b'}} /><span style={{background:'#10b981'}} />
                </div>
                <div className="lp-browser__url">novabulletin.app/admin</div>
              </div>
              <div className="lp-browser__content">
                {/* Dashboard header */}
                <div className="lp-db__header">
                  <div>
                    <p className="lp-db__label">Tableau de bord</p>
                    <p className="lp-db__title">Trimestre 2 — 2025/2026</p>
                  </div>
                  <button className="lp-db__publish">✨ Publier les bulletins</button>
                </div>
                {/* KPI cards */}
                <div className="lp-db__kpis">
                  {[['245','Élèves','#dbeafe','#1d4ed8'],['12','Classes','#dcfce7','#16a34a'],['98%','Publiés','#fce7f3','#be185d'],['87%','Frais recouvrés','#fef3c7','#d97706']].map(([v,l,bg,col]) => (
                    <div key={l} className="lp-db__kpi" style={{'--kpi-bg':bg,'--kpi-col':col}}>
                      <strong>{v}</strong><span>{l}</span>
                    </div>
                  ))}
                </div>
                {/* Progress bars */}
                <div className="lp-db__section-title">Progression par classe</div>
                {[['6ème A',92,28],['5ème B',78,24],['Terminale C',100,18],['CM2',65,31]].map(([cls,pct,n]) => (
                  <div key={cls} className="lp-db__bar-row">
                    <span className="lp-db__bar-label">{cls}</span>
                    <div className="lp-db__bar-track">
                      <div className="lp-db__bar-fill" style={{width:`${pct}%`}} />
                    </div>
                    <span className="lp-db__bar-pct">{pct}%</span>
                    <span className="lp-db__bar-n">{n} él.</span>
                  </div>
                ))}
                {/* Recent bulletins */}
                <div className="lp-db__section-title" style={{marginTop:'0.75rem'}}>Bulletins récents</div>
                {[['Kofi M.','15.4/20','✅ Envoyé'],['Yao A.','17.2/20','✅ Envoyé'],['Ama K.','13.8/20','🔒 Frais impayés'],['Sena D.','11.5/20','✅ Envoyé']].map(([n,m,s]) => (
                  <div key={n} className="lp-db__row">
                    <div className="lp-db__avatar">{n[0]}</div>
                    <span className="lp-db__name">{n}</span>
                    <span className="lp-db__avg">{m}</span>
                    <span className={`lp-db__status ${s.includes('🔒') ? 'lp-db__status--hold' : 'lp-db__status--ok'}`}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating notification cards */}
            <div className="lp-hero__notif lp-hero__notif--wa">
              <span className="lp-notif-icon">📱</span>
              <div>
                <p><strong>WhatsApp</strong> — NovaBulletin</p>
                <p>Bulletin de Kofi reçu ✓✓</p>
                <p className="lp-notif-time">Il y a 2 min</p>
              </div>
            </div>
            <div className="lp-hero__notif lp-hero__notif--mail">
              <span className="lp-notif-icon">✉️</span>
              <div>
                <p><strong>Email</strong> envoyé à 245 parents</p>
                <p className="lp-notif-time">Trimestre 2 publié</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#stats" className="lp-hero__scroll" aria-label="Défiler">
          <div className="lp-hero__scroll-dot" />
        </a>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section className="lp-stats-section" id="stats">
        <div className="lp-container lp-stats-section__grid">
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      </section>

      {/* ── PROBLEM ────────────────────────────────────────────────────── */}
      <section className="lp-problem">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Le problème</span>
            <h2>Est-ce que cela vous ressemble ?</h2>
            <p>Des milliers d'écoles en Afrique passent encore des jours entiers sur Excel chaque trimestre.</p>
          </div>
          <div className="lp-problem__grid">
            <div className="lp-problem__pains">
              {[
                ['😰','3 à 5 jours de saisie manuelle chaque trimestre — nuits, week-ends inclus.'],
                ['💥','Une erreur dans une formule Excel passe inaperçue jusqu\'à l\'impression des bulletins.'],
                ['📭','Des bulletins papier qui se perdent, arrivent en retard ou ne sont jamais récupérés par les parents.'],
                ['💸','Aucun lien entre les bulletins et les frais scolaires — impossible de bloquer automatiquement les mauvais payeurs.'],
                ['🗂️','Des fichiers Excel éparpillés sur plusieurs ordinateurs, risques de perte et confusion des versions.'],
                ['📵','Les parents ne savent pas quand les bulletins sont disponibles — ils doivent appeler l\'école.'],
              ].map(([icon, text]) => (
                <div key={text} className="lp-pain-card">
                  <span>{icon}</span><p>{text}</p>
                </div>
              ))}
            </div>
            <div className="lp-problem__vs">
              <div className="lp-vs-card lp-vs-card--bad">
                <div className="lp-vs-card__header">😩 Avec Excel</div>
                <ul>
                  {['Saisie manuelle — heures perdues','Erreurs de formules invisibles','Papier — perte et distribution','Frais séparés — 0 automatisation','Fichiers locaux — risque de perte','Parents jamais informés en temps réel'].map(t => <li key={t}>❌ {t}</li>)}
                </ul>
              </div>
              <div className="lp-vs-arrow">
                <div className="lp-vs-arrow__line" />
                <span>VS</span>
              </div>
              <div className="lp-vs-card lp-vs-card--good">
                <div className="lp-vs-card__header">✨ Avec NovaBulletin</div>
                <ul>
                  {['Automatique — 30 min par trimestre','Calcul exact, 0 erreur possible','PDF digital + WhatsApp automatique','Frais intégrés — blocage automatique','Cloud sécurisé — zéro perte','Parents informés instantanément'].map(t => <li key={t}>✅ {t}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section className="lp-features" id="features">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Fonctionnalités</span>
            <h2>Tout ce dont votre école a besoin — en un seul outil</h2>
            <p>NovaBulletin remplace Excel, les imprimantes et les appels téléphoniques aux parents. Une plateforme complète, accessible depuis n'importe quel appareil.</p>
          </div>
          <div className="lp-features__grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feat-card">
                <div className="lp-feat-card__icon" style={{background: f.color, color: f.iconColor}}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section className="lp-how" id="how">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Comment ça marche</span>
            <h2>Opérationnel en moins d'une journée</h2>
            <p>Pas d'installation, pas de serveur à gérer, pas de formation longue. Votre école est opérationnelle en 4 étapes simples.</p>
          </div>
          <div className="lp-how__steps">
            {STEPS.map((s, i) => (
              <div key={s.num} className="lp-how__step">
                <div className="lp-how__step-num">
                  <span>{s.num}</span>
                </div>
                {i < STEPS.length - 1 && <div className="lp-how__step-line" />}
                <div className="lp-how__step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="lp-how__detail">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ──────────────────────────────────────────────────────── */}
      <section className="lp-roles" id="roles">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Pour qui ?</span>
            <h2>Une plateforme pensée pour chaque acteur</h2>
            <p>Chaque utilisateur dispose d'un espace dédié adapté à ses besoins spécifiques.</p>
          </div>
          <div className="lp-roles__tabs">
            {ROLES.map((r, i) => (
              <button
                key={r.title}
                className={`lp-roles__tab${activeRole === i ? ' lp-roles__tab--active' : ''}`}
                onClick={() => setActiveRole(i)}
                style={activeRole === i ? {'--tab-color': r.color} : {}}
              >
                {r.icon} {r.title}
              </button>
            ))}
          </div>
          <div className="lp-roles__panel">
            {ROLES.map((r, i) => (
              <div key={r.title} className={`lp-role-panel${activeRole === i ? ' lp-role-panel--active' : ''}`}>
                <div className="lp-role-panel__left">
                  <div className="lp-role-panel__icon">{r.icon}</div>
                  <h3>{r.title}</h3>
                  <p>{r.desc}</p>
                  <Link to="/register-school" className="lp-btn lp-btn--primary" style={{marginTop:'1rem',display:'inline-flex'}}>
                    Essayer gratuitement →
                  </Link>
                </div>
                <ul className="lp-role-panel__list">
                  {r.features.map(f => (
                    <li key={f}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ─────────────────────────────────────────────────── */}
      <section className="lp-comparison" id="comparison">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Comparaison</span>
            <h2>Pourquoi choisir NovaBulletin ?</h2>
            <p>Comparez NovaBulletin aux alternatives et voyez par vous-même.</p>
          </div>
          <div className="lp-comparison__wrap">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Fonctionnalité</th>
                  <th>Excel / Manuel</th>
                  <th>Autres logiciels</th>
                  <th className="lp-table__nova">
                    <img src={logoIcon} alt="" width="16" height="16" />
                    NovaBulletin
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(row => (
                  <tr key={row.feature}>
                    <td className="lp-table__feat">{row.feature}</td>
                    <td className="lp-table__bad">{row.excel}</td>
                    <td>{row.autres}</td>
                    <td className="lp-table__nova lp-table__good">{row.nova}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section className="lp-testimonials">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Témoignages</span>
            <h2>Ce que disent les écoles qui utilisent NovaBulletin</h2>
          </div>
          <div className="lp-testimonials__grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="lp-testi-card">
                <StarRating n={t.rating} />
                <p className="lp-testi-card__text">"{t.text}"</p>
                <div className="lp-testi-card__author">
                  <div className="lp-testi-card__avatar">{t.initials}</div>
                  <div>
                    <p className="lp-testi-card__name">{t.name}</p>
                    <p className="lp-testi-card__school">{t.school}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Tarif</span>
            <h2>Simple, transparent, sans risque</h2>
            <p>Un seul modèle : essayez un trimestre complet. Payez seulement si vous êtes satisfait.</p>
          </div>
          <div className="lp-pricing__cards">
            <div className="lp-pricing__card lp-pricing__card--highlight">
              <div className="lp-pricing__best">⭐ Offre unique</div>
              <h3>Essai sans engagement</h3>
              <div className="lp-pricing__price">
                <span className="lp-pricing__amount">Gratuit</span>
                <span className="lp-pricing__period">pendant 1 trimestre complet</span>
              </div>
              <p className="lp-pricing__promise">
                Utilisez toutes les fonctionnalités pendant un trimestre entier.
                Si vous êtes satisfait à la fin, vous payez. Sinon, vous revenez à Excel.
                <strong> Aucun frais. Aucune carte bancaire requise.</strong>
              </p>
              <div className="lp-pricing__includes">
                {[
                  '✅ Accès complet à toutes les fonctionnalités',
                  '✅ Nombre d\'élèves et de classes illimité',
                  '✅ Bulletins PDF avec logo de votre école',
                  '✅ Envoi WhatsApp & Email aux parents',
                  '✅ Gestion complète des frais scolaires',
                  '✅ Support WhatsApp prioritaire inclus',
                  '✅ Import/export CSV des données',
                  '✅ Formation et guide de démarrage offerts',
                ].map(i => <div key={i} className="lp-pricing__include">{i}</div>)}
              </div>
              <Link to="/register-school" className="lp-btn lp-btn--hero lp-btn--wide" style={{marginTop:'1.5rem'}}>
                Commencer maintenant — C'est gratuit →
              </Link>
              <p className="lp-pricing__sub-note">Paiement en FCFA (TMoney, Flooz, virement) — tarif communiqué à la fin du trimestre</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="lp-faq" id="faq">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Questions fréquentes</span>
            <h2>Tout ce que vous voulez savoir</h2>
          </div>
          <div className="lp-faq__list">
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
          <div className="lp-faq__cta">
            <p>Vous avez une autre question ?</p>
            <a href="mailto:felixatoma2@gmail.com" className="lp-btn lp-btn--ghost">📧 Nous contacter</a>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-cta__bg" aria-hidden="true">
          <div className="lp-cta__blob" />
        </div>
        <div className="lp-container lp-cta__inner">
          <div className="lp-cta__badge">🚀 Rejoignez les écoles qui modernisent leur gestion</div>
          <h2>Prêt à dire adieu à Excel ?</h2>
          <p>Inscrivez votre école dès aujourd'hui. Premier trimestre entièrement gratuit.<br />Payez seulement si NovaBulletin vous convient.</p>
          <div className="lp-cta__actions">
            <Link to="/register-school" className="lp-btn lp-btn--hero">
              Inscrire mon école gratuitement →
            </Link>
            <Link to="/login" className="lp-btn lp-btn--outline-white">
              Déjà inscrit ? Se connecter
            </Link>
          </div>
          <div className="lp-cta__trust">
            <span>✅ Sans engagement</span>
            <span>🔒 Données sécurisées</span>
            <span>📱 Fonctionne sur mobile</span>
            <span>🌍 Conçu pour le Togo & l'Afrique</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-footer__logo">
              <img src={logoIcon} alt="NovaBulletin" width="40" height="40" />
              <span>NovaBulletin</span>
            </div>
            <p>Le logiciel de gestion scolaire moderne conçu pour les écoles d'Afrique francophone.</p>
            <p className="lp-footer__made">Fait avec ❤️ au Togo</p>
            <a href="mailto:felixatoma2@gmail.com" className="lp-footer__email">📧 felixatoma2@gmail.com</a>
          </div>

          <div className="lp-footer__links">
            <div>
              <h4>Produit</h4>
              <a href="#features">Fonctionnalités</a>
              <a href="#how">Comment ça marche</a>
              <a href="#roles">Pour qui</a>
              <a href="#comparison">Comparaison</a>
              <a href="#pricing">Tarif</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h4>Démarrer</h4>
              <Link to="/register-school">Inscrire mon école</Link>
              <Link to="/login">Se connecter</Link>
            </div>
            <div>
              <h4>Légal</h4>
              <Link to="/legal/tos">Conditions d'utilisation</Link>
              <Link to="/legal/privacy">Politique de confidentialité</Link>
            </div>
            <div>
              <h4>Nous servons</h4>
              <span>🇹🇬 Togo</span>
              <span>🇧🇯 Bénin</span>
              <span>🇨🇮 Côte d'Ivoire</span>
              <span>🇸🇳 Sénégal</span>
              <span>🇬🇭 Ghana</span>
              <span>🇨🇲 Cameroun</span>
            </div>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <p>© {new Date().getFullYear()} NovaBulletin. Tous droits réservés.</p>
          <p>
            <Link to="/legal/tos">CGU</Link>
            <Link to="/legal/privacy">Confidentialité</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
