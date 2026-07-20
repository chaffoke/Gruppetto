const cheerio = require('cheerio');

/**
 * === PCSClassificationProvider ===
 * Pages confirmées (URLs réelles) :
 *   race/{slug}/{année}/stage-{N}-gc         -> general
 *   race/{slug}/{année}/stage-{N}-points     -> points
 *   race/{slug}/{année}/stage-{N}-kom        -> mountain
 *   race/{slug}/{année}/stage-{N}-youth      -> youth
 *   race/{slug}/{année}/stage-{N}-teams-gc   -> teams
 *
 * Structure de table vérifiée contre le vrai HTML pour les classements
 * INDIVIDUELS (general/points/mountain/youth) — même gabarit que
 * PCSStageResultProvider (table.results, td.ridername, td.cu600 a[href]).
 *
 * Classement "teams" — structure CONFIRMÉE (data-code="teamline").
 *
 * ⚠️ CAUSE RÉELLE identifiée et corrigée le 20/07/2026 (étape 15, via
 * navigateur headless + logs enrichis) : ce n'est PAS un problème de
 * JS non exécuté ni de données non encore publiées par PCS. Les pages
 * -gc/-points/-kom/-youth/-teams-gc contiennent chacune ~14
 * `table.results` (la table de résultat d'étape, plusieurs filtres/vues
 * annexes, puis la vraie table cumulée/équipes). La table cumulée
 * (data-code="prev") était systématiquement en position 1, jamais 0 ;
 * la table équipes (data-code="teamline") en position 12. Prendre
 * `.first()` retombait donc toujours sur la table de résultat d'étape
 * (169 lignes), d'où le retour [] pour les 5 classements malgré des
 * données bien présentes et complètes côté PCS. Corrigé en cherchant
 * explicitement, parmi toutes les table.results, celle qui contient le
 * data-code attendu — plutôt que de supposer sa position.
 */
class PCSClassificationProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-ResultsImport/1.0 (usage personnel non commercial)', log = console.log } = {}) {
    this.name = 'pcs-classification';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
    this.log = log; // instrumentation diagnostique uniquement — n'affecte pas le comportement du parser
  }

  async fetchClassification(pcsRaceSlug, year, stageNumber, type) {
    const suffix = { general: 'gc', points: 'points', mountain: 'kom', youth: 'youth', teams: 'teams-gc' }[type];
    if (!suffix) throw new Error(`PCSClassificationProvider: type de classement inconnu "${type}"`);

    // Sélecteur d'attente précis, pas "table.results" générique — ce
    // dernier est déjà présent dès le chargement initial (table de
    // l'étape), avant même que le vrai tableau cumulé (prev/teamline)
    // n'ait fini de se charger. Confirmé en conditions réelles : un
    // run de 6,6s pour 5 pages est bien trop rapide pour de vraies
    // navigations Puppeteer avec attente utile.
    const waitForSelector = type === 'teams' ? 'th[data-code="teamline"]' : 'th[data-code="prev"]';

    const url = `https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}/stage-${stageNumber}-${suffix}`;
    const res = await this.fetchImpl(url, {
      waitForSelector,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`PCSClassificationProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    const html = await res.text();
    return type === 'teams' ? this.parseTeamsClassificationHtml(html) : this.parseClassificationHtml(html);
  }

  /** Séparée de fetchClassification() pour être testable sur une fixture, sans réseau. */
  /**
   * Le tableau récupéré n'est pas toujours le vrai classement cumulé —
   * il peut retomber sur le tableau de résultat d'étape de la même page
   * (colonnes "gc"/"pnt" au lieu de "prev"/"delta") si on prend la
   * mauvaise `table.results` (cf. commentaire d'en-tête de la classe).
   * Ce garde-fou vérifie la présence de data-code="prev" (uniquement sur
   * un vrai tableau de classement cumulé) et sélectionne explicitement
   * CETTE table-là parmi toutes les table.results de la page, avant de
   * parser.
   */
  parseClassificationHtml(html) {
    const $ = cheerio.load(html);
    const allResultsTables = $('table.results');

    // ⚠️ CORRECTIF (confirmé en conditions réelles le 20/07/2026) : les
    // pages -gc/-points/-kom/-youth contiennent PLUSIEURS table.results
    // (jusqu'à 14 sur une page d'étape du Tour), dont la table de résultat
    // d'étape elle-même, systématiquement en position 0. La vraie table
    // cumulée (data-code="prev") n'est PAS forcément la première -> on la
    // cherche explicitement au lieu de supposer qu'elle est .first().
    const table = allResultsTables.filter((_, t) => $(t).find('th[data-code="prev"]').length > 0).first();
    const isCumulativeTable = table.length > 0;

    // --- Diagnostic enrichi (ne change aucun comportement de retour) ---
    this.log(`[DIAG classement general] ${allResultsTables.length} table(s) "table.results" trouvée(s) sur la page, table cumulée ${isCumulativeTable ? 'trouvée' : 'ABSENTE'}`);

    if (!isCumulativeTable) {
      this.log(`[DIAG classement general] aucune table.results ne contient data-code="prev" -> aucun classement cumulé publié pour cette page.`);
      return [];
    }

    const entries = [];
    let rejectedRows = 0;
    const totalRows = table.find('tbody > tr').length;
    table.find('tbody > tr').each((_, row) => {
      const $row = $(row);
      const rankRaw = $row.find('> td').first().text().trim();
      if (!/^\d+$/.test(rankRaw)) { rejectedRows++; return; } // un classement n'a normalement pas de DNS/DNF listés

      const riderLink = $row.find('td.ridername a[href^="rider/"]').first();
      const pcsRiderSlug = riderLink.attr('href') ? riderLink.attr('href').replace('rider/', '') : null;
      if (!pcsRiderSlug) { rejectedRows++; return; }

      const teamLink = $row.find('td.cu600 a[href^="team/"]').first();
      const pcsTeamSlug = teamLink.attr('href') ? teamLink.attr('href').replace('team/', '') : null;

      const timeHidden = $row.find('td.time .hide').first().text().trim();
      const pntText = $row.find('td.pnt').first().text().trim();

      entries.push({
        rank: parseInt(rankRaw, 10),
        pcsRiderSlug,
        pcsTeamSlug,
        time: timeHidden || null,
        gap: null, // même remarque que PCSStageResultProvider : la valeur "hide" sert de repère unique, pas encore séparée gap/temps absolu de façon fiable pour un classement général
        points: pntText ? parseInt(pntText, 10) : null
      });
    });

    this.log(`[DIAG classement general] tbody trouvé : ${totalRows} <tr>, ${entries.length} ligne(s) reconnue(s) comme classement valide, ${rejectedRows} rejetée(s) (rang non numérique ou coureur non résolu)`);

    return entries;
  }

  /**
   * Séparée car la structure diffère réellement de parseClassificationHtml
   * (colonne teamline unique : drapeau + lien équipe, pas de coureur).
   */
  /**
   * Le vrai tableau équipe (data-code="teamline") coexiste avec ~13
   * autres table.results sur la page -teams-gc (cf. commentaire d'en-tête
   * de la classe). Ce garde-fou sélectionne explicitement la table qui
   * contient ce data-code, plutôt que .first() — sinon on retombe sur le
   * tableau de résultat d'étape individuel et on renvoie une liste vide
   * plutôt que d'extraire à tort une entrée par coureur (bug réel
   * constaté : 166 lignes au lieu de 23, riderId toujours null mais
   * teamId rempli pour chaque coureur).
   */
  parseTeamsClassificationHtml(html) {
    const $ = cheerio.load(html);
    const allResultsTables = $('table.results');

    // ⚠️ CORRECTIF (confirmé en conditions réelles le 20/07/2026) : même
    // défaut que parseClassificationHtml -- la page -teams-gc contient 14
    // table.results, la vraie table équipes (data-code="teamline") est en
    // position 12, jamais 0. On la cherche explicitement.
    const table = allResultsTables.filter((_, t) => $(t).find('th[data-code="teamline"]').length > 0).first();
    const isTeamsTable = table.length > 0;

    this.log(`[DIAG classement teams] ${allResultsTables.length} table(s) "table.results" trouvée(s) sur la page, table équipes ${isTeamsTable ? 'trouvée' : 'ABSENTE'}`);

    if (!isTeamsTable) {
      this.log(`[DIAG classement teams] aucune table.results ne contient data-code="teamline" -> classement équipes non publié pour cette page.`);
      return [];
    }

    const entries = [];
    let rejectedRows = 0;
    const totalRows = table.find('tbody > tr').length;
    table.find('tbody > tr').each((_, row) => {
      const $row = $(row);
      const tds = $row.find('> td');
      const rankRaw = tds.eq(0).text().trim();
      if (!/^\d+$/.test(rankRaw)) { rejectedRows++; return; }

      const teamLink = $row.find('a[href^="team/"]').first();
      const pcsTeamSlug = teamLink.attr('href') ? teamLink.attr('href').replace('team/', '') : null;
      if (!pcsTeamSlug) { rejectedRows++; return; }

      const timeHidden = $row.find('td.time .hide').first().text().trim();

      entries.push({
        rank: parseInt(rankRaw, 10),
        pcsRiderSlug: null, // classement par équipes : jamais de coureur individuel
        pcsTeamSlug,
        time: timeHidden || null,
        points: null
      });
    });

    this.log(`[DIAG classement teams] tbody trouvé : ${totalRows} <tr>, ${entries.length} ligne(s) reconnue(s) comme classement valide, ${rejectedRows} rejetée(s)`);

    return entries;
  }
}

module.exports = { PCSClassificationProvider };
