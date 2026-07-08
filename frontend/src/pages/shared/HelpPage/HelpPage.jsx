import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Button from '../../../components/common/Button/Button';
import './HelpPage.css';

// ─── BOOK CONTENT ──────────────────────────────────────────────────────────────
const CHAPTERS = [
  // ── 1 ──────────────────────────────────────────────────────────────────────
  {
    num: 1,
    title: 'Introduction et premiers pas',
    icon: '🚀',
    sections: [
      {
        title: 'Présentation d\'E-Report',
        content: `E-Report est une plateforme de gestion scolaire en ligne conçue pour les établissements du système éducatif togolais et africain. Elle centralise la gestion des élèves, des notes, des bulletins, des finances, de la discipline, des présences et de la communication avec les familles.

La plateforme est accessible depuis n'importe quel navigateur web (Chrome, Firefox, Edge, Safari) sur ordinateur, tablette ou téléphone mobile. Aucune installation n'est nécessaire.`,
      },
      {
        title: 'Rôles disponibles',
        content: `E-Report distingue cinq rôles principaux :

• Administrateur (ADMIN) — Directeur ou gestionnaire de l'établissement. Accès complet à toutes les fonctionnalités.
• Enseignant (TEACHER) — Saisie des notes, gestion des fiches, bulletins, présences, annonces.
• Économe (BURSAR) — Gestion des paiements, suivi des frais scolaires, bulletins retenus.
• Parent (PARENT) — Consultation des bulletins, paiements en ligne, suivi des enfants.
• Élève (STUDENT) — Consultation des bulletins et de sa progression.`,
      },
      {
        title: 'Inscrire son établissement',
        steps: [
          'Rendez-vous sur la page d\'accueil publique de la plateforme.',
          'Cliquez sur « Inscrire mon établissement ».',
          'Renseignez : nom de l\'établissement, pays, email de l\'administrateur et mot de passe.',
          'Cliquez sur « Créer mon espace ». Votre espace est immédiatement activé.',
          'Vous êtes redirigé vers l\'assistant de démarrage pour configurer votre école.',
        ],
        callout: { type: 'tip', text: 'Les établissements de moins de 50 élèves bénéficient d\'un accès gratuit (plan Starter). Au-delà, un abonnement mensuel ou annuel est requis (voir Chapitre 3).' },
      },
      {
        title: 'Comment se connecter',
        steps: [
          'Ouvrez votre navigateur et accédez à l\'adresse de la plateforme.',
          'Sur la page d\'accueil, cliquez sur « Se connecter ».',
          'Saisissez votre adresse email et votre mot de passe, puis cliquez sur « Connexion ».',
          'Connexion Google : cliquez sur « Continuer avec Google » pour vous connecter sans mot de passe.',
          'Connexion par code OTP : cliquez sur « Se connecter avec un code » — recevez un code à usage unique par email, saisissez-le pour accéder sans mot de passe.',
          'En cas d\'oubli de mot de passe : cliquez sur « Mot de passe oublié », entrez votre email, consultez votre boîte mail et suivez le lien reçu.',
        ],
        callout: { type: 'warning', text: 'Si votre email n\'est pas encore vérifié, une bannière d\'avertissement s\'affiche en haut de l\'écran. Connectez-vous via le code OTP reçu par email pour activer votre compte.' },
      },
      {
        title: 'Navigation dans l\'interface',
        content: `L'interface est divisée en deux zones principales :

• La barre latérale gauche (menu) : accès rapide à toutes les sections de votre espace. Sur mobile, elle se masque automatiquement. Cliquez sur l'icône ☰ pour l'ouvrir.
• La zone principale (contenu) : affiche la page active.

En haut à droite vous trouvez trois boutons flottants :
• Bouton vert (profil) : accédez à votre profil et modifiez vos informations.
• Bouton rouge (cloche) : consultez vos notifications. Un badge rouge indique le nombre de messages non lus.
• Bouton bleu (déconnexion) : quittez la session en toute sécurité.`,
      },
      {
        title: 'L\'Assistant IA intégré',
        content: `Un assistant IA est disponible sur toutes les pages via le bouton flottant en bas à droite.

Il peut vous aider à :
• Répondre à vos questions sur la plateforme.
• Rédiger des appréciations ou des annonces.
• Analyser des données de classe.
• Suggérer des bonnes pratiques pédagogiques.`,
        callout: { type: 'tip', text: 'L\'assistant IA retient le contexte de votre conversation. Posez vos questions en français ou en anglais.' },
      },
      {
        title: 'Changer de langue et de thème',
        steps: [
          'Pour changer de langue : cliquez sur « FR » ou « EN » dans la barre supérieure.',
          'Pour activer le thème sombre : cliquez sur l\'icône de lune/soleil dans la barre supérieure.',
          'Votre préférence est sauvegardée automatiquement dans votre navigateur.',
        ],
      },
    ],
  },

  // ── 2 ──────────────────────────────────────────────────────────────────────
  {
    num: 2,
    title: 'Assistant de démarrage et configuration',
    icon: '⚙️',
    sections: [
      {
        title: 'L\'assistant de démarrage (Onboarding)',
        content: `Lors de votre première connexion, un assistant de démarrage vous guide étape par étape pour configurer votre établissement :

• Étape 1 : Informations générales (nom, adresse, téléphone, circonscription).
• Étape 2 : Paramètres académiques (année scolaire, structure des périodes, note de passage).
• Étape 3 : Apparence (logo, couleur principale, slogan).
• Étape 4 : Création des premières matières.
• Étape 5 : Création de la première classe.

Vous pouvez revenir à n'importe quelle étape à tout moment via les Paramètres du menu.`,
        callout: { type: 'important', text: 'Complétez l\'assistant de démarrage avant d\'inviter vos enseignants ou d\'importer les élèves. Une configuration correcte dès le départ évite de nombreux problèmes.' },
      },
      {
        title: 'Informations de l\'établissement',
        steps: [
          'Allez dans le menu → Paramètres.',
          'Cliquez sur « Modifier les informations ».',
          'Renseignez : nom officiel, pays, devise de la circonscription, circonscription, email, téléphone, adresse, site web et mission de l\'établissement.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Paramètres académiques',
        steps: [
          'Allez dans le menu → Paramètres, section « Paramètres académiques ».',
          'Renseignez l\'année scolaire en cours (ex : 2024-2025).',
          'Choisissez la structure des périodes : Trimestriel (3 trimestres) ou Semestriel (2 semestres).',
          'Sélectionnez la période en cours (trimestre 1, 2 ou 3).',
          'Définissez la note de passage (10/20 par défaut) et la note maximale (20 par défaut).',
          'Activez ou désactivez le verrou de frais scolaires.',
          'Cliquez sur « Enregistrer ».',
        ],
        callout: { type: 'warning', text: 'Changer la structure des périodes en cours d\'année peut affecter les bulletins déjà publiés. Faites ce choix au début de l\'année scolaire.' },
      },
      {
        title: 'Personnalisation des bulletins (Branding)',
        steps: [
          'Allez dans le menu → Apparence.',
          'Téléchargez le logo de votre établissement (format PNG ou JPG, fond transparent recommandé).',
          'Choisissez la couleur principale de l\'en-tête du bulletin.',
          'Renseignez le nom officiel, l\'adresse, le téléphone et le slogan.',
          'Renseignez le numéro d\'agrément et la devise du pays (ex : « Travail – Liberté – Patrie »).',
          'Cliquez sur « Enregistrer ». Ces informations apparaîtront sur tous les bulletins imprimés.',
        ],
      },
      {
        title: 'Paramètres de paiement en ligne (Notchpay)',
        steps: [
          'Allez dans le menu → Paramètres, section « Paiement en ligne ».',
          'Créez un compte sur la plateforme Notchpay si vous n\'en avez pas.',
          'Copiez votre Clé publique et votre Clé secrète depuis votre tableau de bord Notchpay.',
          'Collez-les dans les champs correspondants et cliquez sur « Enregistrer ».',
          'Une fois configuré, les parents pourront payer directement depuis leur espace via Flooz ou TMoney.',
        ],
        callout: { type: 'tip', text: 'Sans clés Notchpay, les paiements en ligne sont désactivés. Les paiements manuels (espèces, chèque) restent disponibles.' },
      },
      {
        title: 'Grille d\'appréciation',
        content: `La grille d'appréciation définit les mentions attribuées selon la moyenne obtenue. Elle s'applique automatiquement sur tous les bulletins.

Valeurs par défaut (sur 20) :
• 18 – 20 : Excellent
• 16 – 18 : Très Bien
• 14 – 16 : Bien
• 12 – 14 : Assez Bien
• 10 – 12 : Passable
• 0 – 10  : Insuffisant

Pour les cours primaires avec note sur 10, activez l'option « Cours primaire » au niveau de la classe ou de la matière.`,
      },
      {
        title: 'Fin d\'année scolaire — Promotion des élèves',
        steps: [
          'Allez dans le menu → Paramètres, section « Fin d\'année ».',
          'Sélectionnez l\'année à clôturer.',
          'Choisissez la nouvelle année scolaire cible.',
          'Le système propose automatiquement de promouvoir chaque classe à la classe supérieure.',
          'Ajustez les promotions si nécessaire (redoublants, changements de filière).',
          'Cliquez sur « Lancer la promotion ». Les élèves sont déplacés dans leur nouvelle classe.',
        ],
        callout: { type: 'warning', text: 'Cette opération est irréversible. Assurez-vous que tous les bulletins de l\'année en cours sont publiés avant de lancer la promotion de fin d\'année.' },
      },
      {
        title: 'Exporter les données de l\'établissement',
        steps: [
          'Allez dans le menu → Paramètres.',
          'Cliquez sur « Exporter les données ».',
          'L\'export génère un fichier CSV contenant toutes les données (élèves, notes, paiements).',
          'Ce fichier peut être ouvert dans Excel pour archivage ou analyse externe.',
        ],
      },
    ],
  },

  // ── 3 ──────────────────────────────────────────────────────────────────────
  {
    num: 3,
    title: 'Abonnement et tarification',
    icon: '💳',
    sections: [
      {
        title: 'Plans disponibles',
        content: `E-Report propose quatre niveaux d'abonnement selon la taille de votre établissement :

• Starter — Moins de 50 élèves — GRATUIT (accès complet à toutes les fonctionnalités)
• Basic — De 50 à 99 élèves — 10 000 FCFA/mois ou 100 000 FCFA/an
• Pro — De 100 à 199 élèves — 20 000 FCFA/mois ou 200 000 FCFA/an
• Enterprise — 200 élèves et plus — 35 000 FCFA/mois ou 350 000 FCFA/an

L'abonnement annuel représente une économie de 2 mois par rapport au tarif mensuel.`,
        callout: { type: 'tip', text: 'Choisissez l\'abonnement annuel pour économiser deux mois d\'abonnement par an.' },
      },
      {
        title: 'Souscrire ou renouveler un abonnement',
        steps: [
          'Allez dans le menu → Abonnement.',
          'Consultez votre plan actuel et sa date d\'expiration.',
          'Cliquez sur le plan souhaité.',
          'Choisissez la durée : mensuel ou annuel.',
          'Sélectionnez votre opérateur mobile : TMoney (Togocel), Flooz (Moov) ou Moov Money.',
          'Cliquez sur « Payer ». Vous êtes redirigé vers la page de paiement Notchpay.',
          'Validez le paiement depuis votre téléphone.',
          'Une fois confirmé, votre abonnement est activé immédiatement.',
        ],
      },
      {
        title: 'Suivi des achats et abonnements',
        steps: [
          'Allez dans le menu → Abonnement.',
          'La section « Historique des paiements » liste tous vos abonnements passés.',
          'Chaque transaction affiche : date, montant, plan souscrit et statut (payé / en attente).',
        ],
        callout: { type: 'note', text: 'En cas d\'expiration d\'abonnement, l\'accès aux fonctionnalités avancées est suspendu mais vos données sont préservées. Renouvelez pour retrouver l\'accès complet.' },
      },
    ],
  },

  // ── 4 ──────────────────────────────────────────────────────────────────────
  {
    num: 4,
    title: 'Gestion des utilisateurs et du personnel',
    icon: '👥',
    sections: [
      {
        title: 'Créer un compte utilisateur',
        steps: [
          'Allez dans le menu → Utilisateurs.',
          'Cliquez sur « + Nouvel utilisateur ».',
          'Renseignez le nom complet, l\'email, le rôle (Enseignant, Économe ou Parent) et un mot de passe temporaire.',
          'Cliquez sur « Créer ».',
          'L\'utilisateur reçoit un email avec ses identifiants. Il peut se connecter immédiatement.',
        ],
        callout: { type: 'tip', text: 'Utilisez un mot de passe temporaire simple (ex : le nom de l\'établissement) et demandez à l\'utilisateur de le changer dès sa première connexion via Paramètres → Profil.' },
      },
      {
        title: 'Modifier ou désactiver un compte',
        steps: [
          'Dans la liste des utilisateurs, cliquez sur la ligne de l\'utilisateur.',
          'Cliquez sur « Modifier » pour changer le nom ou l\'email.',
          'Cliquez sur « Désactiver » pour bloquer l\'accès sans supprimer le compte.',
          'Cliquez sur « Réinitialiser le mot de passe » pour envoyer un nouveau mot de passe par email.',
        ],
      },
      {
        title: 'Annuaire du personnel',
        content: `L'annuaire du personnel centralise les informations professionnelles de toute l'équipe (administrateurs, enseignants, économes). Il est accessible via le menu → Annuaire du personnel.

Informations disponibles par employé :
• Titre (M., Mme, Dr…) et spécialité
• Qualifications académiques (BEPC, BAC, Licence, Master, Doctorat…)
• Type de contrat (CDI, CDD, Vacataire, Fonctionnaire)
• Numéro de téléphone et date d'embauche
• Biographie / Notes internes`,
      },
      {
        title: 'Créer ou mettre à jour une fiche de personnel',
        steps: [
          'Allez dans le menu → Annuaire du personnel.',
          'Cliquez sur l\'employé concerné pour ouvrir son panneau de détails.',
          'Cliquez sur « Modifier le profil ».',
          'Renseignez : titre, spécialité, téléphone, type de contrat, qualifications, date d\'embauche, biographie.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Assigner un parent à un élève',
        content: `Un parent peut être associé à un ou plusieurs élèves. Cette association lui permet de consulter les bulletins et de payer en ligne.`,
        steps: [
          'Créez d\'abord le compte parent (voir section 4.1).',
          'Allez dans Élèves → sélectionnez l\'élève concerné.',
          'Dans la fiche de l\'élève, section « Parent / Tuteur », saisissez l\'email du parent.',
          'Cliquez sur « Lier ». Le parent voit désormais cet élève dans son espace.',
        ],
      },
      {
        title: 'Gérer son profil personnel',
        steps: [
          'Cliquez sur le bouton vert (profil) flottant à droite, ou allez dans le menu → Mon profil.',
          'Cliquez sur « Modifier » pour mettre à jour votre nom et numéro de téléphone.',
          'Pour changer de mot de passe : saisissez l\'ancien mot de passe, puis le nouveau deux fois.',
          'Pour ajouter une photo de profil : cliquez sur l\'avatar et téléchargez une image.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
    ],
  },

  // ── 5 ──────────────────────────────────────────────────────────────────────
  {
    num: 5,
    title: 'Gestion des élèves',
    icon: '🎓',
    sections: [
      {
        title: 'Ajouter un élève manuellement',
        steps: [
          'Allez dans le menu → Élèves.',
          'Cliquez sur « + Nouvel élève ».',
          'Renseignez : nom complet, date de naissance, genre, classe d\'inscription.',
          'Ajoutez les informations optionnelles : numéro d\'admission, contact parent, groupe sanguin.',
          'Cliquez sur « Enregistrer ».',
          'Un numéro d\'admission est généré automatiquement si vous n\'en fournissez pas.',
        ],
      },
      {
        title: 'Importer des élèves via CSV',
        steps: [
          'Allez dans le menu → Importation CSV.',
          'Cliquez sur « Télécharger le modèle » pour obtenir le fichier Excel/CSV de référence.',
          'Remplissez le fichier avec les données de vos élèves (une ligne par élève).',
          'Colonnes obligatoires : name (nom complet), className (ex : 3ème B).',
          'Colonnes optionnelles : dateOfBirth, gender, admissionNumber, parentEmail, bloodGroup.',
          'Sauvegardez le fichier au format CSV (UTF-8).',
          'Retournez sur la page, cliquez sur « Importer CSV » et sélectionnez votre fichier.',
          'Vérifiez l\'aperçu des données, puis confirmez l\'importation.',
        ],
        callout: { type: 'warning', text: 'Si un élève avec le même numéro d\'admission existe déjà, l\'import le met à jour au lieu de créer un doublon. Vérifiez toujours l\'aperçu avant de confirmer.' },
      },
      {
        title: 'Consulter le profil d\'un élève',
        content: `La fiche élève regroupe toutes les informations en un seul endroit. Allez dans le menu → Élèves, puis cliquez sur un élève pour y accéder.

Onglets disponibles :
• Informations — Identité, classe, numéro d'admission, contacts.
• Paiements — Statut des frais, détail des paiements par poste, plans de paiement.
• Présences — Récapitulatif des absences, retards et excuses.
• Bulletins — Liste des bulletins publiés par période.
• Discipline — Dossier disciplinaire (avertissements, sanctions, félicitations).
• Santé — Fiche médicale (visites, vaccinations, allergies).
• Transferts — Historique des établissements.`,
      },
      {
        title: 'Modifier les informations d\'un élève',
        steps: [
          'Ouvrez la fiche de l\'élève.',
          'Cliquez sur « Modifier ».',
          'Mettez à jour les informations souhaitées.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Transférer un élève',
        steps: [
          'Ouvrez la fiche de l\'élève.',
          'Cliquez sur l\'onglet « Transferts ».',
          'Pour un transfert sortant : cliquez sur « + Transfert sortant », saisissez l\'établissement d\'accueil et la date effective.',
          'Pour un transfert entrant : créez l\'élève normalement et renseignez l\'établissement d\'origine dans l\'onglet Transferts.',
          'Le transfert est archivé dans l\'historique de l\'élève.',
        ],
      },
      {
        title: 'Changer un élève de classe',
        steps: [
          'Ouvrez la fiche de l\'élève.',
          'Cliquez sur « Modifier ».',
          'Changez le champ « Classe ».',
          'Cliquez sur « Enregistrer ». L\'élève est désormais rattaché à sa nouvelle classe.',
        ],
        callout: { type: 'note', text: 'Les notes et bulletins déjà créés restent associés à l\'élève, quelle que soit sa classe actuelle.' },
      },
    ],
  },

  // ── 6 ──────────────────────────────────────────────────────────────────────
  {
    num: 6,
    title: 'Classes, Matières et Emploi du temps',
    icon: '📚',
    sections: [
      {
        title: 'Créer une classe',
        steps: [
          'Allez dans le menu → Classes.',
          'Cliquez sur « + Nouvelle classe ».',
          'Saisissez le nom de la classe (ex : CM2-A, 3ème B, Terminale C).',
          'Sélectionnez le niveau (Primaire, Collège, Lycée) et la filière si applicable.',
          'Assignez un titulaire (l\'enseignant responsable de la classe).',
          'Cliquez sur « Créer ».',
        ],
      },
      {
        title: 'Consulter la liste d\'une classe',
        steps: [
          'Allez dans le menu → Classes.',
          'Cliquez sur le nom d\'une classe.',
          'Vous voyez la liste des élèves, les matières et les statistiques de la classe.',
          'Le palmarès de la classe (classement par moyenne) est accessible via le bouton « Palmarès ».',
        ],
      },
      {
        title: 'Créer les matières et coefficients',
        steps: [
          'Allez dans le menu → Matières.',
          'Cliquez sur « + Nouvelle matière ».',
          'Saisissez le nom (ex : Mathématiques), la catégorie (optionnel) et le coefficient.',
          'Pour les cours primaires : activez « Note sur 10 » si la note maximale est 10.',
          'Cliquez sur « Créer ».',
          'Répétez pour chaque matière de votre programme.',
        ],
        callout: { type: 'tip', text: 'Le coefficient influe directement sur le calcul de la moyenne générale. Vérifiez les coefficients officiels de votre programme pédagogique avant la saisie.' },
      },
      {
        title: 'Profil d\'une matière',
        steps: [
          'Cliquez sur une matière dans la liste.',
          'Vous consultez l\'historique des moyennes par classe et par période.',
          'Modifiez le nom ou le coefficient via le bouton « Modifier ».',
        ],
      },
      {
        title: 'Construire l\'emploi du temps',
        steps: [
          'Allez dans le menu → Emploi du temps.',
          'Sélectionnez la classe concernée.',
          'Cliquez sur un créneau horaire dans la grille hebdomadaire.',
          'Choisissez la matière, l\'enseignant assigné et la salle.',
          'Le système détecte automatiquement les conflits (même enseignant ou même salle à la même heure).',
          'Cliquez sur « Appliquer ». L\'emploi du temps est visible par les enseignants et élèves.',
          'Pour supprimer un créneau : cliquez dessus et choisissez « Supprimer ».',
        ],
      },
    ],
  },

  // ── 7 ──────────────────────────────────────────────────────────────────────
  {
    num: 7,
    title: 'Saisie et validation des notes',
    icon: '✏️',
    sections: [
      {
        title: 'Les fiches de notes',
        content: `Une fiche de notes est le document officiel de saisie des résultats d'une matière pour une classe et une période données. Chaque enseignant a accès aux fiches des matières qu'il enseigne.

Cycle de vie d'une fiche :
• Ouverte → L'enseignant saisit les notes.
• Signée → L'enseignant valide la fiche. Plus aucune modification n'est possible.
• Publiée → Les notes sont intégrées dans les bulletins.`,
      },
      {
        title: 'Saisir les notes (Enseignant)',
        steps: [
          'Allez dans le menu → Fiches de notes.',
          'Sélectionnez la période (trimestre/semestre) et la classe.',
          'Cliquez sur la matière correspondante.',
          'Saisissez la note de chaque élève dans le tableau. Appuyez sur Tab pour passer à l\'élève suivant.',
          'La moyenne de la classe se calcule automatiquement en temps réel.',
          'Cliquez sur « Enregistrer les notes ».',
        ],
        callout: { type: 'tip', text: 'Les notes sont sauvegardées automatiquement toutes les 30 secondes. Vous pouvez interrompre et reprendre la saisie à tout moment.' },
      },
      {
        title: 'Signer une fiche de notes',
        steps: [
          'Une fois toutes les notes saisies, cliquez sur « Signer la fiche ».',
          'Confirmez dans la boîte de dialogue.',
          'La fiche passe à l\'état « Signée ». Elle ne peut plus être modifiée.',
          'Si une correction est nécessaire après signature, l\'administrateur peut déverrouiller la fiche.',
        ],
        callout: { type: 'warning', text: 'Ne signez la fiche que lorsque toutes les notes sont définitives. Une fiche signée ne peut être modifiée que par un administrateur.' },
      },
      {
        title: 'Imprimer une fiche de notes',
        steps: [
          'Ouvrez la fiche de notes souhaitée.',
          'Cliquez sur « Imprimer la fiche ».',
          'Votre navigateur ouvre la fenêtre d\'impression.',
          'Sélectionnez « Enregistrer en PDF » comme imprimante pour conserver un exemplaire numérique.',
        ],
      },
      {
        title: 'Saisie des notes pour les examens blancs',
        content: `La saisie des notes pour les examens blancs fonctionne de la même manière, mais via le menu → Examens blancs. Consultez le Chapitre 12 pour le détail complet.`,
      },
    ],
  },

  // ── 8 ──────────────────────────────────────────────────────────────────────
  {
    num: 8,
    title: 'Bulletins scolaires',
    icon: '📋',
    sections: [
      {
        title: 'Processus de création d\'un bulletin',
        content: `Le bulletin scolaire est le document central d'E-Report. Voici le processus complet :

1. L'administrateur configure la période (trimestre/semestre) dans les Paramètres.
2. Les enseignants saisissent les notes dans leurs fiches de notes.
3. Les enseignants signent leurs fiches pour les valider.
4. L'administrateur (ou l'enseignant titulaire) crée le bulletin, vérifie les notes et le publie.
5. Le bulletin est envoyé aux parents par email/WhatsApp (sauf si le verrou de frais est actif).`,
      },
      {
        title: 'Créer et publier un bulletin',
        steps: [
          'Allez dans le menu → Bulletins.',
          'Cliquez sur « + Nouveau bulletin ».',
          'Sélectionnez la classe, la période et l\'année scolaire.',
          'Les notes déjà saisies par les enseignants apparaissent automatiquement.',
          'Vérifiez et complétez les notes manquantes si nécessaire.',
          'Ajoutez une appréciation générale du conseil de classe (optionnel).',
          'Cliquez sur « Publier ». Le bulletin est désormais visible par les familles (si les frais sont à jour).',
        ],
        callout: { type: 'tip', text: 'Vous pouvez créer les bulletins de toute une classe en une seule opération en sélectionnant « Créer pour toute la classe ».' },
      },
      {
        title: 'Système de verrou de frais',
        content: `Si le verrou de frais est activé dans les Paramètres :

• Un bulletin publié n'est visible par la famille QUE si les frais scolaires sont payés.
• L'économe voit les bulletins retenus dans son tableau de bord (voir Chapitre 18).
• Dès qu'un paiement suffisant est enregistré, le bulletin est automatiquement débloqué.
• L'administrateur peut forcer la distribution d'un bulletin même avec des frais impayés.`,
        callout: { type: 'important', text: 'Le verrou de frais est un puissant outil de recouvrement. Activez-le uniquement si votre établissement a une politique claire en la matière.' },
      },
      {
        title: 'Imprimer ou télécharger un bulletin',
        steps: [
          'Ouvrez le bulletin concerné.',
          'Cliquez sur « Imprimer » ou l\'icône d\'impression.',
          'Votre navigateur ouvre la fenêtre d\'impression.',
          'Sélectionnez « Enregistrer en PDF » comme imprimante.',
          'Le bulletin est formaté avec le logo, les couleurs et les en-têtes de votre établissement.',
          'Pour imprimer tous les bulletins d\'une classe : allez dans Classes → sélectionnez la classe → « Imprimer tous les bulletins ».',
        ],
      },
      {
        title: 'Vérification d\'authenticité d\'un bulletin',
        content: `Chaque bulletin publié porte un code QR unique permettant à quiconque de vérifier son authenticité sur la page publique d'E-Report.

• Le code QR s'affiche en bas de chaque bulletin imprimé.
• En scannant ce code, le vérificateur accède à une page publique confirmant l'authenticité et les informations principales du bulletin.
• Cette fonctionnalité protège contre la falsification des bulletins.`,
        callout: { type: 'tip', text: 'Encouragez les établissements et employeurs qui reçoivent des bulletins E-Report à utiliser la vérification QR pour confirmer l\'authenticité.' },
      },
      {
        title: 'Palmarès de classe',
        steps: [
          'Allez dans le menu → Classes → sélectionnez une classe.',
          'Cliquez sur « Palmarès ».',
          'Le palmarès affiche le classement des élèves par moyenne générale pour la période sélectionnée.',
          'Cliquez sur « Imprimer le palmarès » pour en obtenir une version imprimable.',
        ],
      },
      {
        title: 'Rapport annuel',
        steps: [
          'Allez dans le menu → Rapport annuel.',
          'Sélectionnez l\'année scolaire.',
          'Le rapport synthétise : effectifs, taux de réussite, moyennes par classe, taux de recouvrement des frais.',
          'Cliquez sur « Imprimer » pour en garder une copie.',
        ],
      },
    ],
  },

  // ── 9 ──────────────────────────────────────────────────────────────────────
  {
    num: 9,
    title: 'Finances et frais scolaires',
    icon: '💰',
    sections: [
      {
        title: 'Définir les postes de frais',
        steps: [
          'Allez dans le menu → Frais scolaires.',
          'Cliquez sur « + Nouveau poste de frais ».',
          'Saisissez le nom du poste (ex : Scolarité T1, Inscription, Transport, Cantine).',
          'Définissez le montant et la classe cible (ou « Toutes les classes »).',
          'Précisez si ce poste est obligatoire ou optionnel.',
          'Cliquez sur « Créer ».',
        ],
        callout: { type: 'tip', text: 'Créez des postes distincts pour chaque type de frais (scolarité, inscription, transport) plutôt qu\'un seul poste global. Cela facilite le suivi et les relances ciblées.' },
      },
      {
        title: 'Enregistrer un paiement',
        steps: [
          'Allez dans le menu → Paiements.',
          'Cliquez sur « + Nouveau paiement ».',
          'Recherchez l\'élève par nom ou numéro d\'admission.',
          'Saisissez le montant reçu et la méthode de paiement (espèces, mobile money, chèque, virement).',
          'Ajoutez une référence optionnelle (numéro de reçu, référence mobile money).',
          'Cliquez sur « Enregistrer ». Le reçu peut être imprimé immédiatement.',
        ],
      },
      {
        title: 'Imprimer un reçu de paiement',
        steps: [
          'Après avoir enregistré un paiement, cliquez sur « Reçu PDF ».',
          'La fenêtre d\'impression s\'ouvre avec un reçu formaté.',
          'Sélectionnez votre imprimante ou « Enregistrer en PDF ».',
          'Vous pouvez aussi retrouver les paiements passés dans la liste des paiements et imprimer le reçu à tout moment.',
        ],
      },
      {
        title: 'Plans de paiement échelonnés',
        content: `Un plan de paiement permet à une famille de régler les frais en plusieurs versements selon un calendrier défini.`,
        steps: [
          'Allez dans le menu → Plans de paiement.',
          'Cliquez sur « + Nouveau plan ».',
          'Recherchez et sélectionnez l\'élève concerné.',
          'Saisissez le montant total du plan.',
          'Ajoutez les échéances : pour chaque versement, renseignez la date d\'échéance et le montant.',
          'Cliquez sur « + Ajouter une échéance » pour en ajouter plusieurs.',
          'Cliquez sur « Créer le plan ».',
          'Pour enregistrer un versement : ouvrez le plan, cliquez sur une échéance et saisissez le montant reçu.',
        ],
        callout: { type: 'tip', text: 'Utilisez les plans de paiement pour les familles en difficulté financière. Cela maintient la relation de confiance tout en sécurisant le recouvrement.' },
      },
      {
        title: 'Suivre les impayés et relancer les familles',
        steps: [
          'Allez dans le menu → Analytiques.',
          'Consultez le taux de recouvrement global et par classe.',
          'Identifiez les familles avec solde impayé dans la liste des paiements (filtre « Solde > 0 »).',
          'Utilisez la fonction de rappel : dans la fiche de l\'élève, cliquez sur « Envoyer un rappel » pour alerter le parent par email ou WhatsApp.',
        ],
      },
      {
        title: 'Paiements en ligne (espace parent)',
        content: `Les parents peuvent payer directement en ligne via mobile money (Flooz/TMoney) :

• Le parent ouvre la fiche de son enfant dans son espace.
• Il clique sur « Payer en ligne » et saisit le montant.
• Il est redirigé vers la page de paiement sécurisée Notchpay.
• Il valide depuis son téléphone (Flooz ou TMoney).
• Après confirmation, le paiement est automatiquement enregistré et un reçu est envoyé par email.
• Si les frais sont désormais couverts, le bulletin est automatiquement déverrouillé.`,
        callout: { type: 'note', text: 'Les paiements en ligne nécessitent que l\'administrateur ait configuré ses clés Notchpay dans les Paramètres (voir Chapitre 2.5).' },
      },
      {
        title: 'Exonérer un élève',
        steps: [
          'Ouvrez la fiche de l\'élève, onglet « Paiements ».',
          'Cliquez sur « Exonérer » en face du poste de frais concerné.',
          'Confirmez l\'exonération. L\'élève est marqué comme exonéré pour ce poste.',
          'L\'exonération est prise en compte dans les statistiques de recouvrement.',
        ],
      },
    ],
  },

  // ── 10 ─────────────────────────────────────────────────────────────────────
  {
    num: 10,
    title: 'Présences et discipline',
    icon: '📅',
    sections: [
      {
        title: 'Enregistrer les présences',
        steps: [
          'Allez dans le menu → Présences.',
          'Sélectionnez la classe et la date.',
          'Pour chaque élève, cochez : Présent (P), Absent (A), Retard (R) ou Excusé (E).',
          'Ajoutez une note optionnelle pour les absences (motif, justificatif).',
          'Cliquez sur « Enregistrer ».',
          'Le récapitulatif des absences est mis à jour automatiquement dans le profil de chaque élève.',
        ],
        callout: { type: 'tip', text: 'Les présences peuvent être saisies par l\'enseignant titulaire depuis son espace. Il n\'est pas nécessaire que l\'administrateur le fasse.' },
      },
      {
        title: 'Consulter les absences d\'un élève',
        steps: [
          'Ouvrez la fiche de l\'élève, onglet « Présences ».',
          'Le tableau affiche toutes les absences, retards et excuses avec les dates et motifs.',
          'Le cumul total d\'heures d\'absence est affiché en en-tête.',
        ],
      },
      {
        title: 'Rapport d\'absences de classe',
        steps: [
          'Allez dans le menu → Présences.',
          'Sélectionnez une classe et une période (semaine, mois, trimestre).',
          'Le tableau récapitulatif affiche le taux de présence de chaque élève.',
          'Cliquez sur « Exporter » pour obtenir un fichier CSV du rapport.',
        ],
      },
      {
        title: 'Gérer les dossiers disciplinaires',
        steps: [
          'Allez dans le menu → Discipline.',
          'Cliquez sur « + Nouveau dossier ».',
          'Sélectionnez l\'élève concerné.',
          'Choisissez le type : Avertissement, Suspension, Exclusion, Félicitation, Note d\'observation, Autre.',
          'Décrivez l\'incident ou la raison de la sanction.',
          'Cliquez sur « Créer ».',
          'Le dossier apparaît dans la fiche de l\'élève et dans la liste générale.',
          'Marquez le dossier comme « Résolu » une fois l\'affaire réglée.',
        ],
      },
      {
        title: 'Statistiques disciplinaires',
        steps: [
          'Allez dans le menu → Discipline.',
          'Utilisez les filtres par type, statut ou classe pour analyser les incidents.',
          'Les dossiers non résolus apparaissent en priorité.',
        ],
      },
    ],
  },

  // ── 11 ─────────────────────────────────────────────────────────────────────
  {
    num: 11,
    title: 'Signalements d\'incidents',
    icon: '🚨',
    sections: [
      {
        title: 'À quoi servent les signalements ?',
        content: `Le module de signalements permet aux parents et aux élèves de rapporter anonymement ou officiellement des incidents : harcèlement, violence, problème de sécurité, etc. L'administrateur reçoit les signalements et peut les traiter.

Statuts possibles :
• En attente (PENDING) — Signalement reçu, non encore traité.
• En cours d'examen (UNDER_REVIEW) — L'administration examine le signalement.
• Résolu (RESOLVED) — L'incident a été traité.
• Classé sans suite (DISMISSED) — Le signalement n'a pas nécessité d'action.`,
      },
      {
        title: 'Soumettre un signalement (Parent ou Élève)',
        steps: [
          'Allez dans le menu → Signaler un incident.',
          'Décrivez l\'incident : titre, catégorie, date et description détaillée.',
          'Vous pouvez choisir de rester anonyme.',
          'Cliquez sur « Soumettre ».',
          'Un accusé de réception vous est envoyé. L\'administration est notifiée.',
        ],
      },
      {
        title: 'Gérer les signalements (Administrateur)',
        steps: [
          'Allez dans le menu → Signalements.',
          'La liste affiche tous les signalements avec leur statut.',
          'Utilisez le filtre par statut pour prioriser les signalements en attente.',
          'Cliquez sur un signalement pour l\'ouvrir.',
          'Modifiez le statut (ex : En cours d\'examen) et ajoutez des notes administratives internes.',
          'Cliquez sur « Enregistrer ».',
        ],
        callout: { type: 'important', text: 'Traitez les signalements dans les 48h. Un signalement non traité peut nuire à la confiance des familles envers l\'établissement.' },
      },
    ],
  },

  // ── 12 ─────────────────────────────────────────────────────────────────────
  {
    num: 12,
    title: 'Examens blancs',
    icon: '📝',
    sections: [
      {
        title: 'Créer une session d\'examen blanc',
        steps: [
          'Allez dans le menu → Examens blancs.',
          'Cliquez sur « + Nouvel examen blanc ».',
          'Saisissez le nom (ex : Examen blanc BEPC — Juin 2025).',
          'Choisissez le type : CEPE, BEPC, BAC ou autre.',
          'Renseignez la date de l\'examen.',
          'Sélectionnez les classes participantes.',
          'Cliquez sur « Créer ».',
        ],
      },
      {
        title: 'Saisir les notes d\'un examen blanc',
        steps: [
          'Dans la liste des examens blancs, ouvrez la session concernée.',
          'Cliquez sur « Fiches de notes ».',
          'Sélectionnez une matière et saisissez les notes des élèves.',
          'Cliquez sur « Enregistrer ».',
          'Répétez pour chaque matière.',
        ],
      },
      {
        title: 'Consulter les résultats et le palmarès',
        steps: [
          'Dans l\'examen blanc, allez dans l\'onglet « Résultats ».',
          'Une fois toutes les notes saisies, les moyennes et le classement sont calculés automatiquement.',
          'Consultez le palmarès général et le palmarès par classe.',
          'Cliquez sur « Imprimer le palmarès » pour en obtenir une version imprimable.',
          'Cliquez sur « Relevé de notes » pour accéder au relevé individuel de chaque élève.',
        ],
      },
    ],
  },

  // ── 13 ─────────────────────────────────────────────────────────────────────
  {
    num: 13,
    title: 'Registres de l\'établissement',
    icon: '🗂️',
    sections: [
      {
        title: 'Bibliothèque — Catalogue et prêts',
        steps: [
          'Allez dans le menu → Bibliothèque.',
          'Onglet « Catalogue » : ajoutez les livres disponibles (titre, quantité, état, emplacement).',
          'Onglet « Prêts en cours » : enregistrez un nouveau prêt (livre + emprunteur + date de retour prévue).',
          'Onglet « Historique » : consultez tous les prêts passés.',
          'Cliquez sur « Rendre » pour enregistrer le retour d\'un livre et noter son état au retour.',
        ],
      },
      {
        title: 'Inventaire',
        steps: [
          'Allez dans le menu → Inventaire.',
          'Cliquez sur « + Ajouter un équipement ».',
          'Renseignez : nom, catégorie (Mobilier, Informatique, Sport, Laboratoire, Autre), quantité, état, emplacement, fournisseur, valeur d\'achat et date d\'acquisition.',
          'Cliquez sur « Enregistrer ».',
          'Le tableau de bord inventaire affiche la valeur totale estimée du parc matériel.',
        ],
      },
      {
        title: 'Registre des achats',
        content: `Le registre des achats trace toutes les acquisitions effectuées par l'établissement (mobilier, fournitures, équipements).`,
        steps: [
          'Allez dans le menu → Achats.',
          'Cliquez sur « + Nouvel achat ».',
          'Renseignez : date, désignation de l\'article, modèle, prix et notes éventuelles.',
          'Cliquez sur « Enregistrer ».',
          'Le tableau de bord affiche le total dépensé sur la période.',
          'Utilisez la barre de recherche pour retrouver un achat précis.',
          'Cliquez sur « Exporter CSV » pour exporter le registre vers Excel.',
        ],
        callout: { type: 'tip', text: 'Remplissez le registre des achats dès réception d\'une facture. Cela simplifie la comptabilité et les audits de l\'établissement.' },
      },
      {
        title: 'Santé',
        steps: [
          'Allez dans le menu → Santé.',
          'Recherchez un élève par nom.',
          'Cliquez sur l\'élève pour ouvrir sa fiche médicale.',
          'Enregistrez : visites médicales, accidents, vaccinations et traitements en cours.',
          'La fiche médicale est aussi consultable depuis le profil de l\'élève, onglet « Santé ».',
        ],
      },
      {
        title: 'Documents officiels',
        steps: [
          'Allez dans le menu → Documents.',
          'Cliquez sur « + Télécharger un document ».',
          'Sélectionnez le fichier (PDF, Word, Excel).',
          'Choisissez la visibilité : visible par tous, enseignants uniquement, ou administration uniquement.',
          'Cliquez sur « Enregistrer ».',
          'Les documents partagés sont accessibles par les utilisateurs selon leur rôle.',
        ],
      },
      {
        title: 'Anciens élèves',
        steps: [
          'Allez dans le menu → Anciens élèves.',
          'Cliquez sur « + Ajouter un diplômé ».',
          'Renseignez : année de diplomation, classe de sortie, numéro de diplôme et résultats aux examens nationaux.',
          'Cliquez sur « Enregistrer ».',
          'Consultez la liste pour suivre les carrières post-scolaires.',
        ],
      },
      {
        title: 'Examens nationaux',
        steps: [
          'Allez dans le menu → Examens nationaux.',
          'Cliquez sur « + Ajouter un résultat ».',
          'Sélectionnez l\'élève et l\'examen (CEPE, BEPC, BAC).',
          'Renseignez : numéro de candidat, session, mention et résultat (Admis/Refusé).',
          'Cliquez sur « Enregistrer ». Ces résultats sont archivés dans le dossier de l\'élève.',
        ],
      },
    ],
  },

  // ── 14 ─────────────────────────────────────────────────────────────────────
  {
    num: 14,
    title: 'Communication et annonces',
    icon: '📢',
    sections: [
      {
        title: 'Publier une annonce',
        steps: [
          'Allez dans le menu → Annonces.',
          'Cliquez sur « + Nouvelle annonce ».',
          'Rédigez le titre et le contenu de l\'annonce.',
          'Choisissez la cible : toutes les classes, une classe spécifique, ou un rôle (parents uniquement, enseignants uniquement).',
          'Cliquez sur « Publier ». L\'annonce est immédiatement visible dans l\'espace des destinataires.',
        ],
      },
      {
        title: 'Calendrier scolaire',
        steps: [
          'Allez dans le menu → Calendrier.',
          'Cliquez sur une date pour créer un événement.',
          'Renseignez : titre, type (Vacances, Examen, Réunion parents-profs, Sortie scolaire, Autre), date de début et de fin.',
          'Cliquez sur « Enregistrer ». L\'événement apparaît dans les calendriers de tous les rôles.',
        ],
      },
      {
        title: 'Notifications WhatsApp et Email',
        content: `E-Report envoie automatiquement des notifications aux parents lors de :
• La publication d'un nouveau bulletin.
• La confirmation d'un paiement.
• La publication d'une annonce importante.
• Un rappel de paiement si des frais sont en retard.

Les parents peuvent configurer leurs préférences (WhatsApp / email / les deux) depuis leur profil.`,
        callout: { type: 'note', text: 'Les notifications WhatsApp nécessitent que le parent ait renseigné un numéro de téléphone valide dans son profil.' },
      },
      {
        title: 'Journal des notifications',
        content: `Le journal des notifications permet à l'administrateur de voir toutes les notifications envoyées ou en attente.`,
        steps: [
          'Allez dans le menu → Notifications.',
          'Onglet « Bulletins retenus » : liste des notifications bloquées par le verrou de frais.',
          'Pour forcer l\'envoi d\'une notification retenue : cliquez sur « Envoyer maintenant ».',
          'Bouton « Envoyer le lien de paiement » : envoie un lien de paiement WhatsApp directement au parent.',
          'Onglet « Mes notifications » : historique des notifications reçues dans votre espace.',
        ],
        callout: { type: 'tip', text: 'Utilisez « Envoyer le lien de paiement » pour des relances rapides et efficaces. Le parent reçoit un lien WhatsApp pour payer directement depuis son téléphone.' },
      },
    ],
  },

  // ── 15 ─────────────────────────────────────────────────────────────────────
  {
    num: 15,
    title: 'LMS — Espace d\'apprentissage en ligne',
    icon: '🎯',
    sections: [
      {
        title: 'À quoi sert le LMS ?',
        content: `Le module LMS (Learning Management System) permet aux enseignants de partager des ressources pédagogiques avec leurs classes et aux élèves/parents de les consulter à distance.

Types de ressources disponibles :
• Cours — Leçons et fiches de cours.
• Exercices — Exercices d'application.
• Devoirs — Travaux à rendre.
• Quiz — Questionnaires d'évaluation.
• Annonces — Communications de classe.`,
      },
      {
        title: 'Publier une ressource (Enseignant)',
        steps: [
          'Allez dans le menu → Apprentissage.',
          'Cliquez sur « + Nouvelle ressource ».',
          'Choisissez le type : Cours, Exercice, Devoir, Quiz ou Annonce.',
          'Rédigez le titre et le contenu ou joignez un fichier (PDF, image, document).',
          'Sélectionnez la classe et la matière destinataires.',
          'Définissez une date de rendu si c\'est un devoir.',
          'Cliquez sur « Publier ».',
        ],
      },
      {
        title: 'Consulter les ressources (Élève / Parent)',
        steps: [
          'Allez dans le menu → Apprentissage.',
          'Naviguez entre les onglets : Cours, Devoirs, Quiz, Annonces.',
          'Cliquez sur une ressource pour la consulter ou la télécharger.',
          'Pour les devoirs : consultez la date de rendu et soumettez votre travail directement depuis la plateforme.',
        ],
      },
    ],
  },

  // ── 16 ─────────────────────────────────────────────────────────────────────
  {
    num: 16,
    title: 'Analytiques et rapports',
    icon: '📊',
    sections: [
      {
        title: 'Tableau de bord administrateur',
        content: `Le tableau de bord de l'administrateur offre une vue d'ensemble de l'établissement en temps réel :

• Nombre d'élèves inscrits, d'enseignants, de classes actives.
• Nombre de bulletins publiés sur la période en cours.
• Taux de recouvrement des frais (montant encaissé / montant attendu).
• Liste des paiements récents.
• Bulletins en attente de publication.

Des graphiques interactifs permettent de visualiser la répartition par classe et les tendances au fil du temps.`,
      },
      {
        title: 'Tableau de bord analytiques financières',
        steps: [
          'Allez dans le menu → Analytiques.',
          'Sélectionnez l\'année scolaire à analyser.',
          'Consultez : taux de recouvrement global, répartition Payé / Partiel / Impayé / Exonéré.',
          'Graphique en barres : encaissements par classe.',
          'Graphique circulaire : répartition des statuts de paiement.',
          'Cliquez sur « Exporter le rapport » pour télécharger un CSV complet.',
        ],
      },
      {
        title: 'Statistiques de classe',
        steps: [
          'Allez dans le menu → Classes → sélectionnez une classe.',
          'Cliquez sur « Statistiques ».',
          'Vous consultez : moyenne de classe par matière, distribution des notes, taux de réussite.',
          'Comparez les résultats entre trimestres pour suivre la progression de la classe.',
        ],
      },
      {
        title: 'Rapport annuel',
        steps: [
          'Allez dans le menu → Rapport annuel.',
          'Sélectionnez l\'année scolaire.',
          'Le rapport synthétise toutes les données de l\'année : effectifs, résultats, finances, présences.',
          'Cliquez sur « Imprimer » pour générer la version imprimable destinée aux autorités.',
        ],
      },
      {
        title: 'Exports de données',
        content: `Plusieurs exports sont disponibles selon la section :
• Paiements → Export CSV de tous les paiements.
• Élèves → Export CSV de la liste des élèves.
• Achats → Export CSV du registre des achats.
• Analytiques → Export du rapport financier complet.
• Paramètres → Export complet des données de l\'établissement.`,
      },
    ],
  },

  // ── 17 ─────────────────────────────────────────────────────────────────────
  {
    num: 17,
    title: 'Espace Enseignant',
    icon: '👨‍🏫',
    sections: [
      {
        title: 'Tableau de bord enseignant',
        content: `Le tableau de bord de l'enseignant affiche :
• Ses classes assignées pour l'année en cours.
• Les fiches de notes en attente de signature.
• Les bulletins à compléter ou à publier.
• L'emploi du temps de la semaine.
• Les annonces récentes.`,
      },
      {
        title: 'Mes classes',
        steps: [
          'Allez dans le menu → Mes classes.',
          'Vous voyez la liste des classes où vous enseignez.',
          'Cliquez sur une classe pour accéder à la liste des élèves, aux présences et aux statistiques.',
        ],
      },
      {
        title: 'Saisir les notes',
        steps: [
          'Allez dans le menu → Fiches de notes.',
          'Sélectionnez le trimestre et la classe.',
          'Saisissez les notes dans le tableau.',
          'Cliquez sur « Enregistrer les notes ».',
          'Cliquez sur « Signer la fiche » pour valider définitivement.',
        ],
      },
      {
        title: 'Créer un bulletin (Enseignant titulaire)',
        steps: [
          'Allez dans le menu → Bulletins.',
          'Cliquez sur « + Nouveau bulletin ».',
          'Sélectionnez votre classe et la période.',
          'Vérifiez les notes et ajoutez vos appréciations de conseil de classe.',
          'Cliquez sur « Publier ».',
        ],
      },
      {
        title: 'Enregistrer les présences',
        steps: [
          'Allez dans le menu → Présences.',
          'Sélectionnez votre classe et la date.',
          'Cochez le statut de chaque élève (Présent / Absent / Retard / Excusé).',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Programme pédagogique',
        steps: [
          'Allez dans le menu → Programme.',
          'Consultez et mettez à jour le programme de vos matières : chapitres traités, progression.',
          'Cette information est visible par l\'administration.',
        ],
      },
      {
        title: 'Feuille de route enseignant',
        steps: [
          'Allez dans le menu → Feuille de route.',
          'Consultez votre plan de cours et vos objectifs pédagogiques pour l\'année.',
          'Mettez à jour votre avancement au fil des semaines.',
        ],
      },
      {
        title: 'Profil d\'un élève (vue enseignant)',
        steps: [
          'Allez dans le menu → Profil élève.',
          'Recherchez un élève de vos classes.',
          'Consultez ses absences, ses notes et son profil disciplinaire.',
        ],
        callout: { type: 'note', text: 'En tant qu\'enseignant, vous ne voyez que les élèves de vos propres classes. L\'accès aux informations financières est réservé à l\'administrateur et à l\'économe.' },
      },
    ],
  },

  // ── 18 ─────────────────────────────────────────────────────────────────────
  {
    num: 18,
    title: 'Espace Économe',
    icon: '💼',
    sections: [
      {
        title: 'Tableau de bord économe',
        content: `Le tableau de bord de l'économe affiche en temps réel :
• Total encaissé sur la période sélectionnée (aujourd'hui / semaine / mois / tout).
• Répartition des paiements par classe (graphique en barres).
• Liste des paiements récents avec statut.
• Bulletins retenus en attente de paiement.

Utilisez le filtre de période en haut à droite pour afficher les données du jour, de la semaine ou du mois.`,
      },
      {
        title: 'Enregistrer un paiement',
        steps: [
          'Allez dans le menu → Paiements.',
          'Cliquez sur « + Nouveau paiement ».',
          'Recherchez l\'élève par nom ou numéro d\'admission.',
          'Saisissez le montant, la méthode (espèces, mobile money, chèque) et une référence optionnelle.',
          'Cliquez sur « Enregistrer ».',
          'Imprimez le reçu immédiatement via le bouton « Reçu PDF ».',
        ],
      },
      {
        title: 'Bulletins retenus',
        steps: [
          'Allez dans le menu → Notifications.',
          'Onglet « Bulletins retenus » : liste des élèves dont le bulletin est bloqué faute de paiement.',
          'Après avoir enregistré un paiement suffisant, le bulletin est automatiquement débloqué.',
          'Cliquez sur « Envoyer maintenant » pour notifier immédiatement la famille.',
          'Cliquez sur « Lien de paiement » pour envoyer un lien de paiement WhatsApp au parent.',
        ],
      },
      {
        title: 'Plans de paiement',
        steps: [
          'Allez dans le menu → Plans de paiement.',
          'Consultez l\'ensemble des plans actifs.',
          'Pour chaque plan, cliquez dessus pour voir le détail des échéances.',
          'Enregistrez les versements en cliquant sur l\'échéance et en saisissant le montant reçu.',
        ],
      },
    ],
  },

  // ── 19 ─────────────────────────────────────────────────────────────────────
  {
    num: 19,
    title: 'Espace Parent',
    icon: '👨‍👩‍👧',
    sections: [
      {
        title: 'Tableau de bord parent',
        content: `Le tableau de bord parent affiche :
• La liste de vos enfants inscrits dans l'établissement.
• Le statut des frais scolaires de chaque enfant.
• Les dernières annonces de l'école.
• Les événements à venir dans le calendrier scolaire.`,
      },
      {
        title: 'Consulter les bulletins de son enfant',
        steps: [
          'Allez dans le menu → Mes enfants.',
          'Cliquez sur l\'enfant concerné.',
          'Cliquez sur le trimestre ou la période pour ouvrir le bulletin.',
          'Si le bulletin est bloqué (icône cadenas), réglez les frais en ligne ou contactez l\'économe de l\'école.',
        ],
      },
      {
        title: 'Payer en ligne',
        steps: [
          'Ouvrez la fiche de votre enfant.',
          'Cliquez sur « Payer en ligne ».',
          'Saisissez le montant à payer.',
          'Choisissez votre opérateur : Flooz (Moov) ou TMoney (Togocel).',
          'Vous êtes redirigé vers la page de paiement sécurisée.',
          'Validez le paiement depuis votre téléphone.',
          'Un reçu vous est envoyé par email dans les minutes qui suivent.',
        ],
      },
      {
        title: 'Consulter l\'historique des paiements',
        steps: [
          'Allez dans le menu → Historique des paiements.',
          'Vous voyez tous les paiements effectués pour vos enfants, avec les montants et les dates.',
          'Téléchargez un reçu en cliquant sur l\'icône à côté de chaque paiement.',
        ],
      },
      {
        title: 'Consulter les absences de son enfant',
        steps: [
          'Allez dans le menu → Absences.',
          'Le tableau affiche toutes les absences et retards de votre enfant.',
          'Contactez l\'école pour toute absence injustifiée.',
        ],
      },
      {
        title: 'Préférences de notification',
        steps: [
          'Allez dans le menu → Notifications.',
          'Choisissez comment recevoir les alertes : Email, WhatsApp ou les deux.',
          'Vérifiez que votre numéro de téléphone est correct pour les notifications WhatsApp.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
    ],
  },

  // ── 20 ─────────────────────────────────────────────────────────────────────
  {
    num: 20,
    title: 'Espace Élève',
    icon: '🧑‍🎓',
    sections: [
      {
        title: 'Tableau de bord élève',
        content: `Le tableau de bord de l'élève affiche :
• La moyenne générale du trimestre en cours.
• Les dernières notes publiées.
• L'emploi du temps de la semaine.
• Les devoirs à rendre.
• Les annonces de l'école et de la classe.`,
      },
      {
        title: 'Consulter ses bulletins',
        steps: [
          'Allez dans le menu → Mes bulletins.',
          'Sélectionnez le trimestre souhaité.',
          'Vous voyez vos notes par matière, vos moyennes et les appréciations de vos enseignants.',
          'Si votre bulletin est bloqué, signalez-le à vos parents pour régulariser les frais.',
        ],
      },
      {
        title: 'Suivre sa progression',
        steps: [
          'Allez dans le menu → Ma progression.',
          'Le graphique montre l\'évolution de votre moyenne générale trimestre par trimestre.',
          'Cliquez sur « Voir par matière » pour détailler vos résultats discipline par discipline.',
          'Le tableau affiche votre moyenne par matière pour chaque période.',
        ],
      },
      {
        title: 'Accéder aux cours (LMS)',
        steps: [
          'Allez dans le menu → Apprentissage.',
          'Consultez les cours, exercices et devoirs publiés par vos enseignants.',
          'Soumettez vos travaux directement depuis la plateforme.',
        ],
      },
    ],
  },

  // ── 21 ─────────────────────────────────────────────────────────────────────
  {
    num: 21,
    title: 'Conseils et bonnes pratiques',
    icon: '💡',
    sections: [
      {
        title: 'Ordre recommandé pour démarrer',
        steps: [
          '1. Complétez l\'assistant de démarrage (Paramètres → Configuration initiale).',
          '2. Personnalisez l\'Apparence (logo, couleurs, nom de l\'établissement).',
          '3. Configurez les clés Notchpay pour les paiements en ligne (si souhaité).',
          '4. Créez les Matières avec leurs coefficients corrects.',
          '5. Créez les Classes et assignez les titulaires.',
          '6. Créez les comptes Utilisateurs (enseignants, économe).',
          '7. Importez ou ajoutez les Élèves.',
          '8. Associez les parents aux élèves (pour les notifications et bulletins).',
          '9. Définissez les Frais scolaires par poste.',
          '10. Construisez l\'Emploi du temps.',
          '11. Les enseignants peuvent maintenant saisir les notes.',
          '12. Publiez les bulletins à la fin de chaque période.',
        ],
      },
      {
        title: 'Conseils pour une utilisation optimale',
        content: `• Sauvegardez toujours avant de fermer : cliquez sur « Enregistrer » avant de quitter un formulaire.
• Nommez les classes clairement : utilisez des noms officiels (3ème A, Terminale C) pour éviter les confusions.
• Signez les fiches de notes avant la date limite : planifiez un rappel à vos enseignants.
• Activez le verrou de frais en début d'année pour maximiser le recouvrement.
• Utilisez l'export CSV régulièrement pour sauvegarder vos données en local.
• Vérifiez le journal des notifications après chaque publication de bulletin pour s'assurer que tous les parents ont été notifiés.`,
      },
      {
        title: 'Sécurité et confidentialité',
        content: `• Ne partagez jamais votre mot de passe, même avec des collègues.
• Changez votre mot de passe tous les 3 mois.
• Déconnectez-vous après chaque session sur un ordinateur partagé ou public.
• Ne communiquez pas les données d'élèves (notes, informations personnelles) par WhatsApp ou email non sécurisé.
• En cas de compte compromis, changez immédiatement votre mot de passe et contactez l'administrateur.`,
        callout: { type: 'warning', text: 'Ne communiquez jamais vos identifiants de connexion à un tiers, même au support technique. Le support E-Report ne demande jamais votre mot de passe.' },
      },
      {
        title: 'Problèmes fréquents et solutions',
        content: `• Bulletin non visible par les parents → Vérifiez que le bulletin est bien publié (statut vert) et que les frais sont réglés si le verrou est actif.
• Notes non affichées sur le bulletin → Vérifiez que l'enseignant a bien signé sa fiche de notes.
• Parent ne reçoit pas les notifications → Vérifiez l'email et le numéro de téléphone dans le profil parent.
• Paiement en ligne non confirmé → Attendez 5 minutes et rafraîchissez la page. Si le problème persiste, contactez le support Notchpay.
• Emploi du temps en conflit → Le système signale le conflit automatiquement. Réassignez l'enseignant ou changez le créneau.`,
      },
      {
        title: 'Support technique',
        content: `Pour toute question ou problème technique :
• Consultez d'abord ce guide ou l'assistant IA intégré (bouton flottant en bas à droite).
• Contactez le support E-Report via l'adresse email de votre établissement.
• Décrivez précisément le problème et joignez une capture d'écran si possible.
• Les demandes urgentes (bulletin bloqué, paiement non enregistré) sont traitées en priorité.

Heures de support : Lundi – Vendredi, 8h – 18h (heure de Lomé, GMT+0).`,
      },
    ],
  },
];

// ─── COMPONENT ─────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  const [activeChapter, setActiveChapter] = useState(null);
  const contentRef = useRef(null);

  function handlePrint() {
    document.body.classList.add('guide-print-mode');
    window.print();
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('guide-print-mode');
    }, { once: true });
    setTimeout(() => document.body.classList.remove('guide-print-mode'), 3000);
  }

  return (
    <AppShell>
      <div className="help-screen-header">
        <PageHeader
          title="Guide d'utilisation"
          subtitle="Manuel complet — E-Report"
        />
        <div className="help-screen-actions">
          <Button onClick={handlePrint} size="sm">
            ⬇ Télécharger le guide (PDF)
          </Button>
        </div>
      </div>

      <div className="help-book" ref={contentRef}>

        {/* ── Cover ── */}
        <div className="help-cover">
          <div className="help-cover__band" />
          <div className="help-cover__stripe" />
          <div className="help-cover__content">
            <div className="help-cover__logo">E-Report</div>
            <div className="help-cover__divider" />
            <h1 className="help-cover__title">Guide d'utilisation</h1>
            <p className="help-cover__subtitle">Manuel complet de la plateforme de gestion scolaire</p>
            <p className="help-cover__version">Version 2.0 — 2025</p>
            <div className="help-cover__roles">
              <span>👤 Administrateur</span>
              <span>👨‍🏫 Enseignant</span>
              <span>💼 Économe</span>
              <span>👨‍👩‍👧 Parent</span>
              <span>🧑‍🎓 Élève</span>
            </div>
            <div className="help-cover__chapters-count">{CHAPTERS.length} chapitres · Guide complet</div>
          </div>
        </div>

        {/* ── Foreword ── */}
        <div className="help-foreword">
          <h2 className="help-foreword__title">Avant-propos</h2>
          <p>Ce guide est le document de référence officiel de la plateforme E-Report. Il couvre l'ensemble des fonctionnalités disponibles pour tous les rôles : administrateur, enseignant, économe, parent et élève.</p>
          <p>Nous vous recommandons de lire le Chapitre 2 (Configuration initiale) avant toute autre chose si vous configurez E-Report pour la première fois. Les autres chapitres peuvent être consultés selon vos besoins.</p>
          <p>Ce guide est disponible en version imprimable : cliquez sur le bouton <strong>« Télécharger le guide (PDF) »</strong> en haut de la page, puis sélectionnez <em>Enregistrer en PDF</em> dans la fenêtre d'impression.</p>
          <div className="help-foreword__sig">— L'équipe E-Report</div>
        </div>

        {/* ── TOC ── */}
        <div className="help-toc">
          <h2 className="help-toc__title">Table des matières</h2>
          <ol className="help-toc__list">
            {CHAPTERS.map((ch) => (
              <li key={ch.num} className="help-toc__item">
                <button
                  className="help-toc__link"
                  onClick={() => {
                    const el = document.getElementById(`chapter-${ch.num}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setActiveChapter(ch.num);
                  }}
                >
                  <span className="help-toc__num">{ch.num}.</span>
                  <span className="help-toc__text">{ch.icon} {ch.title}</span>
                  <span className="help-toc__dots" />
                  <span className="help-toc__page">{ch.num}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Chapters ── */}
        {CHAPTERS.map((ch) => (
          <div key={ch.num} id={`chapter-${ch.num}`} className="help-chapter">
            <div className="help-chapter__header">
              <span className="help-chapter__icon">{ch.icon}</span>
              <div>
                <div className="help-chapter__num">Chapitre {ch.num}</div>
                <h2 className="help-chapter__title">{ch.title}</h2>
              </div>
            </div>

            {ch.sections.map((sec, si) => (
              <div key={si} className="help-section-block">
                <h3 className="help-section-block__title">
                  <span className="help-section-block__num">{ch.num}.{si + 1}</span>
                  {sec.title}
                </h3>

                {sec.content && (
                  <div className="help-section-block__text">
                    {sec.content.split('\n').map((line, li) =>
                      line.startsWith('•') ? (
                        <div key={li} className="help-section-block__bullet">
                          <span className="help-section-block__dot">•</span>
                          <span>{line.slice(1).trim()}</span>
                        </div>
                      ) : line.trim() === '' ? (
                        <div key={li} className="help-section-block__spacer" />
                      ) : (
                        <p key={li} className="help-section-block__para">{line}</p>
                      )
                    )}
                  </div>
                )}

                {sec.steps && (
                  <ol className="help-steps">
                    {sec.steps.map((step, idx) => (
                      <li key={idx} className="help-steps__item">
                        <span className="help-steps__num">{idx + 1}</span>
                        <span className="help-steps__text">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {sec.callout && (
                  <div className={`help-callout help-callout--${sec.callout.type}`}>
                    <span className="help-callout__icon">
                      {sec.callout.type === 'tip'       && '💡'}
                      {sec.callout.type === 'warning'   && '⚠️'}
                      {sec.callout.type === 'note'      && 'ℹ️'}
                      {sec.callout.type === 'important' && '🔴'}
                    </span>
                    <span className="help-callout__label">
                      {sec.callout.type === 'tip'       && 'Conseil'}
                      {sec.callout.type === 'warning'   && 'Attention'}
                      {sec.callout.type === 'note'      && 'Remarque'}
                      {sec.callout.type === 'important' && 'Important'}
                    </span>
                    <p className="help-callout__text">{sec.callout.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* ── Back cover ── */}
        <div className="help-back-cover">
          <div className="help-back-cover__logo">E-Report</div>
          <p className="help-back-cover__tagline">La gestion scolaire simplifiée pour l'Afrique</p>
          <div className="help-back-cover__line" />
          <p className="help-back-cover__contact">support@e-report.app</p>
          <p className="help-back-cover__copy">© 2025 E-Report — Tous droits réservés</p>
        </div>
      </div>
    </AppShell>
  );
}
