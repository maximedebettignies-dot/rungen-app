/**
 * PDF des autorisations parentales : une page par code.
 * Le nom de l'élève est écrit à la main sur le papier et ne rentre jamais
 * dans l'app (spec, parcours RUNGEN).
 */

export function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type EnTeteAutorisation = {
  etablissement: string;
  classe: string | null;
};

/** Construit le HTML transmis à `expo-print`. Une page par code. */
export function htmlAutorisations(codes: string[], entete: EnTeteAutorisation): string {
  const etablissement = echapperHtml(entete.etablissement);
  const classe = entete.classe ? echapperHtml(entete.classe) : null;

  const pages = codes
    .map(
      (code, index) => `
    <section class="page${index === codes.length - 1 ? ' derniere' : ''}">
      <h1>Autorisation parentale — RUNGEN</h1>
      <p class="etab">${etablissement}${classe ? ` · classe ${classe}` : ''}</p>

      <p>
        L'association RUNGEN (loi 1901) propose aux élèves une application de suivi sportif,
        gratuite et sans publicité. L'espace RUNGEN est séparé de l'espace public :
        <strong>aucun utilisateur du grand public ne peut voir le compte de votre enfant</strong>.
      </p>
      <ul>
        <li>Données conservées : pseudo, date de naissance, sports pratiqués et activités saisies.</li>
        <li>Le profil d'un mineur est privé : il n'apparaît dans aucune recherche.</li>
        <li>La date de naissance n'est visible que de votre enfant.</li>
        <li>Aucune donnée de santé (poids, fréquence cardiaque) n'est collectée.</li>
        <li>Le compte peut être supprimé à tout moment, par votre enfant ou sur votre demande.</li>
      </ul>

      <p class="mention">
        Je soussigné(e) ………………………………………………………, responsable légal(e) de
        l'élève ………………………………………………………, autorise la création d'un compte RUNGEN.
      </p>
      <p class="mention">Date : ……………………… Signature :</p>
      <div class="signature"></div>

      <div class="code">
        <p class="code-label">Code personnel à saisir dans l'application</p>
        <p class="code-valeur">${echapperHtml(code)}</p>
        <p class="code-aide">
          Ce code ne fonctionne qu'une fois, et seulement après le retour de cette autorisation signée.
        </p>
      </div>
    </section>`,
    )
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 18mm; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; font-size: 12pt; }
  .page { page-break-after: always; }
  .page.derniere { page-break-after: auto; }
  h1 { font-size: 17pt; margin: 0 0 2mm; }
  .etab { color: #444; margin: 0 0 6mm; font-size: 11pt; }
  ul { padding-left: 6mm; }
  li { margin-bottom: 1.5mm; }
  .mention { margin-top: 5mm; line-height: 1.8; }
  .signature { height: 22mm; border-bottom: 1px solid #999; margin-bottom: 6mm; }
  .code { border: 2px solid #208AEF; border-radius: 3mm; padding: 5mm; text-align: center; }
  .code-label { margin: 0 0 2mm; font-size: 10pt; color: #444; text-transform: uppercase; }
  .code-valeur { margin: 0; font-family: "Courier New", monospace; font-size: 24pt; letter-spacing: 3pt; font-weight: bold; }
  .code-aide { margin: 3mm 0 0; font-size: 9pt; color: #666; }
</style>
</head>
<body>${pages}</body>
</html>`;
}
