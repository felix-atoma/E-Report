import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './LandingPage.css';

const FEATURES = [
  { icon: '📊', title: 'Calcul automatique', desc: 'Les moyennes, coefficients et rangs sont calculés automatiquement. Zéro erreur, zéro formule Excel.' },
  { icon: '📄', title: 'Bulletins PDF en 1 clic', desc: 'Chaque bulletin est généré au format PDF avec le logo et les couleurs de votre école.' },
  { icon: '📱', title: 'Envoi WhatsApp & Email', desc: 'Les parents reçoivent le bulletin de leur enfant directement sur WhatsApp le jour de la publication.' },
  { icon: '💰', title: 'Frais scolaires intégrés', desc: 'L\'accès au bulletin est automatiquement bloqué si les frais scolaires ne sont pas réglés.' },
  { icon: '👥', title: 'Multi-rôles', desc: 'Tableau de bord dédié pour l\'admin, les enseignants, l\'économe et les parents.' },
  { icon: '☁️', title: 'Cloud sécurisé', desc: 'Toutes vos données sont sauvegardées en temps réel. Aucun risque de perte de fichier.' },
];

const STEPS = [
  { num: '01', title: 'Inscrivez votre école', desc: 'Créez votre compte établissement en 2 minutes. Notre équipe valide votre demande sous 24h.' },
  { num: '02', title: 'Configurez vos classes', desc: 'Ajoutez vos classes, matières, enseignants et élèves. Importez vos données via CSV si besoin.' },
  { num: '03', title: 'Publiez & envoyez', desc: 'Les enseignants saisissent les notes, les bulletins se génèrent et partent aux parents automatiquement.' },
];

const ROLES = [
  { icon: '🏫', role: 'Administrateur', points: ['Tableau de bord analytique complet', 'Gestion des utilisateurs et classes', 'Suivi des frais scolaires', 'Personnalisation des bulletins'] },
  { icon: '👨‍🏫', role: 'Enseignant', points: ['Saisie des notes sur mobile', 'Calcul automatique des moyennes', 'Signature numérique des fiches', 'Gestion de l\'emploi du temps'] },
  { icon: '👨‍👩‍👧', role: 'Parent', points: ['Bulletins reçus sur WhatsApp', 'Suivi de la progression en temps réel', 'Paiement des frais en ligne', 'Accès 24h/24 au portail parent'] },
];

