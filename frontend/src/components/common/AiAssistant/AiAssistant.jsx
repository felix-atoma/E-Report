import { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import './AiAssistant.css';

// ─── Help content by role ────────────────────────────────────────────────────

const HELP = {
  SUPERADMIN: [
    {
      category: 'Gestion des établissements',
      items: [
        { q: "Comment approuver un nouvel établissement ?", a: "Allez dans Tableau de bord → Établissements en attente. Cliquez sur un établissement pour voir ses détails, puis cliquez sur « Approuver » pour lui donner accès à la plateforme." },
        { q: "Comment suspendre un établissement ?", a: "Dans la liste des établissements, ouvrez la fiche de l'établissement et cliquez sur « Suspendre ». L'établissement ne pourra plus se connecter jusqu'à la réactivation." },
        { q: "Comment changer le plan d'un établissement ?", a: "Ouvrez la fiche de l'établissement → section Plan → sélectionnez le nouveau plan (Gratuit, Starter, Pro) et enregistrez." },
      ],
    },
    {
      category: 'Plateforme',
      items: [
        { q: "Comment voir tous les établissements inscrits ?", a: "Le tableau de bord superadmin affiche la liste complète avec statut (En attente, Actif, Suspendu, Rejeté)." },
        { q: "Comment ajouter des notes internes sur un établissement ?", a: "Dans la fiche établissement → champ « Notes internes » → saisissez vos notes et enregistrez." },
      ],
    },
  ],

  ADMIN: [
    {
      category: 'Élèves & Classes',
      items: [
        { q: "Comment ajouter un élève ?", a: "Allez dans Élèves → bouton « Ajouter un élève ». Renseignez le nom, numéro d'admission et la classe. L'élève reçoit un accès automatique." },
        { q: "Comment créer une classe ?", a: "Allez dans Classes → « Nouvelle classe ». Donnez un nom (ex: 6ème A), sélectionnez l'année académique et assignez un professeur principal." },
        { q: "Comment importer des élèves en masse ?", a: "Dans Élèves → « Importer via LMS ». Uploadez un fichier CSV avec les colonnes : nom, numéro d'admission, classe." },
      ],
    },
    {
      category: 'Notes & Bulletins',
      items: [
        { q: "Comment générer les bulletins ?", a: "Allez dans Bulletins → sélectionnez la classe et le trimestre → cliquez « Générer les bulletins ». Les PDF sont créés automatiquement." },
        { q: "Comment verrouiller les notes d'un trimestre ?", a: "Dans Rapports → sélectionnez le trimestre → bouton « Verrouiller ». Les professeurs ne peuvent plus modifier les notes après verrouillage." },
        { q: "Comment voir le classement d'une classe ?", a: "Dans Bulletins → sélectionnez la classe et le trimestre → onglet « Classement ». Vous voyez rang, moyenne et appréciation de chaque élève." },
      ],
    },
    {
      category: 'Paiements & Frais',
      items: [
        { q: "Comment enregistrer un paiement ?", a: "Dans Paiements → « Nouveau paiement » → sélectionnez l'élève, le montant et le mode de paiement. Un reçu est généré automatiquement." },
        { q: "Comment voir les impayés ?", a: "Dans Frais → filtrez par statut « Non payé ». Vous voyez tous les élèves ayant des frais en retard." },
        { q: "Comment activer/désactiver le blocage des bulletins ?", a: "Dans Paramètres → Académique → activez « Blocage bulletins si impayé ». Les bulletins ne seront accessibles qu'après paiement." },
      ],
    },
    {
      category: 'Paramètres',
      items: [
        { q: "Comment personnaliser le bulletin ?", a: "Dans Paramètres → Apparence. Vous pouvez changer les couleurs, le logo, les polices et la mise en page du bulletin." },
        { q: "Comment ajouter un professeur ?", a: "Dans Utilisateurs → « Ajouter un utilisateur » → rôle Professeur. Renseignez le nom et l'email. Le professeur reçoit un email de bienvenue." },
        { q: "Comment configurer l'année académique ?", a: "Dans Paramètres → Académique. Définissez les dates de début/fin et le système de trimestres ou semestres." },
      ],
    },
  ],

  TEACHER: [
    {
      category: 'Saisie des notes',
      items: [
        { q: "Comment saisir les notes de mes élèves ?", a: "Allez dans Notes → sélectionnez la classe et la matière → saisissez les notes dans le tableau. Enregistrez avec le bouton « Sauvegarder »." },
        { q: "Comment signer une feuille de notes ?", a: "Dans Notes → sélectionnez la classe → cliquez sur « Signer ». Dessinez votre signature sur le pavé et confirmez." },
        { q: "Que faire si je ne peux plus modifier une note ?", a: "Les notes sont verrouillées par l'administrateur en fin de trimestre. Contactez votre administration pour déverrouiller si nécessaire." },
      ],
    },
    {
      category: 'LMS (Cours en ligne)',
      items: [
        { q: "Comment publier une annonce pour mes élèves ?", a: "Dans LMS → Annonces → « Nouvelle annonce ». Rédigez votre message et publiez. Les élèves le voient dans leur tableau de bord." },
        { q: "Comment partager un document de cours ?", a: "Dans LMS → Matériels → « Ajouter un matériel ». Uploadez votre fichier (PDF, Word, etc.) et choisissez la classe concernée." },
        { q: "Comment créer un devoir ?", a: "Dans LMS → Devoirs → « Nouveau devoir ». Définissez le titre, les instructions, la date limite et publiez." },
        { q: "Comment créer un quiz ?", a: "Dans LMS → Quiz → « Nouveau quiz ». Ajoutez des questions (QCM ou texte libre), fixez le temps limite et publiez quand le quiz est prêt." },
      ],
    },
    {
      category: 'Examens blancs',
      items: [
        { q: "Comment accéder aux examens blancs ?", a: "Dans le menu → Examens blancs. Vous pouvez consulter les fiches de notes, saisir les résultats et signer votre fiche matière." },
      ],
    },
  ],

  STUDENT: [
    {
      category: 'Mon bulletin',
      items: [
        { q: "Comment voir mon bulletin ?", a: "Dans votre tableau de bord, cliquez sur « Voir mon bulletin » ou allez dans Bulletins → sélectionnez le trimestre. Vous pouvez télécharger le PDF." },
        { q: "Comment comprendre mon classement ?", a: "Le classement indique votre rang dans la classe. « 1er/35 » signifie vous êtes premier sur 35 élèves. La moyenne générale est calculée sur toutes les matières." },
        { q: "Pourquoi je ne vois pas mon bulletin ?", a: "Soit le trimestre n'est pas encore terminé, soit les frais scolaires ne sont pas payés (si la restriction est activée). Contactez votre administration." },
      ],
    },
    {
      category: 'Mes notes',
      items: [
        { q: "Comment voir mes notes par matière ?", a: "Dans le tableau de bord → section Notes. Vous voyez toutes vos notes par matière et par trimestre." },
        { q: "Qu'est-ce que la moyenne générale ?", a: "C'est la moyenne de toutes vos matières, pondérée par le coefficient de chaque matière. Une moyenne ≥ 10/20 est généralement le seuil de passage." },
      ],
    },
    {
      category: 'LMS & Cours',
      items: [
        { q: "Comment voir les devoirs de mes professeurs ?", a: "Dans LMS → Devoirs. Vous voyez tous les devoirs publiés par vos professeurs avec les dates limites." },
        { q: "Comment passer un quiz ?", a: "Dans LMS → Quiz → cliquez sur le quiz disponible → « Commencer ». Répondez aux questions dans le temps imparti et soumettez." },
        { q: "Comment accéder aux documents de cours ?", a: "Dans LMS → Matériels. Tous les documents partagés par vos professeurs y sont listés. Cliquez pour télécharger." },
      ],
    },
  ],

  PARENT: [
    {
      category: 'Bulletin de mon enfant',
      items: [
        { q: "Comment voir le bulletin de mon enfant ?", a: "Sur votre tableau de bord, cliquez sur « Voir le bulletin » ou dans Bulletins → sélectionnez le trimestre. Vous pouvez télécharger le PDF." },
        { q: "Comment lire les résultats de mon enfant ?", a: "Le bulletin affiche les notes par matière, la moyenne générale et le rang dans la classe. Une appréciation du professeur peut accompagner chaque matière." },
        { q: "Pourquoi le bulletin n'est pas disponible ?", a: "Le bulletin peut ne pas être disponible si les frais scolaires sont en attente. Contactez l'administration de l'école." },
      ],
    },
    {
      category: 'Paiements',
      items: [
        { q: "Comment voir l'état des frais scolaires ?", a: "Dans Paiements, vous voyez le montant total, les paiements effectués et le solde restant dû." },
      ],
    },
  ],
};

// ─── Page-specific quick tips ─────────────────────────────────────────────────

const PAGE_TIPS = {
  '/grades':     [{ role: 'TEACHER', tip: "Appuyez sur Tab pour passer d'une note à la suivante rapidement." }],
  '/bulletins':  [{ role: 'ADMIN',   tip: "Verrouillez le trimestre avant de générer les bulletins pour éviter les modifications." }],
  '/payments':   [{ role: 'ADMIN',   tip: "Filtrez par statut « Non payé » pour voir rapidement les impayés." }],
  '/settings':   [{ role: 'ADMIN',   tip: "Personnalisez les couleurs et le logo dans l'onglet Apparence pour un bulletin aux couleurs de votre école." }],
  '/students':   [{ role: 'ADMIN',   tip: "Utilisez le numéro d'admission pour rechercher un élève rapidement." }],
  '/lms':        [{ role: 'TEACHER', tip: "Publiez les devoirs au moins 3 jours avant la date limite pour laisser le temps aux élèves." }],
};

// ─── Component ────────────────────────────────────────────────────────────────

function AiAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const role = user?.role ?? 'STUDENT';
  const sections = HELP[role] ?? HELP.STUDENT;

  const pageTip = useMemo(() => {
    const key = Object.keys(PAGE_TIPS).find((k) => location.pathname.startsWith(k));
    if (!key) return null;
    return PAGE_TIPS[key].find((t) => t.role === role)?.tip ?? null;
  }, [location.pathname, role]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q),
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [search, sections]);

  return (
    <>
      {open && (
        <div className="ai-panel">
          <div className="ai-panel__header">
            <span className="ai-panel__title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Centre d'aide
            </span>
            <button className="ai-panel__close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
          </div>

          <div className="ai-panel__search-wrap">
            <input
              className="ai-panel__search"
              type="text"
              placeholder="Rechercher une question…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ai-panel__messages">
            {pageTip && !search && (
              <div className="ai-tip">
                <span className="ai-tip__icon">💡</span>
                <span>{pageTip}</span>
              </div>
            )}

            {filtered.length === 0 && (
              <p className="ai-panel__empty">Aucun résultat pour « {search} »</p>
            )}

            {filtered.map((sec) => (
              <div key={sec.category} className="ai-section">
                <div className="ai-section__title">{sec.category}</div>
                {sec.items.map((item, i) => {
                  const key = `${sec.category}-${i}`;
                  const isOpen = expanded === key;
                  return (
                    <div key={key} className={`ai-faq${isOpen ? ' ai-faq--open' : ''}`}>
                      <button
                        className="ai-faq__q"
                        onClick={() => setExpanded(isOpen ? null : key)}
                      >
                        <span>{item.q}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ai-faq__chevron">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {isOpen && <div className="ai-faq__a">{item.a}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className={`side-btn side-btn--ai${open ? ' side-btn--ai-active' : ''}`}
        title="Centre d'aide"
        aria-label="Centre d'aide"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
    </>
  );
}

export default AiAssistant;
