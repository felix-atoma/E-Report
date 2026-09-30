/**
 * Régénère le PDF stocké de tous les bulletins publiés avec le modèle actuel.
 * À lancer après chaque changement du modèle de bulletin (report-card.hbs).
 *
 *   npm run bulletins:regenerate                       → toutes les écoles
 *   npm run bulletins:regenerate -- --institution=<id> → une seule école
 *   npm run bulletins:regenerate -- --missing          → seulement les bulletins sans PDF (reprise)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ReportsService } from '../src/modules/reports/reports.service';

async function main() {
  const institutionId = process.argv.find((a) => a.startsWith('--institution='))?.split('=')[1];
  const onlyMissing = process.argv.includes('--missing');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const reports = app.get(ReportsService);
    console.log(
      `Régénération des bulletins publiés${institutionId ? ` (école ${institutionId})` : ' (toutes les écoles)'}` +
      `${onlyMissing ? ', uniquement ceux sans PDF' : ''}…`,
    );

    const started = Date.now();
    const result = await reports.regeneratePublishedPdfs({
      institutionId,
      onlyMissing,
      onProgress: (done, total, failed) => {
        if (done === total || done % 25 === 0) {
          console.log(`  ${done}/${total}${failed ? ` — ${failed} échec(s)` : ''}`);
        }
      },
    });

    const secs = Math.round((Date.now() - started) / 1000);
    console.log(`Terminé en ${secs}s : ${result.regenerated}/${result.total} régénéré(s), ${result.failed} échec(s).`);
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

// Les tâches planifiées de l'application (cron, files d'attente) gardent le processus en vie
// même après app.close() : on quitte explicitement une fois le travail terminé.
main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
