// Fonctionnalités de l'application, regroupées par onglet pour la page d'accueil.
// Chaque texte est un couple [français, anglais]. Ne mettre ici que ce qui existe dans l'application.

export const MODULE_TABS = [
  {
    key: 'exams',
    label: ['Examens & compositions', 'Exams & tests'],
    items: [
      { icon: '🎓', title: ['Examens blancs', 'Mock exams'], desc: ['CEPD, BEPC, BAC : sessions, fiches de notes par matière, moyennes et rangs automatiques.', 'CEPD, BEPC, BAC: sessions, subject grade sheets, automatic averages and ranks.'] },
      { icon: '🖊️', title: ['Devoirs surveillés', 'Supervised tests'], desc: ['L’administration crée la session, chaque professeur saisit et signe les notes de sa matière.', 'The office creates the session; each teacher enters and signs the marks for their subject.'] },
      { icon: '📆', title: ['Compositions mensuelles', 'Monthly tests'], desc: ['Primaire et secondaire : résultats, rangs et appréciations calculés chaque mois.', 'Primary and secondary: results, ranks and comments calculated every month.'] },
      { icon: '🔤', title: ['Compositions d’anglais (primaire)', 'English tests (primary)'], desc: ['Discipline à part : moyenne en %, rang et palmarès, documents entièrement en anglais.', 'A separate subject: average in %, rank and ranking list, documents fully in English.'] },
      { icon: '🧾', title: ['Relevés de notes', 'Report sheets'], desc: ['Photo de l’élève, QR code de vérification, signatures — deux relevés par feuille A4.', 'Pupil photo, verification QR code, signatures — two report sheets per A4 page.'] },
      { icon: '🏆', title: ['Palmarès & conseil de classe', 'Rankings & class council'], desc: ['Classements par classe, tableau d’honneur et procès-verbal du conseil de classe.', 'Class rankings, honour roll and class council minutes.'] },
      { icon: '📄', title: ['Épreuves converties en Word', 'Exam papers to Word'], desc: ['Le professeur photographie son sujet : l’IA le transcrit en document Word à l’en-tête de l’école.', 'The teacher photographs the paper: AI turns it into a Word document with the school header.'] },
    ],
  },
  {
    key: 'teaching',
    label: ['Pédagogie & LMS', 'Teaching & LMS'],
    items: [
      { icon: '📚', title: ['Cours & documents', 'Courses & documents'], desc: ['Les enseignants déposent cours et ressources ; élèves et parents y accèdent depuis leur espace.', 'Teachers upload courses and resources; pupils and parents open them from their space.'] },
      { icon: '🎯', title: ['Devoirs & quiz', 'Homework & quizzes'], desc: ['Devoirs avec date limite et quiz corrigés automatiquement.', 'Homework with deadlines and automatically marked quizzes.'] },
      { icon: '🗓️', title: ['Emploi du temps', 'Timetable'], desc: ['Emploi du temps de chaque classe et de chaque professeur.', 'Timetable for every class and every teacher.'] },
      { icon: '🧭', title: ['Feuille de route du programme', 'Syllabus roadmap'], desc: ['Chaque professeur suit l’avancement de son programme, matière par matière.', 'Each teacher tracks syllabus progress, subject by subject.'] },
      { icon: '⏱️', title: ['Absences, retards & conduite', 'Absences, lateness & conduct'], desc: ['Appel à chaque séance ; absences et retards reportés sur le bulletin.', 'Roll call every lesson; absences and lateness carried onto the report card.'] },
      { icon: '✨', title: ['Appréciations par IA', 'AI comments'], desc: ['Appréciations de bulletin rédigées en 1 clic à partir des notes de l’élève.', 'Report card comments written in 1 click from the pupil’s marks.'] },
      { icon: '🧒', title: ['Bulletin du primaire', 'Primary report card'], desc: ['Modèle dédié de la maternelle au CM2, avec la section anglais à part.', 'Dedicated template from nursery to the last primary year, with a separate English section.'] },
      { icon: '📢', title: ['Annonces', 'Announcements'], desc: ['Messages ciblés aux parents, enseignants ou élèves.', 'Targeted messages to parents, teachers or pupils.'] },
    ],
  },
  {
    key: 'records',
    label: ['Registres de l’école', 'School registers'],
    items: [
      { icon: '📋', title: ['Présences', 'Attendance'], desc: ['Appel quotidien par classe et suivi par élève.', 'Daily roll call per class and per pupil.'] },
      { icon: '👤', title: ['Personnel', 'Staff'], desc: ['Dossiers du personnel : diplômes, contrat, contacts.', 'Staff files: qualifications, contract, contacts.'] },
      { icon: '📅', title: ['Calendrier scolaire', 'School calendar'], desc: ['Vacances, examens, réunions et événements.', 'Holidays, exams, meetings and events.'] },
      { icon: '🚨', title: ['Discipline & incidents', 'Discipline & incidents'], desc: ['Avertissements, sanctions et signalements d’incidents.', 'Warnings, sanctions and incident reports.'] },
      { icon: '🏥', title: ['Infirmerie & santé', 'Health'], desc: ['Visites, accidents, vaccinations et évacuations.', 'Visits, accidents, vaccinations and evacuations.'] },
      { icon: '📖', title: ['Bibliothèque', 'Library'], desc: ['Prêts et retours de livres et de matériel.', 'Book and equipment loans and returns.'] },
      { icon: '🏷️', title: ['Inventaire', 'Inventory'], desc: ['Mobilier et équipements : état, valeur, emplacement.', 'Furniture and equipment: condition, value, location.'] },
      { icon: '🎓', title: ['Examens nationaux', 'National exams'], desc: ['Résultats CEPD, BEPC, BAC et taux de réussite.', 'CEPD, BEPC, BAC results and pass rates.'] },
      { icon: '🔄', title: ['Transferts', 'Transfers'], desc: ['Entrées et sorties d’élèves avec motif et justificatif.', 'Pupils joining and leaving, with reason and proof.'] },
      { icon: '🏫', title: ['Anciens élèves', 'Alumni'], desc: ['Base des diplômés et de leur parcours.', 'Graduates and where they went next.'] },
      { icon: '📁', title: ['Documents officiels', 'Official documents'], desc: ['Circulaires, contrats et rapports archivés.', 'Circulars, contracts and reports, archived.'] },
      { icon: '📤', title: ['Exports CSV', 'CSV exports'], desc: ['Effectifs, résultats de classe et frais, prêts pour l’inspection.', 'Enrolment, class results and fees, ready for inspectors.'] },
    ],
  },
  {
    key: 'finance',
    label: ['Finances', 'Finance'],
    items: [
      { icon: '💰', title: ['Frais & cotisations', 'Fees'], desc: ['Frais par classe et par période, suivi des impayés en temps réel.', 'Fees per class and period, unpaid balances tracked live.'] },
      { icon: '📱', title: ['Paiement Mobile Money', 'Mobile Money payment'], desc: ['Les parents paient en ligne ; l’argent va sur le compte de l’école.', 'Parents pay online; the money goes to the school’s account.'] },
      { icon: '🗂️', title: ['Plans de paiement', 'Payment plans'], desc: ['Échéanciers par tranche adaptés à chaque famille.', 'Instalment plans suited to each family.'] },
      { icon: '🧾', title: ['Reçus automatiques', 'Automatic receipts'], desc: ['Reçu PDF à chaque paiement, envoyé par WhatsApp, SMS et email.', 'A PDF receipt for every payment, sent by WhatsApp, SMS and email.'] },
      { icon: '🔔', title: ['Relances de frais', 'Fee reminders'], desc: ['Rappels automatiques aux parents en retard de paiement.', 'Automatic reminders to parents who are behind on payments.'] },
      { icon: '🔒', title: ['Bulletin bloqué si impayé', 'Report card held if unpaid'], desc: ['Le bulletin est libéré dès que les frais sont réglés.', 'The report card is released as soon as fees are paid.'] },
      { icon: '🛒', title: ['Achats de l’école', 'School purchases'], desc: ['Registre des achats : article, prix, date.', 'Purchase register: item, price, date.'] },
    ],
  },
  {
    key: 'spaces',
    label: ['Un espace pour chacun', 'A space for everyone'],
    items: [
      { icon: '🏫', title: ['Administration', 'School office'], desc: ['Tableau de bord, classes, élèves, bulletins, statistiques et paramètres de l’école.', 'Dashboard, classes, pupils, report cards, statistics and school settings.'] },
      { icon: '👨🏾‍🏫', title: ['Enseignants', 'Teachers'], desc: ['Fiches de notes sur téléphone, signature au stylet, appel, cours et devoirs.', 'Grade sheets on the phone, stylus signature, roll call, courses and homework.'] },
      { icon: '💼', title: ['Économe', 'Bursar'], desc: ['Encaissements, plans de paiement, impayés et bulletins retenus.', 'Payments received, payment plans, unpaid fees and held report cards.'] },
      { icon: '👨‍👩‍👧', title: ['Parents', 'Parents'], desc: ['Bulletins, absences, cours, paiements et notifications de chaque enfant.', 'Report cards, absences, courses, payments and notifications for each child.'] },
      { icon: '🎒', title: ['Élèves', 'Pupils'], desc: ['Bulletins, progression, cours et quiz en ligne.', 'Report cards, progress, courses and online quizzes.'] },
    ],
  },
  {
    key: 'platform',
    label: ['Et aussi', 'And more'],
    items: [
      { icon: '🎨', title: ['Aux couleurs de l’école', 'Your school’s branding'], desc: ['Logo, couleurs, cachet et signatures sur tous les documents.', 'Logo, colours, stamp and signatures on every document.'] },
      { icon: '🔍', title: ['Vérification par QR code', 'QR code verification'], desc: ['Chaque bulletin et relevé se vérifie en ligne : fini les faux.', 'Every report card and sheet can be checked online: no more forgeries.'] },
      { icon: '📥', title: ['Import Excel / CSV', 'Excel / CSV import'], desc: ['Élèves, classes et enseignants importés en quelques clics.', 'Pupils, classes and teachers imported in a few clicks.'] },
      { icon: '🗓️', title: ['Trimestres ou semestres', 'Terms or semesters'], desc: ['Système de périodes différent selon le cycle (primaire, collège, lycée).', 'A different period system per cycle (primary, middle, high school).'] },
      { icon: '📲', title: ['Application installable', 'Installable app'], desc: ['S’installe sur le téléphone et reste consultable même sans connexion.', 'Installs on the phone and stays readable even offline.'] },
      { icon: '🌍', title: ['Français & anglais', 'French & English'], desc: ['Toute l’application dans les deux langues, et connexion avec Google.', 'The whole app in both languages, plus sign-in with Google.'] },
    ],
  },
];
