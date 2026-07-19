const cheerio = require('cheerio');

/**
 * === PCSStageResultProvider ===
 * Page confirmée et sélecteurs vérifiés contre le vrai HTML :
 * race/{slug}/{année}/stage-{N}/result/result (ou stage-{N} direct)
 *
 * ⚠️ Cette page contient PLUSIEURS tables `table.results` (résultat
 * d'étape, puis d'autres onglets pour les classements) — on cible
 * explicitement la PREMIÈRE, qui correspond au résultat d'étape.
 *
 * Statut confirmé : le premier <td> contient soit un rang numérique,
 * soit littéralement "DNS"/"DNF"/"DSQ"/"OTL"/"DF" (légende vue sur la
 * vraie page : "DNF = Did not finish", "DNS = Did not start", "OTL =
 * Outside time limit", "DF = Did finish, no result").
 *
 * Temps : la colonne "Time" contient un <font> d'affichage (parfois
 * ",," en raccourci visuel non exploitable) ET un <span class="hide">
 * toujours renseigné et fiable — on utilise exclusivement ce dernier.
 * Pour le rang 1 (vainqueur), cette valeur est le temps absolu ; pour
 * les autres, c'est un écart au vainqueur (interprétation retenue faute
 * d'un signal plus explicite sur la page).
 *
 * riderId/teamId Gruppetto NE SONT PAS résolus ici — ce provider produit
 * pcsRiderSlug/pcsTeamSlug bruts ; la résolution vers referenceData est
 * la responsabilité de l'orchestrateur (réutilise stableId.js).
 */
const PCS_STATUS_MAP = { DNS: 'dns', DNF: 'dnf', DSQ: 'dsq', OTL: 'otl', DF: 'df' };

class PCSStageResultProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-ResultsImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-stage-result';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchStageResult(pcsRaceSlug, year, stageNumber) {
    const url = `https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}/stage-${stageNumber}/result/result`;
    const res = await this.fetchImpl(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`PCSStageResultProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    const html = await res.text();
    return this.parseStageResultHtml(html);
  }

  /** Séparée de fetchStageResult() pour être testable sur une fixture, sans réseau. */
  parseStageResultHtml(html) {
    const $ = cheerio.load(html);
    const entries = [];

    $('table.results').first().find('tbody > tr').each((_, row) => {
      const $row = $(row);
      const rankRaw = $row.find('> td').first().text().trim();

      const riderLink = $row.find('td.ridername a[href^="rider/"]').first();
      const pcsRiderSlug = riderLink.attr('href') ? riderLink.attr('href').replace('rider/', '') : null;
      const surname = riderLink.find('.uppercase').text().trim();
      const firstName = riderLink.clone().find('.uppercase').remove().end().text().trim();

      const teamLink = $row.find('td.cu600 a[href^="team/"]').first();
      const pcsTeamSlug = teamLink.attr('href') ? teamLink.attr('href').replace('team/', '') : null;

      const bibText = $row.find('td.bibs').first().text().trim();
      const bib = bibText ? parseInt(bibText, 10) : null;

      const bonusText = $row.find('td.ar.cu600 font.blue').first().text().trim();
      const bonusSeconds = bonusText ? parseInt(bonusText.replace(/[^\d]/g, ''), 10) : null;

      const pntText = $row.find('td.pnt').first().text().trim();
      const points = pntText ? parseInt(pntText, 10) : null;

      const timeHidden = $row.find('td.time .hide').first().text().trim();

      let rank = null, pcsRawStatus = null;
      if (/^\d+$/.test(rankRaw)) {
        rank = parseInt(rankRaw, 10);
      } else if (rankRaw) {
        pcsRawStatus = rankRaw;
      }

      if (!pcsRiderSlug) return; // ligne sans coureur exploitable, ignorée

      entries.push({
        rank,
        bib,
        pcsRiderSlug,
        pcsTeamSlug,
        time: rank === 1 ? (timeHidden || null) : null,
        gap: rank !== 1 ? (timeHidden || null) : null,
        pcsRawStatus,
        bonusSeconds,
        points,
        surname, firstName // conservés pour diagnostic/repli nom, jamais utilisés comme clé principale
      });
    });

    return entries;
  }

  /**
   * Extrait la liste explicite des porteurs de maillots — confirmée
   * présente sur cette même page ("Jersey wearers during stage").
   * @returns {{ general: string|null, points: string|null, mountain: string|null, youth: string|null }}
   *   Chaque valeur est un pcsRiderSlug — pas encore résolu en riderId.
   */
  parseJerseyWearersHtml(html) {
    const $ = cheerio.load(html);
    const map = { General: 'general', Points: 'points', Mountains: 'mountain', Youth: 'youth' };
    const result = { general: null, points: null, mountain: null, youth: null };

    $('h4:contains("Jersey wearers")').next('ul.list').find('li').each((_, li) => {
      const $li = $(li);
      const label = $li.find('.fs11').first().text().trim();
      const key = map[label];
      if (!key) return;
      const href = $li.find('a[href^="rider/"]').first().attr('href');
      if (href) result[key] = href.replace('rider/', '');
    });

    return result;
  }
}

module.exports = { PCSStageResultProvider, PCS_STATUS_MAP };
