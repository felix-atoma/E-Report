import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Button from '../../../components/common/Button/Button';
import './HelpPage.css';

// ─── FRENCH CONTENT ────────────────────────────────────────────────────────────
const CHAPTERS_FR = [
  {
    num: 1,
    title: 'Introduction et premiers pas',
    icon: '🚀',
    sections: [
      {
        title: 'Présentation de NovaBulletin',
        content: `NovaBulletin est une plateforme de gestion scolaire en ligne conçue pour les établissements du système éducatif togolais et africain. Elle centralise la gestion des élèves, des notes, des bulletins, des finances, de la discipline, des présences et de la communication avec les familles.

La plateforme est accessible depuis n'importe quel navigateur web (Chrome, Firefox, Edge, Safari) sur ordinateur, tablette ou téléphone mobile. Aucune installation n'est nécessaire.`,
      },
      {
        title: 'Rôles disponibles',
        content: `NovaBulletin distingue cinq rôles principaux :

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
  {
    num: 3,
    title: 'Abonnement et tarification',
    icon: '💳',
    sections: [
      {
        title: 'Plans disponibles',
        content: `NovaBulletin propose quatre niveaux d'abonnement selon la taille de votre établissement :

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
        callout: { type: 'tip', text: 'Utilisez un mot de passe temporaire simple et demandez à l\'utilisateur de le changer dès sa première connexion via Paramètres → Profil.' },
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
        content: `L'annuaire du personnel centralise les informations professionnelles de toute l'équipe. Il est accessible via le menu → Annuaire du personnel.

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
          'Cliquez sur l\'employé concerné pour ouvrir son panneau.',
          'Cliquez sur « Modifier le profil ».',
          'Renseignez : titre, spécialité, téléphone, type de contrat, qualifications, date d\'embauche, biographie.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Assigner un parent à un élève',
        content: `Un parent peut être associé à un ou plusieurs élèves. Cette association lui permet de consulter les bulletins et de payer en ligne.`,
        steps: [
          'Créez d\'abord le compte parent.',
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
          'Cliquez sur « Télécharger le modèle » pour obtenir le fichier de référence.',
          'Remplissez le fichier (une ligne par élève). Colonnes obligatoires : name, className.',
          'Colonnes optionnelles : dateOfBirth, gender, admissionNumber, parentEmail, bloodGroup.',
          'Sauvegardez au format CSV (UTF-8).',
          'Cliquez sur « Importer CSV », sélectionnez votre fichier, vérifiez l\'aperçu, puis confirmez.',
        ],
        callout: { type: 'warning', text: 'Si un élève avec le même numéro d\'admission existe déjà, l\'import le met à jour au lieu de créer un doublon. Vérifiez toujours l\'aperçu avant de confirmer.' },
      },
      {
        title: 'Consulter le profil d\'un élève',
        content: `La fiche élève regroupe toutes les informations en un seul endroit :

• Informations — Identité, classe, numéro d'admission, contacts.
• Paiements — Statut des frais, détail des paiements, plans de paiement.
• Présences — Récapitulatif des absences, retards et excuses.
• Bulletins — Liste des bulletins publiés par période.
• Discipline — Dossier disciplinaire (avertissements, sanctions, félicitations).
• Santé — Fiche médicale (visites, vaccinations, allergies).
• Transferts — Historique des établissements.`,
      },
      {
        title: 'Transférer un élève',
        steps: [
          'Ouvrez la fiche de l\'élève, onglet « Transferts ».',
          'Pour un transfert sortant : cliquez sur « + Transfert sortant », saisissez l\'établissement d\'accueil et la date.',
          'Pour un transfert entrant : créez l\'élève normalement et renseignez l\'établissement d\'origine.',
          'Le transfert est archivé dans l\'historique de l\'élève.',
        ],
      },
      {
        title: 'Changer un élève de classe',
        steps: [
          'Ouvrez la fiche de l\'élève.',
          'Cliquez sur « Modifier ».',
          'Changez le champ « Classe ».',
          'Cliquez sur « Enregistrer ».',
        ],
        callout: { type: 'note', text: 'Les notes et bulletins déjà créés restent associés à l\'élève, quelle que soit sa classe actuelle.' },
      },
    ],
  },
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
          'Saisissez le nom (ex : CM2-A, 3ème B, Terminale C), le niveau et la filière.',
          'Assignez un titulaire (enseignant responsable).',
          'Cliquez sur « Créer ».',
        ],
      },
      {
        title: 'Consulter la liste d\'une classe',
        steps: [
          'Allez dans le menu → Classes.',
          'Cliquez sur le nom d\'une classe.',
          'Vous voyez la liste des élèves, les matières et les statistiques.',
          'Le palmarès (classement par moyenne) est accessible via le bouton « Palmarès ».',
        ],
      },
      {
        title: 'Créer les matières et coefficients',
        steps: [
          'Allez dans le menu → Matières.',
          'Cliquez sur « + Nouvelle matière ».',
          'Saisissez le nom, la catégorie et le coefficient.',
          'Pour les cours primaires : activez « Note sur 10 » si la note maximale est 10.',
          'Cliquez sur « Créer ».',
        ],
        callout: { type: 'tip', text: 'Le coefficient influe directement sur le calcul de la moyenne générale. Vérifiez les coefficients officiels de votre programme avant la saisie.' },
      },
      {
        title: 'Construire l\'emploi du temps',
        steps: [
          'Allez dans le menu → Emploi du temps.',
          'Sélectionnez la classe concernée.',
          'Cliquez sur un créneau horaire dans la grille hebdomadaire.',
          'Choisissez la matière, l\'enseignant et la salle.',
          'Le système détecte automatiquement les conflits.',
          'Cliquez sur « Appliquer ».',
        ],
      },
    ],
  },
  {
    num: 7,
    title: 'Saisie et validation des notes',
    icon: '✏️',
    sections: [
      {
        title: 'Les fiches de notes',
        content: `Une fiche de notes est le document officiel de saisie des résultats d'une matière pour une classe et une période données.

Cycle de vie d'une fiche :
• Ouverte → L'enseignant saisit les notes.
• Signée → L'enseignant valide la fiche. Plus aucune modification n'est possible.
• Publiée → Les notes sont intégrées dans les bulletins.`,
      },
      {
        title: 'Saisir les notes',
        steps: [
          'Allez dans le menu → Fiches de notes.',
          'Sélectionnez la période et la classe.',
          'Cliquez sur la matière correspondante.',
          'Saisissez la note de chaque élève. Appuyez sur Tab pour passer au suivant.',
          'La moyenne de la classe se calcule automatiquement.',
          'Cliquez sur « Enregistrer les notes ».',
        ],
        callout: { type: 'tip', text: 'Les notes sont sauvegardées automatiquement toutes les 30 secondes. Vous pouvez interrompre et reprendre la saisie à tout moment.' },
      },
      {
        title: 'Signer une fiche de notes',
        steps: [
          'Une fois toutes les notes saisies, cliquez sur « Signer la fiche ».',
          'Confirmez dans la boîte de dialogue.',
          'La fiche passe à l\'état « Signée » et ne peut plus être modifiée.',
          'Si une correction est nécessaire après signature, l\'administrateur peut déverrouiller la fiche.',
        ],
        callout: { type: 'warning', text: 'Ne signez la fiche que lorsque toutes les notes sont définitives. Une fiche signée ne peut être modifiée que par un administrateur.' },
      },
      {
        title: 'Imprimer une fiche de notes',
        steps: [
          'Ouvrez la fiche souhaitée.',
          'Cliquez sur « Imprimer la fiche ».',
          'Votre navigateur ouvre la fenêtre d\'impression.',
          'Sélectionnez « Enregistrer en PDF » pour conserver un exemplaire numérique.',
        ],
      },
    ],
  },
  {
    num: 8,
    title: 'Bulletins scolaires',
    icon: '📋',
    sections: [
      {
        title: 'Processus de création d\'un bulletin',
        content: `Le bulletin scolaire est le document central de NovaBulletin :

1. L'administrateur configure la période dans les Paramètres.
2. Les enseignants saisissent les notes dans leurs fiches.
3. Les enseignants signent leurs fiches pour les valider.
4. L'administrateur crée le bulletin, vérifie les notes et le publie.
5. Le bulletin est envoyé aux parents par email/WhatsApp.`,
      },
      {
        title: 'Créer et publier un bulletin',
        steps: [
          'Allez dans le menu → Bulletins.',
          'Cliquez sur « + Nouveau bulletin ».',
          'Sélectionnez la classe, la période et l\'année scolaire.',
          'Les notes saisies par les enseignants apparaissent automatiquement.',
          'Vérifiez et complétez les notes manquantes.',
          'Ajoutez une appréciation générale du conseil de classe (optionnel).',
          'Cliquez sur « Publier ».',
        ],
        callout: { type: 'tip', text: 'Vous pouvez créer les bulletins de toute une classe en une seule opération via « Créer pour toute la classe ».' },
      },
      {
        title: 'Système de verrou de frais',
        content: `Si le verrou de frais est activé dans les Paramètres :

• Un bulletin publié n'est visible par la famille QUE si les frais scolaires sont payés.
• L'économe voit les bulletins retenus dans son tableau de bord.
• Dès qu'un paiement suffisant est enregistré, le bulletin est automatiquement débloqué.
• L'administrateur peut forcer la distribution même avec des frais impayés.`,
        callout: { type: 'important', text: 'Le verrou de frais est un puissant outil de recouvrement. Activez-le uniquement si votre établissement a une politique claire en la matière.' },
      },
      {
        title: 'Imprimer ou télécharger un bulletin',
        steps: [
          'Ouvrez le bulletin concerné.',
          'Cliquez sur « Imprimer » ou l\'icône d\'impression.',
          'Sélectionnez « Enregistrer en PDF » dans la fenêtre d\'impression.',
          'Pour imprimer tous les bulletins d\'une classe : Classes → sélectionnez la classe → « Imprimer tous les bulletins ».',
        ],
      },
      {
        title: 'Vérification d\'authenticité (QR code)',
        content: `Chaque bulletin publié porte un code QR unique permettant de vérifier son authenticité.

• Le code QR s'affiche en bas de chaque bulletin imprimé.
• En scannant ce code, le vérificateur accède à une page publique confirmant l'authenticité.
• Cette fonctionnalité protège contre la falsification des bulletins.`,
        callout: { type: 'tip', text: 'Encouragez les établissements et employeurs qui reçoivent des bulletins NovaBulletin à utiliser la vérification QR.' },
      },
      {
        title: 'Palmarès de classe',
        steps: [
          'Allez dans Classes → sélectionnez une classe.',
          'Cliquez sur « Palmarès ».',
          'Le palmarès affiche le classement des élèves par moyenne générale.',
          'Cliquez sur « Imprimer le palmarès » pour en obtenir une version imprimable.',
        ],
      },
      {
        title: 'Rapport annuel',
        steps: [
          'Allez dans le menu → Rapport annuel.',
          'Sélectionnez l\'année scolaire.',
          'Le rapport synthétise : effectifs, taux de réussite, moyennes, taux de recouvrement.',
          'Cliquez sur « Imprimer ».',
        ],
      },
    ],
  },
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
          'Saisissez le nom (ex : Scolarité T1, Inscription, Transport, Cantine).',
          'Définissez le montant et la classe cible (ou « Toutes les classes »).',
          'Précisez si ce poste est obligatoire ou optionnel.',
          'Cliquez sur « Créer ».',
        ],
        callout: { type: 'tip', text: 'Créez des postes distincts pour chaque type de frais plutôt qu\'un seul poste global. Cela facilite le suivi et les relances ciblées.' },
      },
      {
        title: 'Enregistrer un paiement',
        steps: [
          'Allez dans le menu → Paiements.',
          'Cliquez sur « + Nouveau paiement ».',
          'Recherchez l\'élève par nom ou numéro d\'admission.',
          'Saisissez le montant, la méthode (espèces, mobile money, chèque) et une référence.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Imprimer un reçu de paiement',
        steps: [
          'Après avoir enregistré un paiement, cliquez sur « Reçu PDF ».',
          'Vous pouvez aussi retrouver les paiements passés dans la liste et imprimer le reçu à tout moment.',
        ],
      },
      {
        title: 'Plans de paiement échelonnés',
        content: `Un plan de paiement permet à une famille de régler les frais en plusieurs versements selon un calendrier défini.`,
        steps: [
          'Allez dans le menu → Plans de paiement.',
          'Cliquez sur « + Nouveau plan ».',
          'Sélectionnez l\'élève concerné et saisissez le montant total.',
          'Ajoutez les échéances : date d\'échéance et montant pour chaque versement.',
          'Cliquez sur « Créer le plan ».',
          'Pour enregistrer un versement : ouvrez le plan, cliquez sur l\'échéance et saisissez le montant reçu.',
        ],
        callout: { type: 'tip', text: 'Utilisez les plans de paiement pour les familles en difficulté. Cela maintient la confiance tout en sécurisant le recouvrement.' },
      },
      {
        title: 'Suivre les impayés',
        steps: [
          'Allez dans le menu → Analytiques.',
          'Consultez le taux de recouvrement global et par classe.',
          'Filtrez la liste des paiements par « Solde > 0 » pour identifier les familles concernées.',
          'Dans la fiche de l\'élève, cliquez sur « Envoyer un rappel » pour alerter le parent.',
        ],
      },
      {
        title: 'Paiements en ligne (espace parent)',
        content: `Les parents peuvent payer directement en ligne via mobile money :

• Le parent clique sur « Payer en ligne » dans la fiche de son enfant.
• Il saisit le montant et choisit son opérateur (Flooz ou TMoney).
• Il est redirigé vers la page de paiement sécurisée Notchpay.
• Après confirmation, le paiement est enregistré automatiquement et un reçu est envoyé par email.
• Si les frais sont couverts, le bulletin est automatiquement déverrouillé.`,
        callout: { type: 'note', text: 'Les paiements en ligne nécessitent la configuration des clés Notchpay dans les Paramètres (voir Chapitre 2).' },
      },
      {
        title: 'Exonérer un élève',
        steps: [
          'Ouvrez la fiche de l\'élève, onglet « Paiements ».',
          'Cliquez sur « Exonérer » en face du poste de frais concerné.',
          'Confirmez l\'exonération. L\'élève est marqué comme exonéré pour ce poste.',
        ],
      },
    ],
  },
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
        ],
        callout: { type: 'tip', text: 'Les présences peuvent être saisies par l\'enseignant titulaire depuis son espace.' },
      },
      {
        title: 'Rapport d\'absences de classe',
        steps: [
          'Allez dans le menu → Présences.',
          'Sélectionnez une classe et une période.',
          'Le tableau affiche le taux de présence de chaque élève.',
          'Cliquez sur « Exporter » pour obtenir un fichier CSV.',
        ],
      },
      {
        title: 'Gérer les dossiers disciplinaires',
        steps: [
          'Allez dans le menu → Discipline.',
          'Cliquez sur « + Nouveau dossier ».',
          'Sélectionnez l\'élève et choisissez le type : Avertissement, Suspension, Exclusion, Félicitation, Autre.',
          'Décrivez l\'incident ou la raison de la sanction.',
          'Cliquez sur « Créer ».',
          'Marquez le dossier comme « Résolu » une fois l\'affaire réglée.',
        ],
      },
    ],
  },
  {
    num: 11,
    title: 'Signalements d\'incidents',
    icon: '🚨',
    sections: [
      {
        title: 'À quoi servent les signalements ?',
        content: `Le module de signalements permet aux parents et aux élèves de rapporter des incidents : harcèlement, violence, problème de sécurité, etc.

Statuts possibles :
• En attente — Signalement reçu, non encore traité.
• En cours d'examen — L'administration examine le signalement.
• Résolu — L'incident a été traité.
• Classé sans suite — Aucune action requise.`,
      },
      {
        title: 'Soumettre un signalement (Parent ou Élève)',
        steps: [
          'Allez dans le menu → Signaler un incident.',
          'Décrivez l\'incident : titre, catégorie, date et description détaillée.',
          'Vous pouvez choisir de rester anonyme.',
          'Cliquez sur « Soumettre ».',
        ],
      },
      {
        title: 'Gérer les signalements (Administrateur)',
        steps: [
          'Allez dans le menu → Signalements.',
          'La liste affiche tous les signalements avec leur statut.',
          'Cliquez sur un signalement pour l\'ouvrir.',
          'Modifiez le statut et ajoutez des notes administratives internes.',
          'Cliquez sur « Enregistrer ».',
        ],
        callout: { type: 'important', text: 'Traitez les signalements dans les 48h. Un signalement non traité peut nuire à la confiance des familles.' },
      },
    ],
  },
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
          'Saisissez le nom (ex : Examen blanc BEPC — Juin 2026), le type et la date.',
          'Sélectionnez les classes participantes.',
          'Cliquez sur « Créer ».',
        ],
      },
      {
        title: 'Saisir les notes d\'un examen blanc',
        steps: [
          'Ouvrez la session concernée.',
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
          'Les moyennes et le classement sont calculés automatiquement.',
          'Consultez le palmarès général et par classe.',
          'Cliquez sur « Imprimer le palmarès » pour en obtenir une version imprimable.',
        ],
      },
    ],
  },
  {
    num: 13,
    title: 'Registres de l\'établissement',
    icon: '🗂️',
    sections: [
      {
        title: 'Bibliothèque — Catalogue et prêts',
        steps: [
          'Allez dans le menu → Bibliothèque.',
          'Onglet « Catalogue » : ajoutez les livres (titre, quantité, état, emplacement).',
          'Onglet « Prêts en cours » : enregistrez un nouveau prêt (livre + emprunteur + date de retour).',
          'Onglet « Historique » : consultez tous les prêts passés.',
          'Cliquez sur « Rendre » pour enregistrer le retour d\'un livre.',
        ],
      },
      {
        title: 'Inventaire',
        steps: [
          'Allez dans le menu → Inventaire.',
          'Cliquez sur « + Ajouter un équipement ».',
          'Renseignez : nom, catégorie, quantité, état, emplacement, fournisseur, valeur d\'achat.',
          'Le tableau de bord affiche la valeur totale estimée du parc matériel.',
        ],
      },
      {
        title: 'Registre des achats',
        content: `Le registre des achats trace toutes les acquisitions effectuées par l'établissement.`,
        steps: [
          'Allez dans le menu → Achats.',
          'Cliquez sur « + Nouvel achat ».',
          'Renseignez : date, désignation, modèle, prix et notes.',
          'Cliquez sur « Enregistrer ».',
          'Cliquez sur « Exporter CSV » pour exporter le registre vers Excel.',
        ],
        callout: { type: 'tip', text: 'Remplissez le registre dès réception d\'une facture pour simplifier la comptabilité et les audits.' },
      },
      {
        title: 'Santé',
        steps: [
          'Allez dans le menu → Santé.',
          'Recherchez un élève et ouvrez sa fiche médicale.',
          'Enregistrez : visites médicales, accidents, vaccinations, traitements.',
        ],
      },
      {
        title: 'Documents officiels',
        steps: [
          'Allez dans le menu → Documents.',
          'Cliquez sur « + Télécharger un document ».',
          'Choisissez la visibilité (tous / enseignants / administration).',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Anciens élèves',
        steps: [
          'Allez dans le menu → Anciens élèves.',
          'Cliquez sur « + Ajouter un diplômé ».',
          'Renseignez : année de diplomation, classe de sortie, numéro de diplôme, résultats aux examens.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Examens nationaux',
        steps: [
          'Allez dans le menu → Examens nationaux.',
          'Cliquez sur « + Ajouter un résultat ».',
          'Sélectionnez l\'élève et l\'examen (CEPE, BEPC, BAC).',
          'Renseignez : numéro de candidat, session, mention et résultat.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
    ],
  },
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
          'Rédigez le titre et le contenu.',
          'Choisissez la cible : toutes les classes, une classe spécifique, ou un rôle.',
          'Cliquez sur « Publier ».',
        ],
      },
      {
        title: 'Calendrier scolaire',
        steps: [
          'Allez dans le menu → Calendrier.',
          'Cliquez sur une date pour créer un événement.',
          'Renseignez : titre, type (Vacances, Examen, Réunion, Sortie, Autre), dates.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Notifications WhatsApp et Email',
        content: `NovaBulletin envoie automatiquement des notifications aux parents lors de :
• La publication d'un nouveau bulletin.
• La confirmation d'un paiement.
• Une annonce importante.
• Un rappel de paiement si des frais sont en retard.

Les parents configurent leurs préférences (WhatsApp / email) depuis leur profil.`,
        callout: { type: 'note', text: 'Les notifications WhatsApp nécessitent que le parent ait renseigné un numéro de téléphone valide dans son profil.' },
      },
      {
        title: 'Journal des notifications',
        steps: [
          'Allez dans le menu → Notifications.',
          'Onglet « Bulletins retenus » : notifications bloquées par le verrou de frais.',
          'Cliquez sur « Envoyer maintenant » pour forcer l\'envoi d\'une notification.',
          'Bouton « Lien de paiement » : envoie un lien WhatsApp pour payer directement depuis le téléphone.',
          'Onglet « Mes notifications » : historique des notifications reçues.',
        ],
        callout: { type: 'tip', text: 'Utilisez « Envoyer le lien de paiement » pour des relances rapides et efficaces.' },
      },
    ],
  },
  {
    num: 15,
    title: 'LMS — Espace d\'apprentissage en ligne',
    icon: '🎯',
    sections: [
      {
        title: 'À quoi sert le LMS ?',
        content: `Le module LMS permet aux enseignants de partager des ressources pédagogiques avec leurs classes.

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
          'Choisissez le type et rédigez le contenu ou joignez un fichier.',
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
          'Pour les devoirs : soumettez votre travail directement depuis la plateforme.',
        ],
      },
    ],
  },
  {
    num: 16,
    title: 'Analytiques et rapports',
    icon: '📊',
    sections: [
      {
        title: 'Tableau de bord administrateur',
        content: `Le tableau de bord offre une vue d'ensemble de l'établissement en temps réel :

• Nombre d'élèves inscrits, d'enseignants, de classes actives.
• Bulletins publiés sur la période en cours.
• Taux de recouvrement des frais (encaissé / attendu).
• Liste des paiements récents.
• Graphiques interactifs par classe et par période.`,
      },
      {
        title: 'Analytiques financières',
        steps: [
          'Allez dans le menu → Analytiques.',
          'Sélectionnez l\'année scolaire à analyser.',
          'Consultez : taux de recouvrement global, répartition Payé / Partiel / Impayé / Exonéré.',
          'Graphique en barres : encaissements par classe.',
          'Cliquez sur « Exporter le rapport » pour télécharger un CSV complet.',
        ],
      },
      {
        title: 'Statistiques de classe',
        steps: [
          'Allez dans Classes → sélectionnez une classe.',
          'Cliquez sur « Statistiques ».',
          'Consultez : moyenne de classe par matière, distribution des notes, taux de réussite.',
          'Comparez les résultats entre trimestres.',
        ],
      },
      {
        title: 'Exports de données',
        content: `Plusieurs exports sont disponibles :
• Paiements → Export CSV de tous les paiements.
• Élèves → Export CSV de la liste des élèves.
• Achats → Export CSV du registre des achats.
• Analytiques → Export du rapport financier complet.
• Paramètres → Export complet des données de l'établissement.`,
      },
    ],
  },
  {
    num: 17,
    title: 'Espace Enseignant',
    icon: '👨‍🏫',
    sections: [
      {
        title: 'Tableau de bord enseignant',
        content: `Le tableau de bord affiche :
• Ses classes assignées pour l'année.
• Les fiches de notes en attente de signature.
• Les bulletins à compléter ou à publier.
• L'emploi du temps de la semaine.
• Les annonces récentes.`,
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
          'Vérifiez les notes et ajoutez vos appréciations.',
          'Cliquez sur « Publier ».',
        ],
      },
      {
        title: 'Enregistrer les présences',
        steps: [
          'Allez dans le menu → Présences.',
          'Sélectionnez votre classe et la date.',
          'Cochez le statut de chaque élève.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
      {
        title: 'Programme et feuille de route',
        steps: [
          'Allez dans le menu → Programme pour mettre à jour votre progression de cours.',
          'Allez dans le menu → Feuille de route pour votre plan pédagogique annuel.',
        ],
        callout: { type: 'note', text: 'En tant qu\'enseignant, vous ne voyez que les élèves de vos propres classes. L\'accès aux informations financières est réservé à l\'administrateur et à l\'économe.' },
      },
    ],
  },
  {
    num: 18,
    title: 'Espace Économe',
    icon: '💼',
    sections: [
      {
        title: 'Tableau de bord économe',
        content: `Le tableau de bord de l'économe affiche en temps réel :
• Total encaissé sur la période (aujourd'hui / semaine / mois / tout).
• Répartition des paiements par classe.
• Liste des paiements récents.
• Bulletins retenus en attente de paiement.`,
      },
      {
        title: 'Enregistrer un paiement',
        steps: [
          'Allez dans le menu → Paiements.',
          'Cliquez sur « + Nouveau paiement ».',
          'Recherchez l\'élève.',
          'Saisissez le montant, la méthode et une référence optionnelle.',
          'Cliquez sur « Enregistrer ».',
          'Imprimez le reçu via « Reçu PDF ».',
        ],
      },
      {
        title: 'Bulletins retenus',
        steps: [
          'Allez dans le menu → Notifications.',
          'Onglet « Bulletins retenus » : liste des élèves dont le bulletin est bloqué.',
          'Après un paiement suffisant, le bulletin est automatiquement débloqué.',
          'Cliquez sur « Envoyer maintenant » pour notifier la famille.',
          'Cliquez sur « Lien de paiement » pour envoyer un lien WhatsApp au parent.',
        ],
      },
    ],
  },
  {
    num: 19,
    title: 'Espace Parent',
    icon: '👨‍👩‍👧',
    sections: [
      {
        title: 'Tableau de bord parent',
        content: `Le tableau de bord parent affiche :
• La liste de vos enfants inscrits.
• Le statut des frais scolaires de chaque enfant.
• Les dernières annonces de l'école.
• Les événements à venir dans le calendrier.`,
      },
      {
        title: 'Consulter les bulletins de son enfant',
        steps: [
          'Allez dans le menu → Mes enfants.',
          'Cliquez sur l\'enfant concerné.',
          'Cliquez sur le trimestre pour ouvrir le bulletin.',
          'Si le bulletin est bloqué (cadenas), réglez les frais en ligne ou contactez l\'économe.',
        ],
      },
      {
        title: 'Payer en ligne',
        steps: [
          'Ouvrez la fiche de votre enfant.',
          'Cliquez sur « Payer en ligne ».',
          'Saisissez le montant et choisissez votre opérateur (Flooz ou TMoney).',
          'Validez depuis votre téléphone.',
          'Un reçu vous est envoyé par email.',
        ],
      },
      {
        title: 'Préférences de notification',
        steps: [
          'Allez dans le menu → Notifications.',
          'Choisissez comment recevoir les alertes : Email, WhatsApp ou les deux.',
          'Vérifiez que votre numéro de téléphone est correct.',
          'Cliquez sur « Enregistrer ».',
        ],
      },
    ],
  },
  {
    num: 20,
    title: 'Espace Élève',
    icon: '🧑‍🎓',
    sections: [
      {
        title: 'Tableau de bord élève',
        content: `Le tableau de bord affiche :
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
          'Vous voyez vos notes par matière, vos moyennes et les appréciations.',
        ],
      },
      {
        title: 'Suivre sa progression',
        steps: [
          'Allez dans le menu → Ma progression.',
          'Le graphique montre l\'évolution de votre moyenne générale trimestre par trimestre.',
          'Cliquez sur « Voir par matière » pour détailler vos résultats.',
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
  {
    num: 21,
    title: 'Conseils et bonnes pratiques',
    icon: '💡',
    sections: [
      {
        title: 'Ordre recommandé pour démarrer',
        steps: [
          '1. Complétez l\'assistant de démarrage.',
          '2. Personnalisez l\'Apparence (logo, couleurs, nom).',
          '3. Configurez les clés Notchpay pour les paiements en ligne.',
          '4. Créez les Matières avec leurs coefficients.',
          '5. Créez les Classes et assignez les titulaires.',
          '6. Créez les comptes Utilisateurs (enseignants, économe).',
          '7. Importez ou ajoutez les Élèves.',
          '8. Associez les parents aux élèves.',
          '9. Définissez les Frais scolaires par poste.',
          '10. Construisez l\'Emploi du temps.',
          '11. Les enseignants saisissent les notes.',
          '12. Publiez les bulletins à la fin de chaque période.',
        ],
      },
      {
        title: 'Conseils pour une utilisation optimale',
        content: `• Cliquez toujours sur « Enregistrer » avant de quitter un formulaire.
• Nommez les classes avec les noms officiels (3ème A, Terminale C).
• Planifiez un rappel aux enseignants pour signer les fiches avant la date limite.
• Activez le verrou de frais en début d'année pour maximiser le recouvrement.
• Exportez vos données en CSV régulièrement comme sauvegarde locale.
• Vérifiez le journal des notifications après chaque publication de bulletin.`,
      },
      {
        title: 'Sécurité et confidentialité',
        content: `• Ne partagez jamais votre mot de passe, même avec des collègues.
• Changez votre mot de passe tous les 3 mois.
• Déconnectez-vous après chaque session sur un ordinateur partagé.
• Ne communiquez pas les données d'élèves par WhatsApp ou email non sécurisé.
• En cas de compte compromis, changez immédiatement votre mot de passe.`,
        callout: { type: 'warning', text: 'Le support NovaBulletin ne demande jamais votre mot de passe. Ne communiquez vos identifiants à personne.' },
      },
      {
        title: 'Problèmes fréquents et solutions',
        content: `• Bulletin non visible → Vérifiez que le bulletin est publié et que les frais sont réglés.
• Notes absentes sur le bulletin → L'enseignant doit signer sa fiche de notes.
• Parent ne reçoit pas les notifications → Vérifiez l'email et le téléphone dans le profil parent.
• Paiement en ligne non confirmé → Attendez 5 minutes et rafraîchissez. Contactez le support Notchpay si nécessaire.
• Conflit dans l'emploi du temps → Réassignez l'enseignant ou changez le créneau.`,
      },
      {
        title: 'Support technique',
        content: `Pour toute question ou problème :
• Consultez l'assistant IA intégré (bouton flottant en bas à droite).
• Contactez le support NovaBulletin par email.
• Décrivez précisément le problème et joignez une capture d'écran.

Heures de support : Lundi – Vendredi, 8h – 18h (heure de Lomé, GMT+0).`,
      },
    ],
  },
];

// ─── ENGLISH CONTENT ────────────────────────────────────────────────────────────
const CHAPTERS_EN = [
  {
    num: 1,
    title: 'Introduction and getting started',
    icon: '🚀',
    sections: [
      {
        title: 'What is NovaBulletin?',
        content: `NovaBulletin is an online school management platform designed for educational institutions in Togo and across Africa. It centralises the management of students, grades, report cards, finances, discipline, attendance and family communication.

The platform is accessible from any web browser (Chrome, Firefox, Edge, Safari) on a computer, tablet or mobile phone. No installation is required.`,
      },
      {
        title: 'Available roles',
        content: `NovaBulletin has five main roles:

• Administrator (ADMIN) — School principal or manager. Full access to all features.
• Teacher (TEACHER) — Grade entry, grade sheets, report cards, attendance, announcements.
• Bursar (BURSAR) — Payment management, school fee tracking, held report cards.
• Parent (PARENT) — View report cards, pay online, follow children.
• Student (STUDENT) — View report cards and track personal progress.`,
      },
      {
        title: 'Registering your school',
        steps: [
          'Go to the platform\'s public home page.',
          'Click "Register my school".',
          'Enter: school name, country, administrator email and password.',
          'Click "Create my space". Your account is activated immediately.',
          'You will be redirected to the setup wizard to configure your school.',
        ],
        callout: { type: 'tip', text: 'Schools with fewer than 50 students get free access (Starter plan). Larger schools require a monthly or annual subscription (see Chapter 3).' },
      },
      {
        title: 'How to log in',
        steps: [
          'Open your browser and go to the platform address.',
          'On the home page, click "Log in".',
          'Enter your email address and password, then click "Sign in".',
          'Google login: click "Continue with Google" to sign in without a password.',
          'OTP login: click "Sign in with a code" — receive a one-time code by email and enter it to access without a password.',
          'Forgot password: click "Forgot password", enter your email, check your inbox and follow the link.',
        ],
        callout: { type: 'warning', text: 'If your email is not yet verified, a warning banner is displayed at the top of the screen. Log in via the OTP code received by email to activate your account.' },
      },
      {
        title: 'Navigating the interface',
        content: `The interface is divided into two main areas:

• The left sidebar (menu): quick access to all sections of your space. On mobile it collapses automatically — tap ☰ to open it.
• The main content area: displays the active page.

On the right side you will find three floating buttons:
• Green button (profile): access your profile and update your information.
• Red button (bell): view your notifications. A red badge shows the number of unread messages.
• Blue button (logout): leave the session securely.`,
      },
      {
        title: 'The built-in AI Assistant',
        content: `An AI assistant is available on every page via the floating button at the bottom right.

It can help you:
• Answer your questions about the platform.
• Draft teacher comments or announcements.
• Analyse class data.
• Suggest pedagogical best practices.`,
        callout: { type: 'tip', text: 'The AI assistant retains the context of your conversation. Ask questions in French or English.' },
      },
      {
        title: 'Changing language and theme',
        steps: [
          'To change language: click "FR" or "EN" in the top bar.',
          'To enable dark mode: click the moon/sun icon in the top bar.',
          'Your preference is saved automatically in your browser.',
        ],
      },
    ],
  },
  {
    num: 2,
    title: 'Setup wizard and configuration',
    icon: '⚙️',
    sections: [
      {
        title: 'The setup wizard (Onboarding)',
        content: `When you first log in, a setup wizard guides you step by step to configure your school:

• Step 1: General information (name, address, phone, district).
• Step 2: Academic settings (school year, term structure, pass mark).
• Step 3: Appearance (logo, primary colour, motto).
• Step 4: Create your first subjects.
• Step 5: Create your first class.

You can return to any step at any time via Settings in the menu.`,
        callout: { type: 'important', text: 'Complete the setup wizard before inviting teachers or importing students. A correct initial configuration prevents many problems down the line.' },
      },
      {
        title: 'School information',
        steps: [
          'Go to the menu → Settings.',
          'Click "Edit information".',
          'Fill in: official name, country, district motto, district, email, phone, address, website and school mission.',
          'Click "Save".',
        ],
      },
      {
        title: 'Academic settings',
        steps: [
          'Go to the menu → Settings, section "Academic settings".',
          'Enter the current school year (e.g. 2024-2025).',
          'Choose the term structure: Trimester (3 terms) or Semester (2 terms).',
          'Select the current term (term 1, 2 or 3).',
          'Set the pass mark (default: 10/20) and maximum score (default: 20).',
          'Enable or disable the fee gate.',
          'Click "Save".',
        ],
        callout: { type: 'warning', text: 'Changing the term structure mid-year may affect already published report cards. Make this choice at the start of the school year.' },
      },
      {
        title: 'Report card branding',
        steps: [
          'Go to the menu → Appearance.',
          'Upload your school logo (PNG or JPG, transparent background recommended).',
          'Choose the primary colour for report card headers.',
          'Enter the official name, address, phone and motto.',
          'Enter the accreditation number and country motto (e.g. "Work – Liberty – Homeland").',
          'Click "Save". This information will appear on all printed report cards.',
        ],
      },
      {
        title: 'Online payment settings (Notchpay)',
        steps: [
          'Go to the menu → Settings, section "Online payment".',
          'Create a Notchpay account if you do not already have one.',
          'Copy your Public key and Secret key from your Notchpay dashboard.',
          'Paste them in the corresponding fields and click "Save".',
          'Once configured, parents can pay directly from their space via Flooz or TMoney.',
        ],
        callout: { type: 'tip', text: 'Without Notchpay keys, online payments are disabled. Manual payments (cash, cheque) remain available.' },
      },
      {
        title: 'Grade appreciation grid',
        content: `The appreciation grid defines the grade labels assigned based on the average obtained. It is applied automatically on all report cards.

Default values (out of 20):
• 18 – 20: Excellent
• 16 – 18: Very Good
• 14 – 16: Good
• 12 – 14: Fairly Good
• 10 – 12: Pass
• 0 – 10 : Fail

For primary school subjects graded out of 10, enable the "Primary school" option at the class or subject level.`,
      },
      {
        title: 'End of school year — Student promotion',
        steps: [
          'Go to the menu → Settings, section "End of year".',
          'Select the year to close.',
          'Choose the new target school year.',
          'The system automatically proposes to promote each class to the next level.',
          'Adjust promotions as needed (repeaters, stream changes).',
          'Click "Launch promotion". Students are moved to their new class.',
        ],
        callout: { type: 'warning', text: 'This operation is irreversible. Make sure all report cards for the current year are published before launching end-of-year promotion.' },
      },
      {
        title: 'Exporting school data',
        steps: [
          'Go to the menu → Settings.',
          'Click "Export data".',
          'The export generates a CSV file with all data (students, grades, payments).',
          'This file can be opened in Excel for archiving or external analysis.',
        ],
      },
    ],
  },
  {
    num: 3,
    title: 'Subscription and pricing',
    icon: '💳',
    sections: [
      {
        title: 'Available plans',
        content: `NovaBulletin offers four subscription tiers based on your school size:

• Starter — Fewer than 50 students — FREE (full access to all features)
• Basic — 50 to 99 students — 10,000 FCFA/month or 100,000 FCFA/year
• Pro — 100 to 199 students — 20,000 FCFA/month or 200,000 FCFA/year
• Enterprise — 200+ students — 35,000 FCFA/month or 350,000 FCFA/year

An annual subscription saves you the equivalent of 2 months compared to monthly billing.`,
        callout: { type: 'tip', text: 'Choose the annual subscription to save two months of fees per year.' },
      },
      {
        title: 'Subscribing or renewing',
        steps: [
          'Go to the menu → Subscription.',
          'Check your current plan and expiry date.',
          'Click the desired plan.',
          'Choose the billing cycle: monthly or annual.',
          'Select your mobile operator: TMoney (Togocel), Flooz (Moov) or Moov Money.',
          'Click "Pay". You are redirected to the Notchpay payment page.',
          'Confirm the payment from your phone.',
          'Once confirmed, your subscription is activated immediately.',
        ],
      },
      {
        title: 'Subscription history',
        steps: [
          'Go to the menu → Subscription.',
          'The "Payment history" section lists all past subscriptions.',
          'Each transaction shows: date, amount, plan and status (paid / pending).',
        ],
        callout: { type: 'note', text: 'If your subscription expires, access to advanced features is suspended but your data is preserved. Renew to restore full access.' },
      },
    ],
  },
  {
    num: 4,
    title: 'User and staff management',
    icon: '👥',
    sections: [
      {
        title: 'Creating a user account',
        steps: [
          'Go to the menu → Users.',
          'Click "+ New user".',
          'Enter: full name, email, role (Teacher, Bursar or Parent) and a temporary password.',
          'Click "Create".',
          'The user receives an email with their credentials and can log in immediately.',
        ],
        callout: { type: 'tip', text: 'Use a simple temporary password and ask the user to change it on first login via Settings → Profile.' },
      },
      {
        title: 'Editing or disabling an account',
        steps: [
          'In the user list, click the user\'s row.',
          'Click "Edit" to change the name or email.',
          'Click "Disable" to block access without deleting the account.',
          'Click "Reset password" to send a new password by email.',
        ],
      },
      {
        title: 'Staff directory',
        content: `The staff directory centralises professional information for all staff members. Access it via the menu → Staff directory.

Information available per employee:
• Title (Mr, Mrs, Dr…) and speciality
• Academic qualifications (BEPC, BAC, Licence, Master, PhD…)
• Contract type (Permanent, Fixed-term, Casual, Civil servant)
• Phone number and hire date
• Biography / Internal notes`,
      },
      {
        title: 'Creating or updating a staff profile',
        steps: [
          'Go to the menu → Staff directory.',
          'Click on the employee to open their details panel.',
          'Click "Edit profile".',
          'Fill in: title, speciality, phone, contract type, qualifications, hire date, biography.',
          'Click "Save".',
        ],
      },
      {
        title: 'Linking a parent to a student',
        content: `A parent can be linked to one or more students. This allows them to view report cards and pay online.`,
        steps: [
          'First create the parent account.',
          'Go to Students → select the student.',
          'In the student profile, section "Parent / Guardian", enter the parent\'s email.',
          'Click "Link". The parent will now see this student in their space.',
        ],
      },
      {
        title: 'Managing your personal profile',
        steps: [
          'Click the green (profile) floating button on the right, or go to the menu → My profile.',
          'Click "Edit" to update your name and phone number.',
          'To change your password: enter the current password, then the new password twice.',
          'To add a profile picture: click the avatar and upload an image.',
          'Click "Save".',
        ],
      },
    ],
  },
  {
    num: 5,
    title: 'Student management',
    icon: '🎓',
    sections: [
      {
        title: 'Adding a student manually',
        steps: [
          'Go to the menu → Students.',
          'Click "+ New student".',
          'Enter: full name, date of birth, gender, enrolled class.',
          'Add optional information: admission number, parent contact, blood group.',
          'Click "Save".',
          'An admission number is generated automatically if you do not provide one.',
        ],
      },
      {
        title: 'Importing students via CSV',
        steps: [
          'Go to the menu → CSV Import.',
          'Click "Download template" to get the reference file.',
          'Fill in the file (one row per student). Required columns: name, className.',
          'Optional columns: dateOfBirth, gender, admissionNumber, parentEmail, bloodGroup.',
          'Save as CSV (UTF-8).',
          'Click "Import CSV", select your file, check the preview, then confirm.',
        ],
        callout: { type: 'warning', text: 'If a student with the same admission number already exists, the import updates them instead of creating a duplicate. Always check the preview before confirming.' },
      },
      {
        title: 'Viewing a student profile',
        content: `The student profile brings all information together in one place:

• Information — Identity, class, admission number, contacts.
• Payments — Fee status, payment details, payment plans.
• Attendance — Summary of absences, tardiness and excused absences.
• Report cards — List of published report cards by term.
• Discipline — Disciplinary record (warnings, sanctions, commendations).
• Health — Medical file (visits, vaccinations, allergies).
• Transfers — School history.`,
      },
      {
        title: 'Transferring a student',
        steps: [
          'Open the student profile, "Transfers" tab.',
          'For an outgoing transfer: click "+ Outgoing transfer", enter the destination school and effective date.',
          'For an incoming transfer: create the student normally and enter the origin school.',
          'The transfer is archived in the student\'s history.',
        ],
      },
      {
        title: 'Moving a student to another class',
        steps: [
          'Open the student profile.',
          'Click "Edit".',
          'Change the "Class" field.',
          'Click "Save".',
        ],
        callout: { type: 'note', text: 'Previously created grades and report cards remain linked to the student regardless of their current class.' },
      },
    ],
  },
  {
    num: 6,
    title: 'Classes, Subjects and Timetable',
    icon: '📚',
    sections: [
      {
        title: 'Creating a class',
        steps: [
          'Go to the menu → Classes.',
          'Click "+ New class".',
          'Enter the name (e.g. Grade 6A, Year 9 B, Upper 6th C), level and stream.',
          'Assign a form teacher (responsible teacher).',
          'Click "Create".',
        ],
      },
      {
        title: 'Viewing a class list',
        steps: [
          'Go to the menu → Classes.',
          'Click on a class name.',
          'You see the student list, subjects and statistics.',
          'The merit list (ranking by average) is accessible via the "Merit list" button.',
        ],
      },
      {
        title: 'Creating subjects and coefficients',
        steps: [
          'Go to the menu → Subjects.',
          'Click "+ New subject".',
          'Enter the name, category and coefficient.',
          'For primary school: enable "Score out of 10" if the maximum mark is 10.',
          'Click "Create".',
        ],
        callout: { type: 'tip', text: 'The coefficient directly affects the calculation of the overall average. Check the official coefficients of your curriculum before entering them.' },
      },
      {
        title: 'Building the timetable',
        steps: [
          'Go to the menu → Timetable.',
          'Select the class.',
          'Click on a time slot in the weekly grid.',
          'Choose the subject, the assigned teacher and the room.',
          'The system automatically detects conflicts.',
          'Click "Apply".',
        ],
      },
    ],
  },
  {
    num: 7,
    title: 'Grade entry and validation',
    icon: '✏️',
    sections: [
      {
        title: 'Grade sheets',
        content: `A grade sheet is the official document for entering results for a subject, class and term.

Grade sheet lifecycle:
• Open → The teacher enters grades.
• Signed → The teacher validates the sheet. No further changes are possible.
• Published → Grades are integrated into report cards.`,
      },
      {
        title: 'Entering grades',
        steps: [
          'Go to the menu → Grade sheets.',
          'Select the term and class.',
          'Click on the relevant subject.',
          'Enter each student\'s grade. Press Tab to move to the next student.',
          'The class average is calculated automatically.',
          'Click "Save grades".',
        ],
        callout: { type: 'tip', text: 'Grades are auto-saved every 30 seconds. You can pause and resume entry at any time.' },
      },
      {
        title: 'Signing a grade sheet',
        steps: [
          'Once all grades are entered, click "Sign sheet".',
          'Confirm in the dialog box.',
          'The sheet changes to "Signed" status and can no longer be modified.',
          'If a correction is needed after signing, the administrator can unlock the sheet.',
        ],
        callout: { type: 'warning', text: 'Only sign the sheet when all grades are final. A signed sheet can only be modified by an administrator.' },
      },
      {
        title: 'Printing a grade sheet',
        steps: [
          'Open the desired grade sheet.',
          'Click "Print sheet".',
          'Your browser opens the print dialog.',
          'Select "Save as PDF" to keep a digital copy.',
        ],
      },
    ],
  },
  {
    num: 8,
    title: 'Report cards',
    icon: '📋',
    sections: [
      {
        title: 'Report card creation process',
        content: `The report card is the central document in NovaBulletin:

1. The administrator configures the term in Settings.
2. Teachers enter grades in their grade sheets.
3. Teachers sign their grade sheets to validate them.
4. The administrator creates the report card, checks grades and publishes it.
5. The report card is sent to parents by email/WhatsApp.`,
      },
      {
        title: 'Creating and publishing a report card',
        steps: [
          'Go to the menu → Report cards.',
          'Click "+ New report card".',
          'Select the class, term and school year.',
          'Grades entered by teachers appear automatically.',
          'Check and complete any missing grades.',
          'Add an overall comment from the class council (optional).',
          'Click "Publish".',
        ],
        callout: { type: 'tip', text: 'You can create report cards for an entire class in one operation using "Create for entire class".' },
      },
      {
        title: 'Fee gate system',
        content: `If the fee gate is enabled in Settings:

• A published report card is only visible to the family IF school fees are paid.
• The bursar sees held report cards in their dashboard.
• Once a sufficient payment is recorded, the report card is automatically unlocked.
• The administrator can force distribution even with outstanding fees.`,
        callout: { type: 'important', text: 'The fee gate is a powerful collection tool. Only enable it if your school has a clear policy on this.' },
      },
      {
        title: 'Printing or downloading a report card',
        steps: [
          'Open the report card.',
          'Click "Print" or the print icon.',
          'Select "Save as PDF" in the print dialog.',
          'To print all report cards for a class: Classes → select the class → "Print all report cards".',
        ],
      },
      {
        title: 'Authenticity verification (QR code)',
        content: `Each published report card carries a unique QR code for authenticity verification.

• The QR code appears at the bottom of each printed report card.
• Scanning it opens a public page confirming the report card's authenticity.
• This feature protects against forgery.`,
        callout: { type: 'tip', text: 'Encourage schools and employers who receive NovaBulletin cards to use QR verification to confirm authenticity.' },
      },
      {
        title: 'Class merit list',
        steps: [
          'Go to Classes → select a class.',
          'Click "Merit list".',
          'The list ranks students by overall average for the selected term.',
          'Click "Print merit list" to get a printable version.',
        ],
      },
      {
        title: 'Annual report',
        steps: [
          'Go to the menu → Annual report.',
          'Select the school year.',
          'The report summarises: enrolment, pass rates, averages, fee collection rate.',
          'Click "Print".',
        ],
      },
    ],
  },
  {
    num: 9,
    title: 'Finances and school fees',
    icon: '💰',
    sections: [
      {
        title: 'Defining fee items',
        steps: [
          'Go to the menu → School fees.',
          'Click "+ New fee item".',
          'Enter the name (e.g. Tuition T1, Registration, Transport, Canteen).',
          'Set the amount and target class (or "All classes").',
          'Specify whether the item is mandatory or optional.',
          'Click "Create".',
        ],
        callout: { type: 'tip', text: 'Create separate items for each type of fee rather than one global item. This makes tracking and targeted reminders easier.' },
      },
      {
        title: 'Recording a payment',
        steps: [
          'Go to the menu → Payments.',
          'Click "+ New payment".',
          'Search for the student by name or admission number.',
          'Enter the amount, payment method (cash, mobile money, cheque) and a reference.',
          'Click "Save".',
        ],
      },
      {
        title: 'Printing a payment receipt',
        steps: [
          'After saving a payment, click "PDF Receipt".',
          'You can also find past payments in the payment list and print the receipt at any time.',
        ],
      },
      {
        title: 'Instalment payment plans',
        content: `A payment plan allows a family to pay fees in several instalments according to a defined schedule.`,
        steps: [
          'Go to the menu → Payment plans.',
          'Click "+ New plan".',
          'Select the student and enter the total amount.',
          'Add instalments: due date and amount for each instalment.',
          'Click "Create plan".',
          'To record an instalment: open the plan, click on the instalment and enter the amount received.',
        ],
        callout: { type: 'tip', text: 'Use payment plans for families in financial difficulty. It maintains trust while securing collection.' },
      },
      {
        title: 'Tracking unpaid fees',
        steps: [
          'Go to the menu → Analytics.',
          'Check the overall and per-class collection rate.',
          'Filter the payment list by "Balance > 0" to identify families with outstanding fees.',
          'In the student profile, click "Send reminder" to alert the parent by email or WhatsApp.',
        ],
      },
      {
        title: 'Online payments (parent space)',
        content: `Parents can pay online directly via mobile money:

• The parent clicks "Pay online" in their child's profile.
• They enter the amount and choose their operator (Flooz or TMoney).
• They are redirected to the secure Notchpay payment page.
• After confirmation, the payment is automatically recorded and a receipt is sent by email.
• If fees are now covered, the report card is automatically unlocked.`,
        callout: { type: 'note', text: 'Online payments require the Notchpay keys to be configured in Settings (see Chapter 2).' },
      },
      {
        title: 'Exempting a student from fees',
        steps: [
          'Open the student profile, "Payments" tab.',
          'Click "Exempt" next to the relevant fee item.',
          'Confirm the exemption. The student is marked as exempt for that item.',
        ],
      },
    ],
  },
  {
    num: 10,
    title: 'Attendance and discipline',
    icon: '📅',
    sections: [
      {
        title: 'Recording attendance',
        steps: [
          'Go to the menu → Attendance.',
          'Select the class and date.',
          'For each student, mark: Present (P), Absent (A), Late (L) or Excused (E).',
          'Add an optional note for absences (reason, supporting document).',
          'Click "Save".',
        ],
        callout: { type: 'tip', text: 'Attendance can be entered by the form teacher from their space.' },
      },
      {
        title: 'Class absence report',
        steps: [
          'Go to the menu → Attendance.',
          'Select a class and a period.',
          'The table shows the attendance rate for each student.',
          'Click "Export" to download a CSV report.',
        ],
      },
      {
        title: 'Managing disciplinary records',
        steps: [
          'Go to the menu → Discipline.',
          'Click "+ New record".',
          'Select the student and choose the type: Warning, Suspension, Expulsion, Commendation, Other.',
          'Describe the incident or reason for the sanction.',
          'Click "Create".',
          'Mark the record as "Resolved" once the matter is settled.',
        ],
      },
    ],
  },
  {
    num: 11,
    title: 'Incident reports',
    icon: '🚨',
    sections: [
      {
        title: 'What are incident reports for?',
        content: `The incident report module allows parents and students to report incidents: bullying, violence, safety concerns, etc.

Possible statuses:
• Pending — Report received, not yet processed.
• Under review — The administration is examining the report.
• Resolved — The incident has been addressed.
• Dismissed — No action required.`,
      },
      {
        title: 'Submitting a report (Parent or Student)',
        steps: [
          'Go to the menu → Report an incident.',
          'Describe the incident: title, category, date and detailed description.',
          'You can choose to remain anonymous.',
          'Click "Submit".',
        ],
      },
      {
        title: 'Managing reports (Administrator)',
        steps: [
          'Go to the menu → Incident reports.',
          'The list displays all reports with their status.',
          'Click on a report to open it.',
          'Change the status and add internal administrative notes.',
          'Click "Save".',
        ],
        callout: { type: 'important', text: 'Process reports within 48 hours. An unaddressed report can undermine families\' trust in the school.' },
      },
    ],
  },
  {
    num: 12,
    title: 'Mock exams',
    icon: '📝',
    sections: [
      {
        title: 'Creating a mock exam session',
        steps: [
          'Go to the menu → Mock exams.',
          'Click "+ New mock exam".',
          'Enter the name (e.g. Mock BEPC — June 2026), type and date.',
          'Select the participating classes.',
          'Click "Create".',
        ],
      },
      {
        title: 'Entering mock exam grades',
        steps: [
          'Open the session.',
          'Click "Grade sheets".',
          'Select a subject and enter students\' grades.',
          'Click "Save".',
          'Repeat for each subject.',
        ],
      },
      {
        title: 'Viewing results and merit list',
        steps: [
          'In the mock exam, go to the "Results" tab.',
          'Averages and rankings are calculated automatically.',
          'View the overall and per-class merit lists.',
          'Click "Print merit list" to get a printable version.',
        ],
      },
    ],
  },
  {
    num: 13,
    title: 'School registers',
    icon: '🗂️',
    sections: [
      {
        title: 'Library — Catalogue and loans',
        steps: [
          'Go to the menu → Library.',
          '"Catalogue" tab: add available books (title, quantity, condition, location).',
          '"Current loans" tab: record a new loan (book + borrower + expected return date).',
          '"History" tab: view all past loans.',
          'Click "Return" to record a book return and note its condition.',
        ],
      },
      {
        title: 'Inventory',
        steps: [
          'Go to the menu → Inventory.',
          'Click "+ Add equipment".',
          'Enter: name, category (Furniture, IT, Sports, Laboratory, Other), quantity, condition, location, supplier, purchase value.',
          'The dashboard shows the estimated total value of the school\'s assets.',
        ],
      },
      {
        title: 'Purchases register',
        content: `The purchases register tracks all acquisitions made by the school.`,
        steps: [
          'Go to the menu → Purchases.',
          'Click "+ New purchase".',
          'Enter: date, item name, model, price and notes.',
          'Click "Save".',
          'Click "Export CSV" to export the register to Excel.',
        ],
        callout: { type: 'tip', text: 'Fill in the register as soon as an invoice is received to simplify accounting and audits.' },
      },
      {
        title: 'Health',
        steps: [
          'Go to the menu → Health.',
          'Search for a student and open their medical file.',
          'Record: medical visits, accidents, vaccinations, ongoing treatments.',
        ],
      },
      {
        title: 'Official documents',
        steps: [
          'Go to the menu → Documents.',
          'Click "+ Upload document".',
          'Choose visibility (all / teachers only / administration only).',
          'Click "Save".',
        ],
      },
      {
        title: 'Alumni',
        steps: [
          'Go to the menu → Alumni.',
          'Click "+ Add graduate".',
          'Enter: graduation year, exit class, diploma number, national exam results.',
          'Click "Save".',
        ],
      },
      {
        title: 'National exam results',
        steps: [
          'Go to the menu → National exams.',
          'Click "+ Add result".',
          'Select the student and exam (CEPE, BEPC, BAC).',
          'Enter: candidate number, session, grade and result (Pass/Fail).',
          'Click "Save".',
        ],
      },
    ],
  },
  {
    num: 14,
    title: 'Communication and announcements',
    icon: '📢',
    sections: [
      {
        title: 'Publishing an announcement',
        steps: [
          'Go to the menu → Announcements.',
          'Click "+ New announcement".',
          'Write the title and content.',
          'Choose the audience: all classes, a specific class, or a role.',
          'Click "Publish".',
        ],
      },
      {
        title: 'School calendar',
        steps: [
          'Go to the menu → Calendar.',
          'Click on a date to create an event.',
          'Enter: title, type (Holidays, Exam, Meeting, School trip, Other), start and end dates.',
          'Click "Save".',
        ],
      },
      {
        title: 'WhatsApp and email notifications',
        content: `NovaBulletin automatically sends notifications to parents when:
• A new report card is published.
• A payment is confirmed.
• An important announcement is published.
• A payment reminder is due for outstanding fees.

Parents can configure their preferences (WhatsApp / email) from their profile.`,
        callout: { type: 'note', text: 'WhatsApp notifications require the parent to have a valid phone number in their profile.' },
      },
      {
        title: 'Notification log',
        steps: [
          'Go to the menu → Notifications.',
          '"Held report cards" tab: notifications blocked by the fee gate.',
          'Click "Send now" to force-send a held notification.',
          '"Payment link" button: sends a WhatsApp payment link directly to the parent.',
          '"My notifications" tab: history of notifications received in your space.',
        ],
        callout: { type: 'tip', text: 'Use "Send payment link" for quick and effective reminders. The parent receives a WhatsApp link to pay directly from their phone.' },
      },
    ],
  },
  {
    num: 15,
    title: 'LMS — Online learning space',
    icon: '🎯',
    sections: [
      {
        title: 'What is the LMS?',
        content: `The LMS (Learning Management System) module allows teachers to share educational resources with their classes.

Available resource types:
• Lessons — Course notes and lessons.
• Exercises — Practice exercises.
• Assignments — Work to be submitted.
• Quizzes — Assessment questionnaires.
• Announcements — Class communications.`,
      },
      {
        title: 'Publishing a resource (Teacher)',
        steps: [
          'Go to the menu → Learning.',
          'Click "+ New resource".',
          'Choose the type and write the content or attach a file (PDF, image, document).',
          'Select the destination class and subject.',
          'Set a due date if it is an assignment.',
          'Click "Publish".',
        ],
      },
      {
        title: 'Viewing resources (Student / Parent)',
        steps: [
          'Go to the menu → Learning.',
          'Browse the tabs: Lessons, Assignments, Quizzes, Announcements.',
          'Click on a resource to view or download it.',
          'For assignments: submit your work directly from the platform.',
        ],
      },
    ],
  },
  {
    num: 16,
    title: 'Analytics and reports',
    icon: '📊',
    sections: [
      {
        title: 'Administrator dashboard',
        content: `The dashboard provides a real-time overview of the school:

• Number of enrolled students, teachers, active classes.
• Report cards published in the current term.
• Fee collection rate (collected / expected).
• Recent payments list.
• Interactive charts by class and over time.`,
      },
      {
        title: 'Financial analytics',
        steps: [
          'Go to the menu → Analytics.',
          'Select the school year to analyse.',
          'View: overall collection rate, breakdown Paid / Partial / Unpaid / Exempt.',
          'Bar chart: collections by class.',
          'Click "Export report" to download a full CSV.',
        ],
      },
      {
        title: 'Class statistics',
        steps: [
          'Go to Classes → select a class.',
          'Click "Statistics".',
          'View: class average by subject, grade distribution, pass rate.',
          'Compare results between terms.',
        ],
      },
      {
        title: 'Data exports',
        content: `Several exports are available:
• Payments → CSV export of all payments.
• Students → CSV export of the student list.
• Purchases → CSV export of the purchases register.
• Analytics → Full financial report export.
• Settings → Complete school data export.`,
      },
    ],
  },
  {
    num: 17,
    title: 'Teacher space',
    icon: '👨‍🏫',
    sections: [
      {
        title: 'Teacher dashboard',
        content: `The dashboard displays:
• Classes assigned for the current year.
• Grade sheets awaiting signature.
• Report cards to complete or publish.
• The week's timetable.
• Recent announcements.`,
      },
      {
        title: 'Entering grades',
        steps: [
          'Go to the menu → Grade sheets.',
          'Select the term and class.',
          'Enter grades in the table.',
          'Click "Save grades".',
          'Click "Sign sheet" to finalise.',
        ],
      },
      {
        title: 'Creating a report card (Form teacher)',
        steps: [
          'Go to the menu → Report cards.',
          'Click "+ New report card".',
          'Select your class and term.',
          'Check grades and add your class council comments.',
          'Click "Publish".',
        ],
      },
      {
        title: 'Recording attendance',
        steps: [
          'Go to the menu → Attendance.',
          'Select your class and the date.',
          'Mark each student\'s status.',
          'Click "Save".',
        ],
      },
      {
        title: 'Curriculum and roadmap',
        steps: [
          'Go to the menu → Curriculum to update your course progression.',
          'Go to the menu → Roadmap for your annual teaching plan.',
        ],
        callout: { type: 'note', text: 'As a teacher, you only see students from your own classes. Access to financial information is reserved for the administrator and bursar.' },
      },
    ],
  },
  {
    num: 18,
    title: 'Bursar space',
    icon: '💼',
    sections: [
      {
        title: 'Bursar dashboard',
        content: `The bursar dashboard displays in real time:
• Total collected for the selected period (today / week / month / all).
• Payment breakdown by class.
• Recent payment list.
• Held report cards awaiting payment.`,
      },
      {
        title: 'Recording a payment',
        steps: [
          'Go to the menu → Payments.',
          'Click "+ New payment".',
          'Search for the student.',
          'Enter the amount, method and an optional reference.',
          'Click "Save".',
          'Print the receipt via "PDF Receipt".',
        ],
      },
      {
        title: 'Held report cards',
        steps: [
          'Go to the menu → Notifications.',
          '"Held report cards" tab: list of students whose report card is blocked.',
          'After a sufficient payment, the report card is automatically unlocked.',
          'Click "Send now" to notify the family.',
          'Click "Payment link" to send a WhatsApp payment link to the parent.',
        ],
      },
    ],
  },
  {
    num: 19,
    title: 'Parent space',
    icon: '👨‍👩‍👧',
    sections: [
      {
        title: 'Parent dashboard',
        content: `The parent dashboard displays:
• The list of your enrolled children.
• Each child's fee status.
• The latest school announcements.
• Upcoming events in the calendar.`,
      },
      {
        title: 'Viewing your child\'s report cards',
        steps: [
          'Go to the menu → My children.',
          'Click on the child.',
          'Click on the term to open the report card.',
          'If the report card is locked (padlock icon), pay the fees online or contact the bursar.',
        ],
      },
      {
        title: 'Paying online',
        steps: [
          'Open your child\'s profile.',
          'Click "Pay online".',
          'Enter the amount and choose your operator (Flooz or TMoney).',
          'Confirm from your phone.',
          'A receipt is sent to you by email.',
        ],
      },
      {
        title: 'Notification preferences',
        steps: [
          'Go to the menu → Notifications.',
          'Choose how you receive alerts: Email, WhatsApp or both.',
          'Verify that your phone number is correct.',
          'Click "Save".',
        ],
      },
    ],
  },
  {
    num: 20,
    title: 'Student space',
    icon: '🧑‍🎓',
    sections: [
      {
        title: 'Student dashboard',
        content: `The dashboard displays:
• Your overall average for the current term.
• Your latest published grades.
• The week's timetable.
• Assignments due.
• School and class announcements.`,
      },
      {
        title: 'Viewing your report cards',
        steps: [
          'Go to the menu → My report cards.',
          'Select the desired term.',
          'You see your grades by subject, averages and teacher comments.',
        ],
      },
      {
        title: 'Tracking your progress',
        steps: [
          'Go to the menu → My progress.',
          'The chart shows the evolution of your overall average term by term.',
          'Click "View by subject" to see detailed results by discipline.',
        ],
      },
      {
        title: 'Accessing courses (LMS)',
        steps: [
          'Go to the menu → Learning.',
          'View lessons, exercises and assignments published by your teachers.',
          'Submit your work directly from the platform.',
        ],
      },
    ],
  },
  {
    num: 21,
    title: 'Tips and best practices',
    icon: '💡',
    sections: [
      {
        title: 'Recommended startup order',
        steps: [
          '1. Complete the setup wizard.',
          '2. Customise Appearance (logo, colours, school name).',
          '3. Configure Notchpay keys for online payments.',
          '4. Create Subjects with their correct coefficients.',
          '5. Create Classes and assign form teachers.',
          '6. Create User accounts (teachers, bursar).',
          '7. Import or add Students.',
          '8. Link parents to students.',
          '9. Define School fee items.',
          '10. Build the Timetable.',
          '11. Teachers can now enter grades.',
          '12. Publish report cards at the end of each term.',
        ],
      },
      {
        title: 'Tips for optimal use',
        content: `• Always click "Save" before leaving a form.
• Name classes with official names (Year 9A, Upper 6th C).
• Schedule a reminder for teachers to sign sheets before the deadline.
• Enable the fee gate at the start of the year to maximise collection.
• Export your data to CSV regularly as a local backup.
• Check the notification log after each batch of published report cards.`,
      },
      {
        title: 'Security and privacy',
        content: `• Never share your password, even with colleagues.
• Change your password every 3 months.
• Log out after each session on a shared or public computer.
• Do not share student data (grades, personal information) via WhatsApp or unsecured email.
• If your account is compromised, change your password immediately.`,
        callout: { type: 'warning', text: 'NovaBulletin support will never ask for your password. Do not share your credentials with anyone.' },
      },
      {
        title: 'Common issues and solutions',
        content: `• Report card not visible → Check that the report card is published and fees are settled (if fee gate is active).
• Grades missing from report card → The teacher must sign their grade sheet.
• Parent not receiving notifications → Check email and phone number in the parent profile.
• Online payment not confirmed → Wait 5 minutes and refresh. Contact Notchpay support if the issue persists.
• Timetable conflict → Reassign the teacher or change the time slot.`,
      },
      {
        title: 'Technical support',
        content: `For any question or technical issue:
• Consult the built-in AI assistant (floating button at the bottom right).
• Contact NovaBulletin support by email.
• Describe the issue precisely and attach a screenshot.

Support hours: Monday – Friday, 8am – 6pm (Lomé time, GMT+0).`,
      },
    ],
  },
];

// ─── BOOK META ──────────────────────────────────────────────────────────────────
const BOOK = {
  fr: {
    chapters: CHAPTERS_FR,
    title: 'Guide d\'utilisation — NovaBulletin',
    subtitle: 'Manuel complet de la plateforme de gestion scolaire',
    version: 'Version 2.0 — 2026',
    chaptersCount: 'chapitres · Guide complet',
    forewordTitle: 'Avant-propos',
    forewordBody: [
      'Ce guide est le document de référence officiel de la plateforme NovaBulletin. Il couvre l\'ensemble des fonctionnalités disponibles pour tous les rôles : administrateur, enseignant, économe, parent et élève.',
      'Nous vous recommandons de lire le Chapitre 2 (Configuration initiale) avant toute autre chose si vous configurez NovaBulletin pour la première fois. Les autres chapitres peuvent être consultés selon vos besoins.',
      'Ce guide est disponible en version imprimable : cliquez sur le bouton « Télécharger le guide (PDF) » en haut de la page, puis sélectionnez Enregistrer en PDF dans la fenêtre d\'impression.',
    ],
    forewordSig: '— L\'équipe NovaBulletin',
    tocTitle: 'Table des matières',
    chapterLabel: 'Chapitre',
    downloadBtn: '⬇ Télécharger le guide (PDF)',
    pageTitle: 'Guide d\'utilisation',
    pageSubtitle: 'Manuel complet — NovaBulletin',
    tagline: 'La gestion scolaire simplifiée pour l\'Afrique',
    rights: '© 2026 NovaBulletin — Tous droits réservés',
    calloutLabels: { tip: 'Conseil', warning: 'Attention', note: 'Remarque', important: 'Important' },
  },
  en: {
    chapters: CHAPTERS_EN,
    title: 'User Guide — NovaBulletin',
    subtitle: 'Complete school management platform manual',
    version: 'Version 2.0 — 2026',
    chaptersCount: 'chapters · Complete guide',
    forewordTitle: 'Foreword',
    forewordBody: [
      'This guide is the official reference document for the NovaBulletin platform. It covers all features available to every role: administrator, teacher, bursar, parent and student.',
      'We recommend reading Chapter 2 (Initial setup) first if you are configuring NovaBulletin for the first time. The other chapters can be consulted as needed.',
      'This guide is available in a printable version: click the "Download guide (PDF)" button at the top of the page, then select Save as PDF in the print dialog.',
    ],
    forewordSig: '— The NovaBulletin team',
    tocTitle: 'Table of contents',
    chapterLabel: 'Chapter',
    downloadBtn: '⬇ Download guide (PDF)',
    pageTitle: 'User Guide',
    pageSubtitle: 'Complete manual — NovaBulletin',
    tagline: 'Simplified school management for Africa',
    rights: '© 2026 NovaBulletin — All rights reserved',
    calloutLabels: { tip: 'Tip', warning: 'Warning', note: 'Note', important: 'Important' },
  },
};

// ─── COMPONENT ─────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const book = BOOK[lang];
  const { chapters, calloutLabels } = book;

  const [activeChapter, setActiveChapter] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePrint() {
    document.body.classList.add('guide-print-mode');
    window.print();
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('guide-print-mode');
    }, { once: true });
    setTimeout(() => document.body.classList.remove('guide-print-mode'), 3000);
  }

  const calloutIcons = { tip: '💡', warning: '⚠️', note: 'ℹ️', important: '🔴' };

  return (
    <AppShell>
      <div className="help-screen-header">
        <PageHeader title={book.pageTitle} subtitle={book.pageSubtitle} />
        <div className="help-screen-actions">
          <Button onClick={handlePrint} size="sm">{book.downloadBtn}</Button>
        </div>
      </div>

      <div className="help-book" ref={contentRef}>

        {/* ── Cover ── */}
        <div className="help-cover">
          <div className="help-cover__band" />
          <div className="help-cover__stripe" />
          <div className="help-cover__content">
            <div className="help-cover__logo">NovaBulletin</div>
            <div className="help-cover__divider" />
            <h1 className="help-cover__title">{book.title}</h1>
            <p className="help-cover__subtitle">{book.subtitle}</p>
            <p className="help-cover__version">{book.version}</p>
            <div className="help-cover__roles">
              <span>👤 {lang === 'fr' ? 'Administrateur' : 'Administrator'}</span>
              <span>👨‍🏫 {lang === 'fr' ? 'Enseignant' : 'Teacher'}</span>
              <span>💼 {lang === 'fr' ? 'Économe' : 'Bursar'}</span>
              <span>👨‍👩‍👧 Parent</span>
              <span>🧑‍🎓 {lang === 'fr' ? 'Élève' : 'Student'}</span>
            </div>
            <div className="help-cover__chapters-count">{chapters.length} {book.chaptersCount}</div>
          </div>
        </div>

        {/* ── Foreword ── */}
        <div className="help-foreword">
          <h2 className="help-foreword__title">{book.forewordTitle}</h2>
          {book.forewordBody.map((para, i) => <p key={i}>{para}</p>)}
          <div className="help-foreword__sig">{book.forewordSig}</div>
        </div>

        {/* ── TOC ── */}
        <div className="help-toc">
          <h2 className="help-toc__title">{book.tocTitle}</h2>
          <ol className="help-toc__list">
            {chapters.map((ch) => (
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
        {chapters.map((ch) => (
          <div key={ch.num} id={`chapter-${ch.num}`} className="help-chapter">
            <div className="help-chapter__header">
              <span className="help-chapter__icon">{ch.icon}</span>
              <div>
                <div className="help-chapter__num">{book.chapterLabel} {ch.num}</div>
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
                    <span className="help-callout__icon">{calloutIcons[sec.callout.type]}</span>
                    <span className="help-callout__label">{calloutLabels[sec.callout.type]}</span>
                    <p className="help-callout__text">{sec.callout.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* ── Back cover ── */}
        <div className="help-back-cover">
          <div className="help-back-cover__logo">NovaBulletin</div>
          <p className="help-back-cover__tagline">{book.tagline}</p>
          <div className="help-back-cover__line" />
          <p className="help-back-cover__contact">support@e-report.app</p>
          <p className="help-back-cover__copy">{book.rights}</p>
        </div>
      </div>

      {/* ── Scroll to top ── */}
      {showScrollTop && (
        <button
          className="help-scroll-top"
          onClick={scrollToTop}
          aria-label={lang === 'fr' ? 'Retour en haut' : 'Back to top'}
          title={lang === 'fr' ? 'Retour en haut' : 'Back to top'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </AppShell>
  );
}
