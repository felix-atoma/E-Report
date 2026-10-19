// Page d'accueil au style du modèle « Edustage » (Colorlib, licence CC BY 3.0 : le crédit
// Colorlib du pied de page doit rester). L'ancienne page reste disponible : LandingPage.jsx.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '../../../context/LanguageContext';
import logoIcon from '../../../assets/images/edustage-icon.png';
import {
  SITE_URL, SUPPORT_EMAIL, SUPPORT_WHATSAPP, FEATURES_ROW1, FEATURES_ROW2, STEPS, FAQS, TEAM,
  FEATURES_ROW1_EN, FEATURES_ROW2_EN, STEPS_EN, FAQS_EN,
} from '../LandingPage/landingData';
import { MODULE_TABS } from './modules';
import './EdustageLanding.css';

/* Icônes au trait, comme celles du modèle */
const ICONS = [
  // calcul
  <path key="a" d="M8 6h32v36H8zM14 12h20v8H14zM14 26h4M22 26h4M30 26h4M14 33h4M22 33h4M30 33h4" />,
  // bulletin PDF
  <path key="b" d="M12 4h18l8 8v32H12zM30 4v8h8M18 22h14M18 29h14M18 36h9" />,
  // message
  <path key="c" d="M6 10h36v24H20l-9 8v-8H6zM14 20h20M14 26h12" />,
  // fiche + crayon
  <path key="d" d="M10 6h22v36H10zM16 14h10M16 21h10M16 28h6M30 34l10-10 4 4-10 10h-4z" />,
  // frais
  <path key="e" d="M6 14h36v22H6zM6 20h36M12 30h8M34 30a2 2 0 1 0 0 .1" />,
  // statistiques
  <path key="f" d="M6 42h36M12 36V24M20 36V14M28 36V20M36 36V8" />,
];
const Icon = ({ i }) => (
  <svg viewBox="0 0 48 48" className="es-icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
    {ICONS[i % ICONS.length]}
  </svg>
);

/* Photo et étiquette de chaque fonctionnalité, dans l'ordre de FEATURES_ROW1 + FEATURES_ROW2 (photos Unsplash) */
const FEATURE_PHOTOS = [
  { img: 'calcul.jpg',    tag: ['Notes', 'Marks'] },
  { img: 'bulletins.jpg', tag: ['Bulletins', 'Report cards'] },
  { img: 'whatsapp.jpg',  tag: ['Parents', 'Parents'] },
  { img: 'fiches.jpg',    tag: ['Enseignants', 'Teachers'] },
  { img: 'frais.jpg',     tag: ['Finances', 'Finance'] },
  { img: 'analytics.jpg', tag: ['Direction', 'Management'] },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`es-faq${open ? ' es-faq--open' : ''}`}>
      <button type="button" className="es-faq__q" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{q}</span><span className="es-faq__sign" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="es-faq__a">{a}</p>}
    </div>
  );
}

