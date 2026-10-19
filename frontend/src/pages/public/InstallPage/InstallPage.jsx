import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import QRCode from 'qrcode';
import logoIcon from '../../../assets/images/novabulletin-tablet.svg';
import { usePwaInstall } from '../../../utils/pwaInstall';
import { ShareIcon } from '../../../components/common/PwaInstallPrompt/PwaInstallPrompt';
import './InstallPage.css';

/**
 * Page à partager (/installer) : installer NovaBulletin sur le téléphone ou l'ordinateur.
 * Bouton « Installer » quand le navigateur le permet, sinon la marche à suivre pour l'appareil,
 * et un QR code pour ouvrir la page sur un téléphone depuis un ordinateur.
 */
export default function InstallPage() {
  const { canPrompt, installed, ios, android, promptInstall } = usePwaInstall();
  const [qr, setQr] = useState('');
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/installer`;
  const [tab, setTab] = useState(ios ? 'ios' : android ? 'android' : 'pc');

  useEffect(() => {
    QRCode.toDataURL(link, { width: 220, margin: 1, color: { dark: '#002347', light: '#ffffff' } })
      .then(setQr).catch(() => {});
  }, [link]);

  const install = async () => {
    if ((await promptInstall()) === 'accepted') setDone(true);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  const share = () => navigator.share?.({ title: 'NovaBulletin', text: "Installez l'application NovaBulletin :", url: link }).catch(() => {});
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Installez l'application NovaBulletin : ${link}`)}`;

  return (
    <div className="inst">
      <Helmet><title>Installer l'application — NovaBulletin</title></Helmet>
      <div className="inst-card">
        <Link to="/home" className="inst-logo">
          <img src={logoIcon} alt="" width="30" height="46" />
          <span>NovaBulletin</span>
        </Link>
        <h1>Installer l'application</h1>
        <p className="inst-lead">
          Une icône NovaBulletin sur votre écran d'accueil : on l'ouvre d'un toucher, en plein écran,
          comme une application. Rien à télécharger sur un store, et elle se met à jour toute seule.
        </p>

        {installed || done ? (
          <div className="inst-ok">
            ✅ L'application est installée. Ouvrez-la depuis l'icône <b>NovaBulletin</b> de votre écran d'accueil.
            <Link to="/login" className="inst-btn">Se connecter</Link>
          </div>
        ) : canPrompt ? (
          <button type="button" className="inst-btn inst-btn--big" onClick={install}>⬇️ Installer NovaBulletin</button>
        ) : null}

        <div className="inst-tabs" role="tablist">
          {[['android', 'Android'], ['ios', 'iPhone / iPad'], ['pc', 'Ordinateur']].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k}
              className={tab === k ? 'is-active' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === 'android' && (
          <ol className="inst-steps">
            <li>Ouvrez ce lien dans <b>Chrome</b>.</li>
            <li>Touchez <b>Installer</b> ci-dessus, ou le menu <b>⋮</b> en haut à droite.</li>
            <li>Choisissez <b>« Installer l'application »</b> (ou « Ajouter à l'écran d'accueil »), puis confirmez.</li>
          </ol>
        )}
        {tab === 'ios' && (
          <ol className="inst-steps">
            <li>Ouvrez ce lien dans <b>Safari</b> (pas dans WhatsApp ni Facebook : touchez « Ouvrir dans Safari »).</li>
            <li>Touchez le bouton <b>Partager</b> <ShareIcon size={16} /> en bas de l'écran.</li>
            <li>Descendez et choisissez <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.</li>
          </ol>
        )}
        {tab === 'pc' && (
          <ol className="inst-steps">
            <li>Ouvrez ce lien dans <b>Chrome</b> ou <b>Edge</b>.</li>
            <li>Cliquez sur <b>Installer</b> ci-dessus, ou sur l'icône d'installation ⊕ au bout de la barre d'adresse.</li>
            <li>NovaBulletin s'ouvre alors dans sa propre fenêtre et apparaît dans le menu Démarrer.</li>
          </ol>
        )}

        <div className="inst-share">
          {qr && <img src={qr} alt="QR code vers la page d'installation" width="150" height="150" />}
          <div className="inst-share__text">
            <b>Partager à un collègue ou à un parent</b>
            <span>Scannez le QR code avec un téléphone, ou envoyez ce lien :</span>
            <code>{link}</code>
            <div className="inst-share__btns">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inst-btn inst-btn--wa">WhatsApp</a>
              <button type="button" className="inst-btn inst-btn--ghost" onClick={copy}>{copied ? 'Copié ✓' : 'Copier le lien'}</button>
              {typeof navigator.share === 'function' && (
                <button type="button" className="inst-btn inst-btn--ghost" onClick={share}>Partager…</button>
              )}
            </div>
          </div>
        </div>

        <Link to="/login" className="inst-back">← Aller à la connexion</Link>
      </div>
    </div>
  );
}
