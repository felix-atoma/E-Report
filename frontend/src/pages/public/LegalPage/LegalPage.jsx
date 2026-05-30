import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import './LegalPage.css';

const LAST_UPDATED = '30 mai 2026';
const COMPANY = 'NovaBulletin';
const EMAIL = 'felixatoma2@gmail.com';
const SITE = 'https://e-report-frontend.vercel.app';

const TOS = () => (
  <>
    <h1>Conditions Générales d'Utilisation</h1>
    <p className="legal__meta">Dernière mise à jour : {LAST_UPDATED}</p>

    <h2>1. Objet</h2>
    <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme {COMPANY} disponible à l'adresse <a href={SITE}>{SITE}</a>, éditée par {COMPANY}.</p>

    <h2>2. Acceptation des conditions</h2>
    <p>En accédant à la plateforme et en créant un compte, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser la plateforme.</p>

    <h2>3. Description du service</h2>
    <p>{COMPANY} est une plateforme de gestion scolaire numérique permettant aux établissements scolaires de :</p>
    <ul>
      <li>Gérer les notes et bulletins scolaires</li>
      <li>Envoyer les bulletins aux parents par WhatsApp et email</li>
      <li>Gérer les frais scolaires et les paiements</li>
      <li>Administrer les classes, matières et emplois du temps</li>
    </ul>

    <h2>4. Accès au service</h2>
    <p>L'accès au service nécessite la création d'un compte par l'administrateur de l'établissement. L'établissement est responsable de la confidentialité des identifiants de connexion de ses utilisateurs.</p>

    <h2>5. Obligations des utilisateurs</h2>
    <p>Chaque utilisateur s'engage à :</p>
    <ul>
      <li>Fournir des informations exactes lors de l'inscription</li>
      <li>Ne pas partager ses identifiants de connexion</li>
      <li>Utiliser la plateforme conformément à sa destination</li>
      <li>Ne pas tenter d'accéder aux données d'autres établissements</li>
      <li>Respecter la vie privée des élèves et de leurs familles</li>
    </ul>

    <h2>6. Données des élèves</h2>
    <p>L'établissement scolaire est responsable des données personnelles des élèves qu'il saisit dans la plateforme. {COMPANY} agit en qualité de sous-traitant au sens du RGPD. L'établissement garantit avoir obtenu les autorisations nécessaires auprès des parents ou tuteurs légaux.</p>

    <h2>7. Tarification et paiement</h2>
    <p>L'utilisation de {COMPANY} est soumise à un abonnement dont le tarif est communiqué à l'établissement avant toute souscription. Le paiement est dû en fin de trimestre, uniquement si l'établissement est satisfait du service. En cas d'insatisfaction, l'établissement peut revenir à son ancien système sans frais.</p>

    <h2>8. Disponibilité du service</h2>
    <p>{COMPANY} s'engage à maintenir la plateforme disponible 24h/24 et 7j/7, sauf en cas de maintenance planifiée ou de force majeure. Des interruptions temporaires peuvent survenir sans que cela constitue un manquement contractuel.</p>

    <h2>9. Propriété intellectuelle</h2>
    <p>La plateforme {COMPANY}, son design, ses fonctionnalités et son code source sont la propriété exclusive de {COMPANY}. Toute reproduction, modification ou distribution sans autorisation écrite préalable est interdite.</p>

    <h2>10. Résiliation</h2>
    <p>Chaque partie peut résilier le contrat à tout moment avec un préavis de 30 jours. En cas de résiliation, les données de l'établissement sont conservées pendant 90 jours, puis supprimées définitivement.</p>

    <h2>11. Limitation de responsabilité</h2>
    <p>{COMPANY} ne peut être tenu responsable des dommages indirects, pertes de données résultant d'une mauvaise utilisation, ou interruptions dues à des tiers (hébergeur, opérateur télécom).</p>

    <h2>12. Droit applicable</h2>
    <p>Les présentes CGU sont régies par le droit togolais. Tout litige sera soumis aux tribunaux compétents de Lomé, Togo.</p>

    <h2>13. Contact</h2>
    <p>Pour toute question relative aux présentes CGU : <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
  </>
);

