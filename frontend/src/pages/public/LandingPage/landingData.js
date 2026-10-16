// Textes et données communs aux pages d'accueil (classique et style Edustage).

export const SITE_URL = import.meta.env.VITE_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'https://novabulletin.app');
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? 'contact@novabulletin.app';
export const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP ?? '233244173068';

export const FEATURES_ROW1 = [
  { icon: '🧮', color: '#eff6ff', iconColor: '#1E2A78', title: 'Calcul automatique', desc: 'Moyennes, coefficients, rangs calculés instantanément. Zéro formule Excel, zéro erreur.' },
  { icon: '📄', color: '#fff3f0', iconColor: '#FF7A59', title: 'Bulletins PDF en 1 clic', desc: 'Bulletin professionnel avec logo, couleurs et cachet de votre école. Prêt à imprimer ou partager.' },
  { icon: '📱', color: '#eff6ff', iconColor: '#1E2A78', title: 'WhatsApp, SMS & Email', desc: 'Parents informés instantanément par WhatsApp, SMS et email — même sans smartphone. Bulletin, rappels de frais et reçus de paiement envoyés automatiquement.' },
];

export const FEATURES_ROW2 = [
  { icon: '📝', color: '#fff3f0', iconColor: '#FF7A59', title: 'Fiches de notes numériques', desc: 'Chaque enseignant dispose d\'une fiche numérique sur son téléphone. Saisie mobile, calcul auto et signature électronique. Zéro papier, zéro perte.' },
  { icon: '💰', color: '#eff6ff', iconColor: '#1E2A78', title: 'Frais scolaires', desc: 'Gestion intégrée des cotisations. Paiement Mobile Money en ligne versé directement sur le compte de l\'école. Blocage automatique des bulletins si frais impayés.' },
  { icon: '📊', color: '#fff3f0', iconColor: '#FF7A59', title: 'Analytics temps réel', desc: 'Taux de recouvrement, progression par classe, bulletins publiés vs en attente — en direct.' },
];

export const STEPS = [
  { num: '01', icon: '🏫', title: 'Inscrivez votre école', desc: 'Formulaire en 2 minutes. Accès immédiat, sans attente. Compte activé gratuitement — 30 jours d\'essai offerts.', tags: ['Nom école','Type','Niveau','Contact'] },
  { num: '02', icon: '⚙️', title: 'Configurez en 30 min', desc: 'Ajoutez classes, matières, enseignants, élèves. Import CSV disponible. Paramétrez le système de périodes par cycle.', tags: ['Classes','Matières','Coefficients','Import CSV'] },
  { num: '03', icon: '✏️', title: 'Saisie des notes', desc: 'Les professeurs saisissent les notes sur leur téléphone, même en mode paysage, puis signent leur fiche. Dès que toutes les fiches sont signées, les bulletins sont générés automatiquement.', tags: ['Devoir','Composition','Signature','Bulletins auto'] },
  { num: '04', icon: '🚀', title: 'Le titulaire publie', desc: 'Le professeur titulaire relit les bulletins de sa classe, ajoute l\'observation et la conduite, puis publie. Chaque parent est prévenu par WhatsApp, SMS et email. Blocage auto si frais impayés.', tags: ['Titulaire','PDF auto','WhatsApp & SMS','Blocage frais'] },
];

export const TEAM = [
  { name: 'Felix Atoma', role: 'Lead Developer', tags: ['Software Developer', "Professeur d'Anglais"], initials: 'FA', color: '#1E2A78', colorEnd: '#3b82f6', photo: '/team/felix.jpg', email: 'felixatoma2@gmail.com' },
  { name: 'Manzaman Abalossosso', role: 'Project Manager', tags: ['Professeur de Science', 'Data Scientist'], initials: 'AA', color: '#1E2A78', colorEnd: '#FF7A59', photo: '/team/manzaman.jpg', email: 'abalossossomanzaman@gmail.com' },
  { name: 'Benjamin Ngbabou', role: 'Software Developer', tags: ['Marketing', 'Professeur de Mathématiques'], initials: 'BN', color: '#FF7A59', colorEnd: '#1E2A78', photo: '/team/benjamin.jpg', email: 'bawiloussimngbabou1@gmail.com' },
];

