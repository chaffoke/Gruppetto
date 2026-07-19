const cheerio = require('cheerio');

/**
 * === PCSStageTimeProvider ===
 * Page confirmée et sélecteurs vérifiés contre le vrai HTML :
 * race/{slug}/{année}/stage-{N}/info/time-table
 *
 * Structure confirmée :
 * <table class=" basic">...<tbody>
 *   <tr><td>0</td><td>Start</td><td>13:20</td><td>13:20</td><td>13:20</td></tr>
 *   ...
 *   <tr><td>206</td><td>Finish</td><td>18:45</td>...</tr>
 * </tbody></table>
 * La ligne "Start" a la MÊME heure sur les 3 colonnes de vitesse — signature
 * d'une heure fixe (confirmée), contrairement aux points intermédiaires.
 *
 * ⚠️ Fuseau horaire NON confirmé formellement — traité ici comme heure
 * locale telle qu'affichée par PCS, sans décalage explicite. À vérifier
 * si des écarts sont constatés en production.
 *
 * ⚠️ stageDate est requis en paramètre : cette page ne donne que l'heure
 * ("13:20"), jamais la date. La date doit venir de PCSStageListProvider
 * (déjà responsable de la date par étape) — ce provider reste
 * volontairement indépendant, il ne la déduit jamais lui-même.
 */
class PCSStageTimeProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-CompetitionImport/1.0 (usage personnel non commercial)', delayMs = 500 } = {}) {
    this.name = 'pcs-stage-time';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
    this.delayMs = delayMs;
  }

  async fetchStartTime(pcsRaceSlug, year, stageNumber, stageDate) {
    const url = `https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}/stage-${stageNumber}/info/time-table`;
    const res = await this.fetchImpl(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`PCSStageTimeProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    const html = await res.text();
    return this.parseTimeTableHtml(html, stageDate);
  }

  /** Séparée de fetchStartTime() pour être testable sur une fixture, sans réseau. */
  parseTimeTableHtml(html, stageDate) {
    const $ = cheerio.load(html);
    let startTimeRaw = null;

    $('table.basic tbody tr').each((_, row) => {
      const cells = $(row).find('td').map((__, td) => $(td).text().trim()).get();
      if (cells[1] === 'Start' && cells[2]) {
        startTimeRaw = cells[2];
        return false; // trouvé, on arrête
      }
    });

    if (!startTimeRaw) return { officialStartTime: null };
    if (!stageDate) return { officialStartTime: null }; // pas de date connue, impossible de construire une heure complète

    return { officialStartTime: `${stageDate}T${startTimeRaw}:00` };
  }
}

module.exports = { PCSStageTimeProvider };