const PRIVACY = () => (
  <>
    <h1>Politique de Confidentialité</h1>
    <p className="legal__meta">Dernière mise à jour : {LAST_UPDATED}</p>

    <h2>1. Responsable du traitement</h2>
    <p>{COMPANY} est responsable du traitement de vos données personnelles. Contact : <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>

    <h2>2. Données collectées</h2>
    <p>Nous collectons les données suivantes :</p>
    <ul>
      <li><strong>Données de compte :</strong> nom, adresse email, rôle (administrateur, enseignant, parent, élève)</li>
      <li><strong>Données scolaires :</strong> notes, bulletins, absences, matières</li>
      <li><strong>Données financières :</strong> frais scolaires, statut de paiement</li>
      <li><strong>Données de contact :</strong> numéro de téléphone WhatsApp (parents)</li>
      <li><strong>Données de connexion :</strong> adresse IP, logs de session</li>
    </ul>

    <h2>3. Finalités du traitement</h2>
    <p>Vos données sont utilisées pour :</p>
    <ul>
      <li>Fournir et améliorer le service de gestion scolaire</li>
      <li>Envoyer les bulletins scolaires aux parents</li>
      <li>Gérer les frais et paiements scolaires</li>
      <li>Assurer la sécurité de la plateforme</li>
      <li>Vous contacter en cas de besoin technique</li>
    </ul>

    <h2>4. Base légale</h2>
    <p>Le traitement est fondé sur l'exécution du contrat de service entre l'établissement scolaire et {COMPANY}, ainsi que sur l'intérêt légitime de la gestion administrative scolaire.</p>

    <h2>5. Partage des données</h2>
    <p>Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec :</p>
    <ul>
      <li><strong>Supabase :</strong> hébergement de la base de données</li>
      <li><strong>SendGrid :</strong> envoi d'emails</li>
      <li><strong>Twilio / Meta WhatsApp :</strong> envoi de messages WhatsApp</li>
      <li><strong>Vercel / Render :</strong> hébergement de l'application</li>
    </ul>

    <h2>6. Conservation des données</h2>
    <p>Les données sont conservées pendant toute la durée de la relation contractuelle, puis 90 jours après la résiliation du compte, avant suppression définitive.</p>

    <h2>7. Sécurité</h2>
    <p>Nous appliquons des mesures de sécurité techniques et organisationnelles : chiffrement HTTPS, hachage des mots de passe (bcrypt), authentification JWT, accès restreint par rôle.</p>

    <h2>8. Droits des utilisateurs</h2>
    <p>Conformément au RGPD, vous disposez des droits suivants :</p>
    <ul>
      <li><strong>Accès :</strong> consulter vos données personnelles</li>
      <li><strong>Rectification :</strong> corriger des données inexactes</li>
      <li><strong>Effacement :</strong> demander la suppression de vos données</li>
      <li><strong>Portabilité :</strong> recevoir vos données dans un format lisible</li>
    </ul>
    <p>Pour exercer ces droits : <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>

    <h2>9. Cookies</h2>
    <p>{COMPANY} utilise uniquement des cookies fonctionnels (session, préférences de langue, thème). Aucun cookie publicitaire ou de tracking n'est utilisé.</p>

    <h2>10. Modifications</h2>
    <p>Cette politique peut être mise à jour. Toute modification substantielle sera notifiée par email aux administrateurs des établissements inscrits.</p>

    <h2>11. Contact DPO</h2>
    <p>Pour toute question relative à la protection de vos données : <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
  </>
);

export default function LegalPage() {
  const { type } = useParams();
  const isPrivacy = type === 'privacy';

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = isPrivacy
      ? 'Politique de Confidentialité — NovaBulletin'
      : "Conditions d'Utilisation — NovaBulletin";
  }, [isPrivacy]);

  return (
    <div className="legal-page">
      <header className="legal-page__header">
        <Link to="/login" className="legal-page__back">← Retour</Link>
        <div className="legal-page__nav">
          <Link to="/legal/tos" className={!isPrivacy ? 'active' : ''}>CGU</Link>
          <Link to="/legal/privacy" className={isPrivacy ? 'active' : ''}>Confidentialité</Link>
        </div>
      </header>
      <main className="legal-page__content">
        {isPrivacy ? <PRIVACY /> : <TOS />}
      </main>
      <footer className="legal-page__footer">
        <p>© {new Date().getFullYear()} NovaBulletin. Tous droits réservés.</p>
        <div>
          <Link to="/legal/tos">CGU</Link>
          <Link to="/legal/privacy">Confidentialité</Link>
        </div>
      </footer>
    </div>
  );
}