export const FAQS = [
  { q: 'Est-ce que je dois payer pour essayer ?', a: 'Non. Vous bénéficiez d\'un essai gratuit de 30 jours avec accès complet à toutes les fonctionnalités. Aucun engagement, aucune carte bancaire requise. Si vous êtes satisfait à la fin des 30 jours, vous réglez les frais d\'inscription et votre premier trimestre ou semestre. Sinon, vous revenez à votre ancien système.' },
  { q: 'Que comprennent les frais d\'inscription ?', a: 'Les frais d\'inscription couvrent l\'entrée de votre école dans notre base : création du compte, configuration des classes, matières et coefficients, import de vos élèves et accompagnement au démarrage. Ils ne sont payés qu\'une seule fois, avec le premier abonnement : 20 000 FCFA pour une école de 50 à 199 élèves, 40 000 FCFA à partir de 200 élèves. Les écoles de moins de 50 élèves restent gratuites et ne paient rien.' },
  { q: 'Combien coûte NovaBulletin après l\'essai gratuit ?', a: 'Le tarif dépend de votre effectif. Moins de 50 élèves : gratuit, sans frais d\'inscription. De 50 à 199 élèves : 75 000 FCFA par trimestre ou 100 000 FCFA par semestre. 200 élèves et plus : 150 000 FCFA par trimestre ou 200 000 FCFA par semestre. S\'y ajoutent des frais d\'inscription uniques (20 000 ou 40 000 FCFA) au premier paiement. Paiement par TMoney, Flooz, carte ou virement.' },
  { q: 'Mon école est un complexe (primaire + collège + lycée). Est-ce compatible ?', a: 'Oui. NovaBulletin est conçu pour les établissements complexes multi-cycles. Vous pouvez configurer des systèmes de périodes différents par cycle : par exemple, trimestriel pour le primaire et le collège, et semestriel pour le lycée. Chaque bulletin est généré automatiquement avec le bon système de périodes selon le cycle de la classe.' },
  { q: 'Comment fonctionnent les fiches numériques des enseignants ?', a: 'Chaque enseignant a accès à sa propre fiche de notes numérique depuis son téléphone. Il saisit les notes (interrogations, devoirs, compositions), les moyennes se calculent automatiquement, et il signe la fiche avec sa signature manuscrite. Quand toutes les fiches de la classe sont signées, les bulletins sont générés automatiquement et le professeur titulaire les relit et les publie. Aucune retranscription manuelle, aucune perte de fiche papier.' },
  { q: 'NovaBulletin remplace-t-il tous les registres papier ?', a: 'Oui. NovaBulletin centralise 11 registres : présences, santé, bibliothèque, inventaire, anciens élèves, transferts, dossiers disciplinaires, examens nationaux, calendrier, documents officiels et profils du personnel. Chaque donnée est sécurisée, consultable instantanément et exportable en CSV.' },
  { q: 'Combien de temps faut-il pour configurer l\'école ?', a: 'Environ 30 minutes pour une école de taille moyenne. Vous pouvez importer vos élèves depuis un fichier Excel ou CSV en quelques clics. Notre équipe vous accompagne à chaque étape via WhatsApp.' },
  { q: 'Les enseignants doivent-ils être formés ?', a: 'L\'interface est conçue pour être intuitive sur mobile. La plupart des enseignants maîtrisent la plateforme en moins de 10 minutes. Nous fournissons un guide de démarrage rapide et un support WhatsApp dédié.' },
  { q: 'Que se passe-t-il si un parent n\'utilise pas WhatsApp ?', a: 'NovaBulletin prévient aussi le parent par SMS — sur n\'importe quel téléphone, même sans internet — et lui envoie le bulletin par email. Si le parent n\'a ni WhatsApp ni email, l\'admin peut imprimer le bulletin PDF directement depuis la plateforme, comme avant.' },
  { q: 'Les données de nos élèves sont-elles sécurisées ?', a: 'Oui. Toutes les données sont chiffrées et hébergées sur Supabase (infrastructure cloud de niveau bancaire). Chaque école n\'a accès qu\'à ses propres données. Conformité RGPD assurée.' },
  { q: 'Fonctionne-t-il sur tous les appareils ?', a: 'Oui. NovaBulletin est une application web qui fonctionne sur ordinateur, tablette et smartphone (Android et iOS). Aucune installation requise — ouvrez simplement votre navigateur.' },
];

export const FEATURES_ROW1_EN = [
  { icon: '🧮', color: '#eff6ff', iconColor: '#1E2A78', title: 'Automatic Calculation', desc: 'Averages, coefficients, rankings calculated instantly. Zero Excel formulas, zero errors.' },
  { icon: '📄', color: '#fff3f0', iconColor: '#FF7A59', title: 'PDF Reports in 1 click', desc: 'Professional report card with your school logo, colors and stamp. Ready to print or share.' },
  { icon: '📱', color: '#eff6ff', iconColor: '#1E2A78', title: 'WhatsApp, SMS & Email', desc: 'Parents notified instantly by WhatsApp, SMS and email — even without a smartphone. Report cards, fee reminders and payment receipts sent automatically.' },
];

