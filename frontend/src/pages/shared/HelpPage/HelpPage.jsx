import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import './HelpPage.css';

// ── Documentation content keyed by [lang][role] ───────────────────────────
const DOCS = {
  fr: {
    ADMIN: [
      {
        title: 'Tableau de bord',
        features: [
          { title: 'Vue d\'ensemble', desc: 'Voyez en un coup d\'œil le nombre d\'élèves, d\'enseignants, de classes, de bulletins publiés et le taux de recouvrement des frais.', to: '/admin' },
        ],
      },
      {
        title: 'Gestion de l\'école',
        features: [
          { title: 'Utilisateurs', desc: 'Créez et gérez les comptes enseignants, économes et parents. Activez/désactivez un compte, réinitialisez les mots de passe.', to: '/admin/users' },
          { title: 'Classes', desc: 'Créez des classes, assignez un titulaire, consultez la liste des élèves et l\'emploi du temps associé.', to: '/admin/classes' },
          { title: 'Élèves', desc: 'Ajoutez des élèves, éditez leur profil (informations familiales, médicales, admission), suivez leur statut de paiement.', to: '/admin/students' },
          { title: 'Importation CSV', desc: 'Importez en masse des élèves ou du personnel depuis un fichier CSV. Téléchargez le modèle, remplissez-le et chargez-le.', to: '/admin/import' },
          { title: 'Matières', desc: 'Créez et classez les matières par catégorie (Sciences, Maths, Langues, Arts, EPS…). Définissez les coefficients.', to: '/admin/subjects' },
        ],
      },
      {
        title: 'Pédagogie',
        features: [
          { title: 'Bulletins', desc: 'Consultez, créez et modifiez les bulletins scolaires. Filtrez par statut (brouillon, publié), classe et année.', to: '/admin/reports' },
          { title: 'Statistiques', desc: 'Analysez les performances par classe : moyennes, distributions, comparaisons entre trimestres.', to: '/admin/statistics' },
          { title: 'Annonces', desc: 'Publiez des annonces pour toutes les classes ou une classe spécifique. Les parents et élèves les verront dans leur espace.', to: '/admin/bulletins' },
          { title: 'Examens blancs', desc: 'Créez des sessions d\'examens blancs (CEPE, BEPC, BAC…), saisissez les notes et générez les fiches et palmarès.', to: '/admin/mock-exams' },
          { title: 'Fiches d\'examens blancs', desc: 'Visualisez et imprimez les fiches de saisie de notes pour chaque examen blanc créé.', to: '/admin/mock-exam-fiches' },
          { title: 'Résultats examens blancs', desc: 'Consultez le classement général et par classe pour chaque session d\'examen blanc.', to: '/admin/mock-exam-results' },
          { title: 'Apprentissage (LMS)', desc: 'Accédez aux cours et contenus pédagogiques publiés par les enseignants.', to: '/teacher/lms' },
        ],
      },
      {
        title: 'Finances',
        features: [
          { title: 'Frais scolaires', desc: 'Définissez les structures de frais (scolarité, inscription, transport, cantine…) par classe et par trimestre.', to: '/admin/fees' },
          { title: 'Paiements', desc: 'Enregistrez et consultez tous les paiements reçus (espèces, mobile money, chèque). Suivez les soldes restants.', to: '/admin/payments' },
          { title: 'Analytiques', desc: 'Tableaux de bord financiers : taux de recouvrement, paiements par méthode, bulletins retenus pour impayés.', to: '/admin/analytics' },
        ],
      },
      {
        title: 'Registres & Vie scolaire',
        features: [
          { title: 'Présences', desc: 'Enregistrez les présences journalières par classe. Consultez les récapitulatifs d\'absences.', to: '/admin/attendance' },
          { title: 'Personnel', desc: 'Gérez les profils du personnel : type de contrat, qualification, expérience, coordonnées.', to: '/admin/staff' },
          { title: 'Calendrier', desc: 'Créez les événements du calendrier scolaire : vacances, examens, réunions, sorties.', to: '/admin/calendar' },
          { title: 'Discipline', desc: 'Consignez les incidents disciplinaires (avertissements, exclusions, félicitations) et suivez l\'historique par élève.', to: '/admin/disciplinary' },
          { title: 'Anciens élèves', desc: 'Gérez les diplômés : numéro de diplôme, résultats aux examens nationaux, suivi de carrière.', to: '/admin/alumni' },
          { title: 'Transferts', desc: 'Traitez les demandes de transfert d\'élèves entrants et sortants.', to: '/admin/transfers' },
          { title: 'Inventaire', desc: 'Gérez l\'inventaire des équipements et fournitures de l\'école.', to: '/admin/inventory' },
          { title: 'Examens nationaux', desc: 'Saisissez et consultez les résultats officiels aux examens nationaux (CEPE, BEPC, BAC).', to: '/admin/national-exams' },
          { title: 'Bibliothèque', desc: 'Gérez le catalogue de la bibliothèque : ajout, prêt et retour de documents.', to: '/admin/library' },
          { title: 'Santé', desc: 'Conservez les fiches médicales des élèves : groupe sanguin, allergies, antécédents, vaccins.', to: '/admin/health' },
          { title: 'Documents', desc: 'Stockez et partagez les documents officiels de l\'école (règlement intérieur, circulaires…).', to: '/admin/school-documents' },
        ],
      },
      {
        title: 'Système & Configuration',
        features: [
          { title: 'Notifications retenues', desc: 'Voyez quels bulletins sont bloqués en attente de paiement des frais et relancez les familles concernées.', to: '/admin/notifications' },
          { title: 'Apparence', desc: 'Personnalisez les couleurs, la police, le logo et les en-têtes/pieds de page des bulletins imprimés.', to: '/admin/branding' },
          { title: 'Paramètres', desc: 'Configurez l\'année scolaire, la structure des trimestres, les notes de passage, la grille d\'appréciation et le verrou de frais.', to: '/admin/settings' },
        ],
      },
      {
        title: 'Profil',
        features: [
          { title: 'Mon profil', desc: 'Modifiez votre nom, numéro WhatsApp, photo de profil et mot de passe.', to: '/profile' },
        ],
      },
    ],

    TEACHER: [
      {
        title: 'Tableau de bord',
        features: [
          { title: 'Vue d\'ensemble', desc: 'Aperçu de vos classes assignées, du statut des bulletins en cours et des actions à compléter.', to: '/teacher' },
        ],
      },
      {
        title: 'Mes classes',
        features: [
          { title: 'Liste des classes', desc: 'Consultez toutes les classes qui vous sont assignées avec les détails (niveau, effectif, matières).', to: '/teacher/classes' },
          { title: 'Détail d\'une classe', desc: 'Accédez à la liste des élèves, à l\'emploi du temps et aux matières d\'une classe. Naviguez vers la saisie des notes.', to: '/teacher/classes' },
        ],
      },
      {
        title: 'Pédagogie',
        features: [
          { title: 'Fiches de notes', desc: 'Retrouvez vos fiches de saisie de notes par trimestre. Signez et validez une fiche une fois les notes saisies.', to: '/teacher/fiches' },
          { title: 'Bulletins', desc: 'Créez et éditez les bulletins scolaires de vos élèves. Ajoutez une appréciation générale et signez le bulletin.', to: '/teacher/reports' },
          { title: 'Statistiques', desc: 'Visualisez les performances de vos classes : moyennes par matière, histogrammes de distribution des notes.', to: '/teacher/statistics' },
          { title: 'Annonces', desc: 'Publiez des annonces ciblées pour vos classes (devoirs, événements, informations importantes).', to: '/teacher/bulletins' },
          { title: 'Présences', desc: 'Marquez les présents et absents dans vos classes. Consultez le récapitulatif d\'absences.', to: '/teacher/attendance' },
          { title: 'Examens blancs', desc: 'Créez des sessions d\'examens blancs pour préparer vos élèves aux concours nationaux.', to: '/teacher/mock-exams' },
          { title: 'Résultats examens blancs', desc: 'Consultez le classement et les résultats détaillés de vos sessions d\'examens blancs.', to: '/teacher/mock-exam-results' },
          { title: 'Apprentissage (LMS)', desc: 'Publiez des cours, exercices et ressources pédagogiques accessibles aux élèves et parents.', to: '/teacher/lms' },
          { title: 'Calendrier', desc: 'Consultez les événements du calendrier scolaire (vacances, examens, réunions).', to: '/teacher/calendar' },
        ],
      },
      {
        title: 'Profil',
        features: [
          { title: 'Mon profil', desc: 'Mettez à jour vos informations personnelles, votre photo et votre mot de passe.', to: '/profile' },
        ],
      },
    ],

    BURSAR: [
      {
        title: 'Tableau de bord',
        features: [
          { title: 'Vue d\'ensemble financière', desc: 'Résumé des encaissements du jour, total reçu, nombre de familles avec solde impayé ou partiel.', to: '/bursar' },
        ],
      },
      {
        title: 'Finances',
        features: [
          { title: 'Frais scolaires', desc: 'Consultez les structures de frais définies par l\'administration pour chaque classe et trimestre.', to: '/bursar/fees' },
          { title: 'Paiements', desc: 'Enregistrez les paiements reçus (espèces, mobile money, chèque). Recherchez un élève, saisissez le montant et le mode de paiement.', to: '/bursar/payments' },
          { title: 'Bulletins retenus', desc: 'Listez les bulletins bloqués en attente de paiement. Dès le paiement enregistré, le bulletin devient accessible à la famille.', to: '/bursar/notifications' },
        ],
      },
      {
        title: 'Profil',
        features: [
          { title: 'Mon profil', desc: 'Modifiez vos informations de connexion et votre mot de passe.', to: '/profile' },
        ],
      },
    ],

    PARENT: [
      {
        title: 'Tableau de bord',
        features: [
          { title: 'Vue d\'ensemble', desc: 'Résumé de la situation scolaire de vos enfants : scolarité, paiements en attente, dernières annonces.', to: '/parent' },
        ],
      },
      {
        title: 'Mes enfants',
        features: [
          { title: 'Liste de mes enfants', desc: 'Consultez le profil de chaque enfant inscrit : classe, statut de paiement, numéro d\'admission.', to: '/parent/children' },
          { title: 'Bulletins de l\'enfant', desc: 'Accédez aux bulletins publiés de votre enfant par trimestre. Un bulletin peut être bloqué si les frais ne sont pas réglés.', to: '/parent/children' },
          { title: 'Payer en ligne', desc: 'Initiez un paiement par mobile money directement depuis la fiche de votre enfant. Un reçu vous est envoyé par email.', to: '/parent/children' },
        ],
      },
      {
        title: 'Communication',
        features: [
          { title: 'Annonces', desc: 'Lisez les annonces publiées par l\'administration et les enseignants pour les classes de vos enfants.', to: '/parent/bulletins' },
          { title: 'Apprentissage (LMS)', desc: 'Consultez les cours, devoirs et ressources mis en ligne par les enseignants pour vos enfants.', to: '/parent/lms' },
          { title: 'Notifications', desc: 'Configurez vos préférences de notification : alertes WhatsApp et/ou email pour les bulletins et paiements.', to: '/parent/notifications' },
          { title: 'Calendrier', desc: 'Consultez le calendrier scolaire officiel : vacances, jours fériés, examens et événements.', to: '/parent/calendar' },
        ],
      },
      {
        title: 'Finances',
        features: [
          { title: 'Historique des paiements', desc: 'Retrouvez l\'historique complet de vos paiements avec date, montant, méthode et numéro de reçu.', to: '/parent/payments' },
        ],
      },
      {
        title: 'Profil',
        features: [
          { title: 'Mon profil', desc: 'Mettez à jour vos coordonnées, votre numéro WhatsApp et votre mot de passe.', to: '/profile' },
        ],
      },
    ],

    STUDENT: [
      {
        title: 'Tableau de bord',
        features: [
          { title: 'Mon espace', desc: 'Aperçu de votre dernier bulletin, votre mention générale (Excellent, Très Bien, Bien…) et vos statistiques.', to: '/student' },
        ],
      },
      {
        title: 'Mes résultats',
        features: [
          { title: 'Mes bulletins', desc: 'Consultez vos bulletins scolaires publiés par trimestre : notes, moyennes, appréciations des enseignants.', to: '/student/reports' },
          { title: 'Ma progression', desc: 'Visualisez l\'évolution de vos moyennes sur l\'année sous forme de graphique. Comparez vos performances trimestre par trimestre.', to: '/student/progress' },
        ],
      },
      {
        title: 'Communication & Apprentissage',
        features: [
          { title: 'Annonces', desc: 'Lisez les annonces publiées par votre école et vos enseignants.', to: '/student/bulletins' },
          { title: 'Apprentissage (LMS)', desc: 'Accédez aux cours, exercices et ressources mis en ligne par vos enseignants.', to: '/student/lms' },
        ],
      },
      {
        title: 'Profil',
        features: [
          { title: 'Mon profil', desc: 'Modifiez votre photo de profil et votre mot de passe.', to: '/profile' },
        ],
      },
    ],

    SUPERADMIN: [
      {
        title: 'Supervision des établissements',
        features: [
          { title: 'Tableau de bord', desc: 'Liste de tous les établissements inscrits sur la plateforme avec leur statut (Actif, En attente, Suspendu, Rejeté) et leur plan.', to: '/superadmin' },
          { title: 'Validation des inscriptions', desc: 'Approuvez ou rejetez les nouvelles demandes d\'inscription d\'établissements. Envoyez des notifications automatiques aux directeurs.' },
          { title: 'Gestion des plans', desc: 'Affectez ou modifiez le plan tarifaire d\'un établissement (quota d\'élèves, fonctionnalités actives).' },
        ],
      },
    ],
  },

  en: {
    ADMIN: [
      {
        title: 'Dashboard',
        features: [
          { title: 'Overview', desc: 'See at a glance the number of students, teachers, classes, published report cards, and fee collection rate.', to: '/admin' },
        ],
      },
      {
        title: 'School Management',
        features: [
          { title: 'Users', desc: 'Create and manage teacher, bursar, and parent accounts. Activate/deactivate accounts and reset passwords.', to: '/admin/users' },
          { title: 'Classes', desc: 'Create classes, assign a homeroom teacher, view student lists and timetables.', to: '/admin/classes' },
          { title: 'Students', desc: 'Add students, edit their profiles (family, medical, admission info), and track payment status.', to: '/admin/students' },
          { title: 'CSV Import', desc: 'Bulk-import students or staff from a CSV file. Download the template, fill it in, and upload it.', to: '/admin/import' },
          { title: 'Subjects', desc: 'Create and categorize subjects (Sciences, Maths, Languages, Arts, PE…). Set coefficients.', to: '/admin/subjects' },
        ],
      },
      {
        title: 'Pedagogy',
        features: [
          { title: 'Report Cards', desc: 'View, create, and edit student report cards. Filter by status (draft, published), class, and year.', to: '/admin/reports' },
          { title: 'Statistics', desc: 'Analyze performance by class: averages, grade distributions, term-over-term comparisons.', to: '/admin/statistics' },
          { title: 'Announcements', desc: 'Publish announcements to all classes or a specific class. Parents and students see them in their portals.', to: '/admin/bulletins' },
          { title: 'Mock Exams', desc: 'Create mock exam sessions (CEPE, BEPC, BAC…), enter grades, and generate score sheets and rankings.', to: '/admin/mock-exams' },
          { title: 'Mock Exam Sheets', desc: 'View and print grade entry sheets for each created mock exam session.', to: '/admin/mock-exam-fiches' },
          { title: 'Mock Exam Results', desc: 'View the overall and per-class rankings for each mock exam session.', to: '/admin/mock-exam-results' },
          { title: 'Learning (LMS)', desc: 'Access courses and learning content published by teachers.', to: '/teacher/lms' },
        ],
      },
      {
        title: 'Finance',
        features: [
          { title: 'Fees', desc: 'Define fee structures (tuition, registration, transport, canteen…) by class and by term.', to: '/admin/fees' },
          { title: 'Payments', desc: 'Record and view all received payments (cash, mobile money, cheque). Track remaining balances.', to: '/admin/payments' },
          { title: 'Analytics', desc: 'Financial dashboards: collection rates, payments by method, report cards held for non-payment.', to: '/admin/analytics' },
        ],
      },
      {
        title: 'Records & School Life',
        features: [
          { title: 'Attendance', desc: 'Record daily attendance per class. View absence summaries.', to: '/admin/attendance' },
          { title: 'Staff', desc: 'Manage staff profiles: contract type, qualifications, experience, and contact info.', to: '/admin/staff' },
          { title: 'Calendar', desc: 'Create school calendar events: holidays, exams, meetings, outings.', to: '/admin/calendar' },
          { title: 'Disciplinary', desc: 'Log disciplinary incidents (warnings, suspensions, commendations) and track history per student.', to: '/admin/disciplinary' },
          { title: 'Alumni', desc: 'Manage graduates: diploma numbers, national exam results, and career tracking.', to: '/admin/alumni' },
          { title: 'Transfers', desc: 'Process incoming and outgoing student transfer requests.', to: '/admin/transfers' },
          { title: 'Inventory', desc: 'Manage the school\'s equipment and supplies inventory.', to: '/admin/inventory' },
          { title: 'National Exams', desc: 'Enter and view official national exam results (CEPE, BEPC, BAC).', to: '/admin/national-exams' },
          { title: 'Library', desc: 'Manage the library catalogue: add books, record loans and returns.', to: '/admin/library' },
          { title: 'Health Records', desc: 'Keep student medical records: blood type, allergies, history, vaccinations.', to: '/admin/health' },
          { title: 'Documents', desc: 'Store and share official school documents (internal rules, circulars…).', to: '/admin/school-documents' },
        ],
      },
      {
        title: 'System & Configuration',
        features: [
          { title: 'Held Notifications', desc: 'See which report cards are blocked pending fee payment and follow up with the relevant families.', to: '/admin/notifications' },
          { title: 'Branding', desc: 'Customize colors, fonts, logo, and headers/footers on printed report cards.', to: '/admin/branding' },
          { title: 'Settings', desc: 'Configure the academic year, term structure, pass marks, grade scale, and fee gate.', to: '/admin/settings' },
        ],
      },
      {
        title: 'Profile',
        features: [
          { title: 'My Profile', desc: 'Edit your name, WhatsApp number, profile picture, and password.', to: '/profile' },
        ],
      },
    ],

    TEACHER: [
      {
        title: 'Dashboard',
        features: [
          { title: 'Overview', desc: 'See your assigned classes, current report card status, and pending actions.', to: '/teacher' },
        ],
      },
      {
        title: 'My Classes',
        features: [
          { title: 'Class List', desc: 'View all classes assigned to you with details: level, enrolment, subjects.', to: '/teacher/classes' },
          { title: 'Class Detail', desc: 'Access the student list, timetable, and subjects for a class. Navigate to grade entry from here.', to: '/teacher/classes' },
        ],
      },
      {
        title: 'Pedagogy',
        features: [
          { title: 'Grade Sheets', desc: 'Find your grade entry sheets by term. Sign and validate a sheet once grades are entered.', to: '/teacher/fiches' },
          { title: 'Report Cards', desc: 'Create and edit student report cards. Add a general comment and sign the report.', to: '/teacher/reports' },
          { title: 'Statistics', desc: 'View class performance: subject averages, grade distribution charts.', to: '/teacher/statistics' },
          { title: 'Announcements', desc: 'Post targeted announcements to your classes (homework, events, important info).', to: '/teacher/bulletins' },
          { title: 'Attendance', desc: 'Mark students present or absent in your classes. View absence summaries.', to: '/teacher/attendance' },
          { title: 'Mock Exams', desc: 'Create mock exam sessions to prepare students for national exams.', to: '/teacher/mock-exams' },
          { title: 'Mock Exam Results', desc: 'View rankings and detailed results for your mock exam sessions.', to: '/teacher/mock-exam-results' },
          { title: 'Learning (LMS)', desc: 'Publish lessons, exercises, and learning resources for students and parents.', to: '/teacher/lms' },
          { title: 'Calendar', desc: 'View school calendar events: holidays, exams, meetings.', to: '/teacher/calendar' },
        ],
      },
      {
        title: 'Profile',
        features: [
          { title: 'My Profile', desc: 'Update your personal info, profile picture, and password.', to: '/profile' },
        ],
      },
    ],

    BURSAR: [
      {
        title: 'Dashboard',
        features: [
          { title: 'Financial Overview', desc: 'Summary of today\'s collections, total received, and the number of families with unpaid or partial balances.', to: '/bursar' },
        ],
      },
      {
        title: 'Finance',
        features: [
          { title: 'Fees', desc: 'View fee structures defined by the administration for each class and term.', to: '/bursar/fees' },
          { title: 'Payments', desc: 'Record received payments (cash, mobile money, cheque). Search a student, enter the amount and payment method.', to: '/bursar/payments' },
          { title: 'Held Reports', desc: 'List report cards blocked pending payment. Once payment is recorded, the report becomes accessible to the family.', to: '/bursar/notifications' },
        ],
      },
      {
        title: 'Profile',
        features: [
          { title: 'My Profile', desc: 'Update your login details and password.', to: '/profile' },
        ],
      },
    ],

    PARENT: [
      {
        title: 'Dashboard',
        features: [
          { title: 'Overview', desc: 'Summary of your children\'s school situation: fees, pending payments, latest announcements.', to: '/parent' },
        ],
      },
      {
        title: 'My Children',
        features: [
          { title: 'Children List', desc: 'View each enrolled child\'s profile: class, payment status, admission number.', to: '/parent/children' },
          { title: 'Child\'s Report Cards', desc: 'Access your child\'s published report cards by term. A report may be locked if fees are unpaid.', to: '/parent/children' },
          { title: 'Pay Online', desc: 'Initiate a mobile money payment directly from your child\'s profile. A receipt is emailed to you.', to: '/parent/children' },
        ],
      },
      {
        title: 'Communication',
        features: [
          { title: 'Announcements', desc: 'Read announcements from the school administration and teachers for your children\'s classes.', to: '/parent/bulletins' },
          { title: 'Learning (LMS)', desc: 'View lessons, homework, and resources posted by teachers for your children.', to: '/parent/lms' },
          { title: 'Notifications', desc: 'Set your notification preferences: WhatsApp and/or email alerts for report cards and payments.', to: '/parent/notifications' },
          { title: 'Calendar', desc: 'View the official school calendar: holidays, public holidays, exams, and events.', to: '/parent/calendar' },
        ],
      },
      {
        title: 'Finance',
        features: [
          { title: 'Payment History', desc: 'View your complete payment history with date, amount, method, and receipt number.', to: '/parent/payments' },
        ],
      },
      {
        title: 'Profile',
        features: [
          { title: 'My Profile', desc: 'Update your contact info, WhatsApp number, and password.', to: '/profile' },
        ],
      },
    ],

    STUDENT: [
      {
        title: 'Dashboard',
        features: [
          { title: 'My Space', desc: 'Overview of your latest report card, overall mention (Excellent, Very Good, Good…) and key stats.', to: '/student' },
        ],
      },
      {
        title: 'My Results',
        features: [
          { title: 'My Report Cards', desc: 'View your published report cards by term: grades, averages, and teacher comments.', to: '/student/reports' },
          { title: 'My Progress', desc: 'Track your average over the year as a chart. Compare your performance term by term.', to: '/student/progress' },
        ],
      },
      {
        title: 'Communication & Learning',
        features: [
          { title: 'Announcements', desc: 'Read announcements posted by your school and teachers.', to: '/student/bulletins' },
          { title: 'Learning (LMS)', desc: 'Access lessons, exercises, and resources posted by your teachers.', to: '/student/lms' },
        ],
      },
      {
        title: 'Profile',
        features: [
          { title: 'My Profile', desc: 'Update your profile picture and password.', to: '/profile' },
        ],
      },
    ],

    SUPERADMIN: [
      {
        title: 'Institution Management',
        features: [
          { title: 'Dashboard', desc: 'List of all institutions registered on the platform with their status (Active, Pending, Suspended, Rejected) and plan.', to: '/superadmin' },
          { title: 'Registration Approval', desc: 'Approve or reject new school registration requests. Automatic notifications are sent to principals.' },
          { title: 'Plan Management', desc: 'Assign or change an institution\'s pricing plan (student quota, active features).' },
        ],
      },
    ],
  },
};