const STATS = [
  { value: '3 jours', label: 'de travail manuel éliminés' },
  { value: '30 min', label: 'pour préparer un trimestre' },
  { value: '100%', label: 'des parents informés en temps réel' },
  { value: '0', label: 'erreur de calcul' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.title = 'NovaBulletin — Le bulletin scolaire moderne pour les écoles d\'Afrique';
  }, []);

  return (
    <div className="lp">

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
            <li><a href="#roles" onClick={() => setMenuOpen(false)}>Pour qui ?</a></li>
            <li><a href="#pricing" onClick={() => setMenuOpen(false)}>Tarif</a></li>
          </ul>

          <div className="lp-nav__ctas">
            <Link to="/login" className="lp-btn lp-btn--ghost">Se connecter</Link>
            <Link to="/register-school" className="lp-btn lp-btn--primary">Essayer gratuitement</Link>
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
        </div>
        <div className="lp-container lp-hero__inner">
          <div className="lp-hero__text">
            <span className="lp-badge">🌍 Conçu pour les écoles d'Afrique francophone</span>
            <h1 className="lp-hero__title">
              Fini Excel.<br />
              <span className="lp-hero__accent">Bienvenue dans le bulletin scolaire moderne.</span>
            </h1>
            <p className="lp-hero__sub">
              NovaBulletin calcule les moyennes automatiquement, génère les bulletins PDF en 1 clic
              et les envoie aux parents sur <strong>WhatsApp</strong>.<br />
              Ce qui vous prenait 3 jours prend désormais 30 minutes.
            </p>
            <div className="lp-hero__actions">
              <Link to="/register-school" className="lp-btn lp-btn--hero">
                Essayer ce trimestre →
              </Link>
              <a href="#how" className="lp-btn lp-btn--outline">
                Voir comment ça marche
              </a>
            </div>
            <p className="lp-hero__note">
              ✅ Essai ce trimestre &nbsp;·&nbsp; 🤝 Payez seulement si vous êtes satisfait &nbsp;·&nbsp; ❌ Sans engagement
            </p>
          </div>

          <div className="lp-hero__visual">
            <div className="lp-mockup">
              <div className="lp-mockup__bar">
                <span /><span /><span />
              </div>
              <div className="lp-mockup__content">
                <div className="lp-mockup__header">
                  <div className="lp-mockup__title">Tableau de bord — Trimestre 2</div>
                  <div className="lp-mockup__badge">📈 Année 2025-2026</div>
                </div>
                <div className="lp-mockup__stats">
                  {[['245', 'Élèves'],['12', 'Classes'],['98%', 'Bulletins envoyés'],['87%', 'Frais recouvrés']].map(([v, l]) => (
                    <div key={l} className="lp-mockup__stat">
                      <strong>{v}</strong><span>{l}</span>
                    </div>
                  ))}
                </div>
                <div className="lp-mockup__table">
                  {[['Kofi Mensah','15.4','A'],['Ama Koffi','13.8','B'],['Yao Adjovi','17.2','A+'],['Sena Dossou','11.5','C']].map(([n, m, g]) => (
                    <div key={n} className="lp-mockup__row">
                      <span className="lp-mockup__name">{n}</span>
                      <span className="lp-mockup__avg">{m}/20</span>
                      <span className={`lp-mockup__grade lp-mockup__grade--${g.includes('+') ? 'ap' : g}`}>{g}</span>
                      <span className="lp-mockup__chip">✅ Envoyé</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lp-hero__notif">
              <span>📱</span>
              <div>
                <p><strong>WhatsApp</strong></p>
                <p>Bulletin de Kofi reçu ✓✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section className="lp-stats">
        <div className="lp-container lp-stats__grid">
          {STATS.map((s) => (
            <div key={s.label} className="lp-stats__item">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM ────────────────────────────────────────────────────── */}
      <section className="lp-problem">
        <div className="lp-container lp-problem__inner">
          <div className="lp-problem__text">
            <span className="lp-section-tag">Le problème</span>
            <h2>Vous utilisez encore Excel pour les bulletins ?</h2>
            <div className="lp-problem__list">
              {[
                ['❌','3 à 5 jours de saisie manuelle chaque trimestre'],
                ['❌','Des erreurs de formules impossibles à détecter'],
                ['❌','Des bulletins imprimés que les parents ne reçoivent jamais'],
                ['❌','Aucun lien avec les frais scolaires'],
                ['❌','Des fichiers perdus ou corrompus'],
              ].map(([icon, text]) => (
                <div key={text} className="lp-problem__item">
                  <span>{icon}</span><p>{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-problem__vs">
            <div className="lp-problem__card lp-problem__card--bad">
              <h4>Avec Excel</h4>
              <p>Saisie manuelle · Erreurs · Papier · Semaines de travail</p>
            </div>
            <div className="lp-problem__arrow">→</div>
            <div className="lp-problem__card lp-problem__card--good">
              <h4>Avec NovaBulletin</h4>
              <p>Automatique · Zéro erreur · WhatsApp · 30 minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section className="lp-features" id="features">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Fonctionnalités</span>
            <h2>Tout ce dont votre école a besoin</h2>
            <p>Une plateforme complète qui remplace Excel, les imprimantes et les appels téléphoniques aux parents.</p>
          </div>
          <div className="lp-features__grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-card__icon">{f.icon}</div>
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
            <p>Pas d'installation, pas de formation longue. Votre école est prête en 3 étapes.</p>
          </div>
          <div className="lp-how__steps">
            {STEPS.map((s, i) => (
              <div key={s.num} className="lp-how__step">
                <div className="lp-how__num">{s.num}</div>
                <div className="lp-how__body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && <div className="lp-how__connector" aria-hidden="true" />}
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
            <h2>Une solution pour chaque acteur de l'école</h2>
          </div>
          <div className="lp-roles__grid">
            {ROLES.map((r) => (
              <div key={r.role} className="lp-role-card">
                <div className="lp-role-card__icon">{r.icon}</div>
                <h3>{r.role}</h3>
                <ul>
                  {r.points.map((p) => (
                    <li key={p}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {p}
                    </li>
                  ))}
                </ul>
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
            <h2>Simple et sans risque</h2>
            <p>Un seul tarif. Payez seulement si vous êtes satisfait.</p>
          </div>
          <div className="lp-pricing__card">
            <div className="lp-pricing__badge">🤝 Notre engagement</div>
            <h3 className="lp-pricing__title">Essayez ce trimestre</h3>
            <p className="lp-pricing__sub">
              Utilisez NovaBulletin pendant tout un trimestre.<br />
              <strong>Si ça vous convient, vous payez à la fin.</strong><br />
              Si non, vous revenez à Excel. Aucun frais.
            </p>
            <div className="lp-pricing__perks">
              {['Accès complet à toutes les fonctionnalités','Nombre d\'élèves illimité','Support WhatsApp inclus','Aucune carte bancaire requise'].map((p) => (
                <div key={p} className="lp-pricing__perk">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {p}
                </div>
              ))}
            </div>
            <Link to="/register-school" className="lp-btn lp-btn--hero lp-btn--wide">
              Commencer maintenant →
            </Link>
            <p className="lp-pricing__note">Contactez-nous : felixatoma2@gmail.com</p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-container lp-cta__inner">
          <h2>Prêt à transformer la gestion scolaire de votre établissement ?</h2>
          <p>Rejoignez les écoles qui ont déjà dit adieu à Excel.</p>
          <div className="lp-cta__actions">
            <Link to="/register-school" className="lp-btn lp-btn--hero">
              Inscrire mon école gratuitement
            </Link>
            <Link to="/login" className="lp-btn lp-btn--outline-white">
              Déjà inscrit ? Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <div className="lp-footer__brand">
            <img src={logoIcon} alt="NovaBulletin" width="32" height="32" />
            <span>NovaBulletin</span>
            <p>Le bulletin scolaire moderne pour les écoles d'Afrique francophone.</p>
          </div>
          <div className="lp-footer__links">
            <div>
              <h4>Produit</h4>
              <a href="#features">Fonctionnalités</a>
              <a href="#how">Comment ça marche</a>
              <a href="#pricing">Tarif</a>
            </div>
            <div>
              <h4>Compte</h4>
              <Link to="/login">Se connecter</Link>
              <Link to="/register-school">Inscrire mon école</Link>
            </div>
            <div>
              <h4>Légal</h4>
              <Link to="/legal/tos">Conditions d'utilisation</Link>
              <Link to="/legal/privacy">Confidentialité</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <p>© {new Date().getFullYear()} NovaBulletin. Tous droits réservés.</p>
          <p>Fait avec ❤️ au Togo</p>
        </div>
      </footer>

    </div>
  );
}