export const FEATURES_ROW2_EN = [
  { icon: '📝', color: '#fff3f0', iconColor: '#FF7A59', title: 'Digital Grade Sheets', desc: 'Every teacher has a digital grade sheet on their phone. Mobile entry, auto-calculation and electronic signature. Zero paper, zero loss.' },
  { icon: '💰', color: '#eff6ff', iconColor: '#1E2A78', title: 'School Fees', desc: 'Integrated fee management. Online Mobile Money payment deposited directly into the school\'s own account. Automatic blocking of report cards if fees are unpaid.' },
  { icon: '📊', color: '#fff3f0', iconColor: '#FF7A59', title: 'Real-time Analytics', desc: 'Collection rates, class progress, published vs pending reports — live.' },
];

export const STEPS_EN = [
  { num: '01', icon: '🏫', title: 'Register your school', desc: '2-minute form. Immediate access, no waiting. Account activated for free — 30-day trial included.', tags: ['School name','Type','Level','Contact'] },
  { num: '02', icon: '⚙️', title: 'Set up in 30 min', desc: 'Add classes, subjects, teachers, students. CSV import available. Configure term system per cycle.', tags: ['Classes','Subjects','Coefficients','CSV Import'] },
  { num: '03', icon: '✏️', title: 'Grade entry', desc: 'Teachers enter grades on their phone, even in landscape mode, then sign their sheet. As soon as every sheet is signed, report cards are generated automatically.', tags: ['Test','Exam','Signature','Auto reports'] },
  { num: '04', icon: '🚀', title: 'The form teacher publishes', desc: 'The form teacher reviews the class report cards, adds the comment and conduct, then publishes. Every parent is notified by WhatsApp, SMS and email. Auto block if fees unpaid.', tags: ['Form teacher','Auto PDF','WhatsApp & SMS','Fee gate'] },
];

export const FAQS_EN = [
  { q: 'Do I have to pay to try it?', a: 'No. You get a free 30-day trial with full access to all features. No commitment, no credit card required. If you are satisfied after 30 days, you pay the onboarding fee and your first term or semester. If not, you go back to your old system.' },
  { q: 'What does the onboarding fee cover?', a: 'The onboarding fee covers bringing your school into our database: account creation, setting up classes, subjects and coefficients, importing your students and getting-started support. It is paid only once, with the first subscription: 20,000 FCFA for a school with 50 to 199 students, 40,000 FCFA from 200 students. Schools with fewer than 50 students stay free and pay nothing.' },
  { q: 'How much does NovaBulletin cost after the free trial?', a: 'Pricing depends on your enrolment. Fewer than 50 students: free, no onboarding fee. 50 to 199 students: 75,000 FCFA per term or 100,000 FCFA per semester. 200 students and more: 150,000 FCFA per term or 200,000 FCFA per semester. A one-time onboarding fee (20,000 or 40,000 FCFA) is added to the first payment. Payment via TMoney, Flooz, card or bank transfer.' },
  { q: 'My school is a complex (primary + middle + high school). Is it compatible?', a: 'Yes. NovaBulletin is built for multi-cycle complexes. You can configure different term systems per cycle — for example, trimester for primary and middle school, and semester for high school. Each report card is automatically generated with the correct term system for its cycle.' },
  { q: 'How do the teachers\' digital grade sheets work?', a: 'Each teacher accesses their own digital grade sheet from their phone. They enter grades (tests, homework, exams), averages calculate automatically, and they sign the sheet with their handwritten signature. Once every sheet in the class is signed, report cards are generated automatically and the form teacher reviews and publishes them. No manual re-entry, no lost paper sheets.' },
  { q: 'Does NovaBulletin replace all paper registers?', a: 'Yes. NovaBulletin centralizes 11 registers: attendance, health, library, inventory, alumni, transfers, disciplinary files, national exams, calendar, official documents and staff profiles. Every record is secured, instantly searchable and exportable to CSV.' },
  { q: 'How long does it take to set up the school?', a: 'About 30 minutes for a medium-sized school. You can import your students from an Excel or CSV file in a few clicks. Our team supports you at every step via WhatsApp.' },
  { q: 'Do teachers need training?', a: 'The interface is designed to be intuitive on mobile. Most teachers master the platform in under 10 minutes. We provide a quick-start guide and dedicated WhatsApp support.' },
  { q: 'What if a parent doesn\'t use WhatsApp?', a: 'NovaBulletin also notifies the parent by SMS — on any phone, even without internet — and sends the report card by email. If the parent has neither WhatsApp nor email, the admin can print the PDF report card directly from the platform, as before.' },
  { q: 'Is our students\' data secure?', a: 'Yes. All data is encrypted and hosted on Supabase (bank-level cloud infrastructure). Each school only has access to its own data. GDPR compliance ensured.' },
  { q: 'Does it work on all devices?', a: 'Yes. NovaBulletin is a web application that works on computers, tablets and smartphones (Android and iOS). No installation required — just open your browser.' },
];