// ── Chevron icon ──────────────────────────────────────────────────────────
function Chevron({ open }) {
  return (
    <svg
      className={`help-section__chevron${open ? ' help-section__chevron--open' : ''}`}
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── External link icon ────────────────────────────────────────────────────
function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
function HelpPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const isFr = lang === 'fr';

  const sections = DOCS[lang]?.[user?.role] ?? [];
  const [openIdx, setOpenIdx] = useState(0);

  const toggle = (i) => setOpenIdx(prev => (prev === i ? -1 : i));

  return (
    <AppShell>
      <PageHeader
        title={isFr ? 'Guide d\'utilisation' : 'User Guide'}
        subtitle={isFr
          ? 'Découvrez toutes les fonctionnalités disponibles dans votre espace'
          : 'Explore all features available in your portal'}
      />

      <div className="help-page">
        {/* Role banner */}
        <div className="help-role-banner">
          <div className="help-role-banner__dot" />
          <span>
            {isFr ? 'Espace' : 'Portal'}&nbsp;
            <strong>{isFr
              ? { ADMIN: 'Administrateur', TEACHER: 'Enseignant', BURSAR: 'Économe', PARENT: 'Parent', STUDENT: 'Élève', SUPERADMIN: 'Super Admin' }[user?.role]
              : { ADMIN: 'Administrator', TEACHER: 'Teacher', BURSAR: 'Bursar', PARENT: 'Parent', STUDENT: 'Student', SUPERADMIN: 'Super Admin' }[user?.role]
            }</strong>
            &nbsp;—&nbsp;{user?.name}
          </span>
        </div>

        {/* Accordion sections */}
        {sections.map((section, si) => (
          <div key={si} className={`help-section${openIdx === si ? ' help-section--open' : ''}`}>
            <button
              className="help-section__header"
              onClick={() => toggle(si)}
              aria-expanded={openIdx === si}
            >
              <span className="help-section__title">{section.title}</span>
              <span className="help-section__meta">
                {section.features.length}&nbsp;{isFr ? 'fonctionnalité' : 'feature'}{section.features.length > 1 ? 's' : ''}
              </span>
              <Chevron open={openIdx === si} />
            </button>

            {openIdx === si && (
              <div className="help-section__body">
                {section.features.map((feat, fi) => (
                  <div key={fi} className="help-feature">
                    <div className="help-feature__content">
                      <p className="help-feature__title">{feat.title}</p>
                      <p className="help-feature__desc">{feat.desc}</p>
                    </div>
                    {feat.to && (
                      <Link to={feat.to} className="help-feature__link">
                        {isFr ? 'Ouvrir' : 'Open'}&nbsp;<LinkIcon />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <p className="help-page__footer">
          {isFr
            ? 'Pour toute question, contactez le support via votre administration scolaire.'
            : 'For any questions, contact support through your school administration.'}
        </p>
      </div>
    </AppShell>
  );
}

export default HelpPage;