export default function EdustageLanding() {
  const { language, setLanguage } = useLanguage();
  const isFr = !language || language.startsWith('fr');
  const t = (fr, en) => (isFr ? fr : en);
  const features = isFr ? [...FEATURES_ROW1, ...FEATURES_ROW2] : [...FEATURES_ROW1_EN, ...FEATURES_ROW2_EN];
  const steps = isFr ? STEPS : STEPS_EN;
  const faqs = (isFr ? FAQS : FAQS_EN).slice(0, 8);

  const [menuOpen, setMenuOpen] = useState(false);
  const [moduleTab, setModuleTab] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const NAV = [
    ['#features', t('Fonctionnalités', 'Features')],
    ['#modules', t('Modules', 'Modules')],
    ['#how', t('Démarrage', 'Get started')],
    ['#classroom', t('En classe', 'Classroom')],
    ['#pricing', t('Tarif', 'Pricing')],
    ['#faq', 'FAQ'],
  ];

  const STATS = [
    ['3', t('jours', 'days'), t('de travail manuel éliminés chaque trimestre', 'of manual work removed every term')],
    ['30', 'min', t('pour préparer un trimestre', 'to prepare a term')],
    ['12', t('registres', 'registers'), t('présences, santé, bibliothèque…', 'attendance, health, library…')],
    ['100', '%', t('des parents informés le jour même', 'of parents informed the same day')],
  ];

  const PHOTOS = [
    { img: 'teacher.jpg', tag: t('Enseignants', 'Teachers'), title: t('Notes saisies et signées sur le téléphone', 'Marks entered and signed on a phone'), text: t('Chaque professeur remplit sa fiche numérique, même en classe. Moyennes et rangs se calculent tout seuls.', 'Each teacher fills in a digital sheet, even in class. Averages and ranks are calculated automatically.') },
    { img: 'student.jpg', tag: t('Élèves', 'Pupils'), title: t('Compositions et relevés suivis au jour le jour', 'Tests and report sheets tracked day by day'), text: t('Compositions mensuelles, relevés avec QR code et palmarès : tout est prêt à imprimer.', 'Monthly tests, report sheets with QR code and rankings: everything is ready to print.') },
    { img: 'admin.jpg', tag: t('Administration', 'School office'), title: t('Frais, présences et bulletins au même endroit', 'Fees, attendance and report cards in one place'), text: t('Le directeur voit en direct les bulletins publiés, les frais encaissés et les retards.', 'The head sees published report cards, collected fees and late payments live.') },
  ];

  const fmt = (n) => n.toLocaleString(isFr ? 'fr-FR' : 'en-US');
  const TIERS = [
    { name: t('50 à 199 élèves', '50 to 199 pupils'), onboarding: 20000, trimester: 75000, semester: 100000 },
    { name: t('200 élèves et plus', '200 pupils and more'), onboarding: 40000, trimester: 150000, semester: 200000 },
  ];

  const waDigits = String(SUPPORT_WHATSAPP).replace(/\D/g, '');
  const whatsappLink = `https://wa.me/${waDigits}`;
  const mailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=NovaBulletin`;

  return (
    <div className="es">
      <Helmet>
        <html lang={isFr ? 'fr' : 'en'} />
        <title>{t("NovaBulletin — Logiciel de gestion scolaire pour les écoles d'Afrique", 'NovaBulletin — School Management Software for African Schools')}</title>
        <meta name="description" content={t("NovaBulletin calcule les moyennes, génère les bulletins PDF en 1 clic et prévient les parents par WhatsApp et SMS. Conçu pour les écoles d'Afrique de l'Ouest.", 'NovaBulletin calculates averages, generates PDF report cards in 1 click and notifies parents by WhatsApp and SMS. Built for West African schools.')} />
        <link rel="canonical" href={SITE_URL} />
      </Helmet>

      {/* ─── En-tête ─────────────────────────────────────────────── */}
      <header className={`es-header${scrolled ? ' es-header--scrolled' : ''}`}>
        <div className="es-container es-header__inner">
          <Link to="/home" className="es-logo" aria-label="NovaBulletin">
            <img src={logoIcon} alt="" width="24" height="38" />
            <span>NovaBulletin</span>
          </Link>
          <button type="button" className="es-burger" onClick={() => setMenuOpen((o) => !o)} aria-label={t('Menu', 'Menu')} aria-expanded={menuOpen}>
            <span /><span /><span />
          </button>
          <nav className={`es-nav${menuOpen ? ' es-nav--open' : ''}`} onClick={() => setMenuOpen(false)}>
            <a href="#top" className="es-nav__link es-nav__link--active">{t('Accueil', 'Home')}</a>
            {NAV.map(([href, label]) => <a key={href} href={href} className="es-nav__link">{label}</a>)}
            <Link to="/installer" className="es-nav__link">📲 {t("Installer l'app", 'Install app')}</Link>
            <Link to="/login" className="es-nav__link">{t('Connexion', 'Log in')}</Link>
            <div className="es-lang" role="group" aria-label={t('Langue', 'Language')}>
              <button type="button" className={isFr ? 'is-active' : ''} onClick={() => setLanguage('fr')}>FR</button>
              <button type="button" className={!isFr ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
            </div>
          </nav>
        </div>
      </header>

      {/* ─── Bannière ────────────────────────────────────────────── */}
      <section className="es-banner" id="top">
        <div className="es-container es-banner__content">
          <p className="es-banner__eyebrow">{t("Conçu pour les écoles d'Afrique de l'Ouest", 'Built for West African schools')}</p>
          <h1>{t('Le bulletin scolaire entre dans le 21e siècle', 'Report cards enter the 21st century')}</h1>
          <p className="es-banner__lead">{t('Fini Excel : moyennes calculées automatiquement, bulletins PDF en 1 clic, parents prévenus par WhatsApp et SMS.', 'No more Excel: averages calculated automatically, PDF report cards in 1 click, parents notified by WhatsApp and SMS.')}</p>
          <div className="es-banner__btns">
            <a href="#how" className="es-btn es-btn--navy">{t('Comment ça marche', 'How it works')}</a>
            <Link to="/register-school" className="es-btn es-btn--yellow">{t('Essai gratuit 30 jours', 'Free 30-day trial')}</Link>
          </div>
        </div>
        <div className="es-banner__photo">
          <img src="/images/landing/classroom.jpg" alt={t('Élèves en uniforme dans leur salle de classe', 'Pupils in uniform in their classroom')} fetchpriority="high" decoding="async" />
        </div>
      </section>

      {/* ─── La question aux parents ─────────────────────────────── */}
      <section className="es-question">
        <div className="es-container">
          <p className="es-question__eyebrow">{t('Une question simple', 'A simple question')}</p>
          <h2>
            {t('Inscririez-vous votre enfant dans une école qui écrit encore ses bulletins ',
               'Would you enrol your child in a school that still writes its report cards ')}
            <span>{t('à la main', 'by hand')}</span>
            {t(' ou sur ', ' or on ')}
            <span>Excel</span>{t(' ?', '?')}
          </h2>
          <div className="es-question__compare">
            <div className="es-question__col es-question__col--old">
              <h3>{t('À la main ou sur Excel', 'By hand or on Excel')}</h3>
              <ul>
                <li>{t('Erreurs de calcul dans les moyennes et les rangs', 'Mistakes in averages and ranks')}</li>
                <li>{t('Des semaines d’attente après les compositions', 'Weeks of waiting after exams')}</li>
                <li>{t('Fiches perdues, bulletins faciles à falsifier', 'Lost sheets, report cards easy to forge')}</li>
                <li>{t('Les parents apprennent les résultats trop tard', 'Parents learn the results too late')}</li>
              </ul>
            </div>
            <div className="es-question__col es-question__col--new">
              <h3>{t('Avec NovaBulletin', 'With NovaBulletin')}</h3>
              <ul>
                <li>{t('Moyennes et rangs calculés sans erreur', 'Averages and ranks calculated without errors')}</li>
                <li>{t('Bulletins prêts dès que les fiches sont signées', 'Report cards ready as soon as sheets are signed')}</li>
                <li>{t('QR code de vérification sur chaque bulletin', 'A verification QR code on every report card')}</li>
                <li>{t('Parents prévenus le jour même par WhatsApp et SMS', 'Parents notified the same day by WhatsApp and SMS')}</li>
              </ul>
            </div>
          </div>
          <p className="es-question__answer">
            {t('Les parents choisissent les écoles modernes. Montrez-leur que la vôtre en fait partie.',
               'Parents choose modern schools. Show them yours is one of them.')}
          </p>
          <Link to="/register-school" className="es-btn es-btn--yellow">{t('Moderniser mon école', 'Modernise my school')}</Link>
        </div>
      </section>

      {/* ─── Fonctionnalités ─────────────────────────────────────── */}
      <section className="es-section" id="features">
        <div className="es-container">
          <div className="es-title">
            <h2>{t('Tout ce dont votre école a besoin', 'Everything your school needs')}</h2>
            <p>{t('De la saisie des notes au bulletin reçu par les parents', 'From entering marks to the report card parents receive')}</p>
          </div>
          <div className="es-grid es-grid--3">
            {features.map((f, i) => (
              <article className="es-card es-feature-card" key={f.title}>
                <div className="es-card__img">
                  <img src={`/images/landing/features/${FEATURE_PHOTOS[i].img}`} alt="" loading="lazy" decoding="async" />
                  <span className="es-feature-card__badge"><Icon i={i} /></span>
                </div>
                <div className="es-card__body">
                  <span className="es-card__tag">{t(...FEATURE_PHOTOS[i].tag)}</span>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tous les modules, par onglet ─────────────────────────── */}
      <section className="es-section es-section--tint" id="modules">
        <div className="es-container">
          <div className="es-title">
            <h2>{t('Bien plus que des bulletins', 'Much more than report cards')}</h2>
            <p>{t("Toute la vie de l'école dans une seule application", "The whole life of the school in one app")}</p>
          </div>
          <div className="es-tabs" role="tablist">
            {MODULE_TABS.map((tab, i) => (
              <button key={tab.key} type="button" role="tab" aria-selected={moduleTab === i}
                className={`es-tabs__btn${moduleTab === i ? ' is-active' : ''}`} onClick={() => setModuleTab(i)}>
                {t(...tab.label)}
              </button>
            ))}
          </div>
          <div className="es-modules" role="tabpanel">
            {MODULE_TABS[moduleTab].items.map((m) => (
              <div className="es-module" key={m.title[0]}>
                <span className="es-module__icon" aria-hidden="true">{m.icon}</span>
                <div>
                  <h4>{t(...m.title)}</h4>
                  <p>{t(...m.desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bandeau chiffres + inscription ──────────────────────── */}
      <section className="es-register">
        <div className="es-container es-register__inner">
          <div className="es-register__left">
            <h2>{t('3 jours de travail ramenés à 30 minutes', '3 days of work cut down to 30 minutes')}</h2>
            <p>{t("Chaque fin de trimestre, les écoles passent des nuits sur Excel. Avec NovaBulletin, les bulletins sont prêts dès que les fiches sont signées.", 'Every end of term, schools spend nights on Excel. With NovaBulletin, report cards are ready as soon as the grade sheets are signed.')}</p>
            <div className="es-stats">
              {STATS.map(([n, unit, label]) => (
                <div className="es-stat" key={label}>
                  <strong>{n}<small>{unit}</small></strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="es-register__card">
            <h3>{t('Inscrivez votre école', 'Register your school')}</h3>
            <p className="es-register__sub">{t('Accès immédiat, sans carte bancaire', 'Immediate access, no credit card')}</p>
            <ul>
              <li>{t('30 jours complets offerts', '30 full days free')}</li>
              <li>{t('Gratuit à vie sous 50 élèves', 'Free forever under 50 pupils')}</li>
              <li>{t('Import Excel / CSV des élèves', 'Excel / CSV pupil import')}</li>
              <li>{t('Accompagnement sur WhatsApp', 'Support on WhatsApp')}</li>
            </ul>
            <Link to="/register-school" className="es-btn es-btn--yellow es-btn--block">{t("Créer le compte de l'école", 'Create the school account')}</Link>
            <Link to="/login" className="es-register__login">{t('Déjà inscrit ? Se connecter', 'Already registered? Log in')}</Link>
          </div>
        </div>
      </section>

      {/* ─── Démarrage ───────────────────────────────────────────── */}
      <section className="es-section" id="how">
        <div className="es-container">
          <div className="es-title">
            <h2>{t('Démarrer en 4 étapes', 'Get started in 4 steps')}</h2>
            <p>{t("De l'inscription au premier bulletin publié", 'From sign-up to the first published report card')}</p>
          </div>
          <div className="es-grid es-grid--4">
            {steps.map((s) => (
              <div className="es-step" key={s.num}>
                <span className="es-step__num">{s.num}</span>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
                <div className="es-step__tags">{s.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── En classe (photos) ──────────────────────────────────── */}
      <section className="es-section es-section--tint" id="classroom">
        <div className="es-container">
          <div className="es-title">
            <h2>{t('Pensé pour toute la communauté scolaire', 'Built for the whole school community')}</h2>
            <p>{t('Enseignants, élèves, administration et parents', 'Teachers, pupils, school office and parents')}</p>
          </div>
          <div className="es-grid es-grid--3">
            {PHOTOS.map((c) => (
              <article className="es-card" key={c.img}>
                <div className="es-card__img">
                  <img src={`/images/landing/${c.img}`} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="es-card__body">
                  <span className="es-card__tag">{c.tag}</span>
                  <h4>{c.title}</h4>
                  <p>{c.text}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="es-credit">{t("Photos d'illustration : Unsplash (Annie Spratt, David Geneugelijk, Ninthgrid, WOCinTech Chat, Daniel Thomas, Ahmed Nasiru, Kojo Kwarteng, Akinyemi Gbadamosi).", 'Illustrative photos: Unsplash (Annie Spratt, David Geneugelijk, Ninthgrid, WOCinTech Chat, Daniel Thomas, Ahmed Nasiru, Kojo Kwarteng, Akinyemi Gbadamosi).')}</p>
        </div>
      </section>

      {/* ─── WhatsApp ────────────────────────────────────────────── */}
      <section className="es-whatsapp">
        <div className="es-container es-whatsapp__inner">
          <div className="es-whatsapp__photo">
            <img src="/images/landing/parent.jpg" alt={t('Une maman lit un message sur son téléphone', 'A mother reading a message on her phone')} loading="lazy" decoding="async" />
            <div className="es-whatsapp__bubble">
              <strong>NovaBulletin · SMS</strong>
              <p>{t('Le bulletin du 1er trimestre de Kofi est disponible : 14,25/20 — 3e/42 📄', "Kofi's Term 1 report card is ready: 14.25/20 — 3rd/42 📄")}</p>
            </div>
          </div>
          <div className="es-whatsapp__text">
            <p className="es-banner__eyebrow">WhatsApp, SMS &amp; email</p>
            <h2>{t('Les parents reçoivent le bulletin le jour même', 'Parents receive the report card the same day')}</h2>
            <p>{t("Dès que le titulaire publie, chaque parent reçoit le bulletin PDF sur WhatsApp et par email, et un SMS sur n'importe quel téléphone — même sans smartphone ni internet. Si les frais ne sont pas réglés, le bulletin reste bloqué jusqu'au paiement.", 'As soon as the form teacher publishes, every parent receives the PDF report card on WhatsApp and by email, and an SMS on any phone — even without a smartphone or internet. If fees are unpaid, the report card stays locked until payment.')}</p>
            <ul className="es-checks">
              <li>{t('Bulletin PDF avec logo, cachet et QR code', 'PDF report card with logo, stamp and QR code')}</li>
              <li>{t('SMS : bulletin disponible, rappels de frais et reçus de paiement', 'SMS: report card ready, fee reminders and payment receipts')}</li>
              <li>{t('Vérification en ligne de chaque document', 'Online verification of every document')}</li>
              <li>{t('Paiement Mobile Money versé à l’école', 'Mobile Money payment paid to the school')}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Tarif ───────────────────────────────────────────────── */}
      <section className="es-section" id="pricing">
        <div className="es-container">
          <div className="es-title">
            <h2>{t('Un tarif simple, selon votre effectif', 'Simple pricing, based on your enrolment')}</h2>
            <p>{t('30 jours gratuits pour tout essayer — payez seulement si vous êtes satisfait', '30 free days to try everything — pay only if you are satisfied')}</p>
          </div>
          <p className="es-price__free">{t("🎁 Moins de 50 élèves : gratuit, sans abonnement ni frais d'inscription", '🎁 Fewer than 50 pupils: free, no subscription and no onboarding fee')}</p>
          <div className="es-grid es-grid--2">
            {TIERS.map((p) => (
              <div className="es-price" key={p.name}>
                <h4>{p.name}</h4>
                <div className="es-price__row">
                  <div className="es-price__circle"><strong>{fmt(p.trimester)}</strong><small>{t('FCFA / trimestre', 'FCFA / term')}</small></div>
                  <span className="es-price__or">{t('ou', 'or')}</span>
                  <div className="es-price__circle"><strong>{fmt(p.semester)}</strong><small>{t('FCFA / semestre', 'FCFA / semester')}</small></div>
                </div>
                <p className="es-price__onboarding">
                  {t("Frais d'inscription unique", 'One-time onboarding fee')} : <strong>{fmt(p.onboarding)} FCFA</strong>
                </p>
              </div>
            ))}
          </div>
          <p className="es-price__note">{t("Les frais d'inscription couvrent l'entrée de l'école dans la base (configuration, import des élèves, accompagnement) et ne sont payés qu'une fois · TMoney · Flooz · Carte · Virement", 'The onboarding fee covers bringing the school into the database (setup, student import, support) and is paid only once · TMoney · Flooz · Card · Bank transfer')}</p>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <section className="es-section es-section--tint" id="faq">
        <div className="es-container es-container--narrow">
          <div className="es-title">
            <h2>{t('Questions fréquentes', 'Frequently asked questions')}</h2>
            <p>{t('Tout ce que vous voulez savoir avant de vous lancer', 'Everything you want to know before getting started')}</p>
          </div>
          {faqs.map((f) => <Faq key={f.q} {...f} />)}
        </div>
      </section>

      {/* ─── Appel à l'action ────────────────────────────────────── */}
      <section className="es-cta">
        <div className="es-container es-cta__inner">
          <div>
            <h2>{t('Prêt pour le prochain trimestre ?', 'Ready for next term?')}</h2>
            <p>{t('Configurez votre école en 30 minutes. Notre équipe vous accompagne sur WhatsApp.', 'Set up your school in 30 minutes. Our team supports you on WhatsApp.')}</p>
          </div>
          <div className="es-cta__btns">
            <Link to="/register-school" className="es-btn es-btn--yellow">{t('Essai gratuit', 'Free trial')}</Link>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="es-btn es-btn--outline">WhatsApp</a>
          </div>
        </div>
      </section>

      {/* ─── Pied de page ────────────────────────────────────────── */}
      <footer className="es-footer">
        <div className="es-container es-footer__grid">
          <div>
            <Link to="/home" className="es-logo es-logo--light">
              <img src={logoIcon} alt="" width="24" height="38" />
              <span>NovaBulletin</span>
            </Link>
            <p className="es-footer__about">{t("La base de données complète de votre école : notes, bulletins, frais, présences et registres. Fait avec ❤️ au Togo.", "Your school's complete database: marks, report cards, fees, attendance and registers. Made with ❤️ in Togo.")}</p>
          </div>
          <div>
            <h4>{t('Produit', 'Product')}</h4>
            <ul>{NAV.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
          </div>
          <div>
            <h4>{t('Accès', 'Access')}</h4>
            <ul>
              <li><Link to="/login">{t('Connexion', 'Log in')}</Link></li>
              <li><Link to="/register-school">{t('Inscrire mon école', 'Register my school')}</Link></li>
              <li><Link to="/verify">{t('Vérifier un bulletin', 'Verify a report card')}</Link></li>
              <li><Link to="/installer">📲 {t("Installer l'application", 'Install the app')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href={whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp : +{waDigits}</a></li>
              <li><a href={mailLink} target="_blank" rel="noopener noreferrer">{SUPPORT_EMAIL}</a></li>
            </ul>
            <p className="es-footer__team">{t('Équipe', 'Team')} : {TEAM.map((m) => m.name).join(' · ')}</p>
          </div>
        </div>
        <div className="es-container es-footer__bottom">
          <p>
            © {new Date().getFullYear()} NovaBulletin. {t('Tous droits réservés.', 'All rights reserved.')}{' '}
            {/* Crédit obligatoire (licence CC BY 3.0 du modèle) */}
            {t('Modèle', 'Template')} <a href="https://colorlib.com" target="_blank" rel="noopener noreferrer">Colorlib</a>{' '}
            {t('distribué par', 'distributed by')} <a href="https://themewagon.com" target="_blank" rel="noopener noreferrer">ThemeWagon</a>
          </p>
          <div className="es-social">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.2-.8-2.7-1.1-4.4-3.9-4.5-4.1-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>
            </a>
            <a href={mailLink} target="_blank" rel="noopener noreferrer" aria-label="Email">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18v14H3zm2 2v.5l7 4.5 7-4.5V7zm0 2.9V17h14V9.9l-7 4.5z" /></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
