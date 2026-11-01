/* global __APP_BUILD__ */
// Bannière de la console du navigateur : nom de l'application, mise en garde contre le « self-XSS »
// (quelqu'un demande de coller du code ici pour prendre le compte) et version déployée pour le débogage.
export function printConsoleBanner() {
  const build = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : { commit: 'dev', date: '' };
  const date = build.date ? new Date(build.date).toLocaleString('fr-FR') : '';

  console.log(
    '%cNovaBulletin%c  Gestion scolaire numérique',
    'font: 800 28px Poppins, Arial, sans-serif; color: #002347; text-shadow: 2px 2px 0 #fbbf24;',
    'font: 600 13px Arial, sans-serif; color: #6b7280;',
  );
  console.log(
    '%c⚠️ Attention !%c\nNe collez ici aucun code ou texte que quelqu\'un vous a envoyé : cela peut lui donner '
      + 'accès à votre compte, à vos notes et à celles de vos élèves. NovaBulletin ne vous le demandera jamais.\n'
      + 'Do not paste anything here that someone sent you: it can give them access to your account.',
    'font: 800 20px Arial, sans-serif; color: #dc2626;',
    'font: 14px Arial, sans-serif; color: #111827;',
  );
  console.log(
    `%cVersion ${build.commit}${date ? ` · ${date}` : ''} · API ${import.meta.env.VITE_API_URL ?? '—'}`,
    'font: 11px monospace; color: #6b7280;',
  );
}
