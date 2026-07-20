const cheerio = require('cheerio');

/**
 * === PCSStageListProvider ===
 * Combine DEUX pages confirmées et vérifiées contre le vrai HTML :
 *   race/{slug}/{année}                         -> date, jour, type de
 *                                                   profil (icône pN),
 *                                                   nom, villes, distance
 *   race/{slug}/{année}/route/stage-profiles     -> dénivelé, ProfileScore,
 *                                                   image de profil
 *
 * ⚠️ Le type de profil texte (Flat/Hills.../Mountains...) n'existe NULLE
 * PART par étape sur la page stage-profiles elle-même — seulement dans
 * son filtre déroulant. Il est en réalité présent sur la page course,
 * encodé en icône CSS (classe "pN") — confirmé et vérifié ici. Le
 * mapping pN -> libellé est repris du filtre déjà vu sur l'autre page.
 *
 * ⚠️ PCS assigne un profil (pN) même aux étapes contre-la-montre — sans
 * conséquence : StageTypeMapper fait déjà primer le nom de l'étape
 * ("(TTT)"/"(ITT)") sur ce champ en cas d'incohérence, comportement déjà
 * testé.
 *
 * L'URL d'image de profil (pcsProfileUrl) est confirmée au caractère
 * près sur le vrai code source ("Voir le code source", pas une page
 * enregistrée localement) : chemin relatif du type
 * "images/profiles/ap/ae/tour-de-france-2026-stage-N-profile-....jpg",
 * absolutisé ici via le domaine PCS.
 */
const PCS_PROFILE_TYPE_MAP = {
  '1': 'Flat',
  '2': 'Hills, flat finish',
  '3': 'Hills, uphill finish',
  '5': 'Mountains, uphill finish'
};

class PCSStageListProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-CompetitionImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-stage-list';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async _fetchHtml(url) {
    const res = await this.fetchImpl(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`PCSStageListProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    return res.text();
  }

  async fetchStages(pcsRaceSlug, year) {
    const racePageHtml = await this._fetchHtml(`https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}`);
    const profilesHtml = await this._fetchHtml(`https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}/route/stage-profiles`);
    return this.mergeStageData(racePageHtml, profilesHtml, year);
  }

  /** Séparée pour être testable sur fixtures, sans réseau. */
  mergeStageData(racePageHtml, profilesHtml, year) {
    const stagesFromRacePage = this.parseStagesFromRacePage(racePageHtml, year);
    const profilesByStage = this.parseStageProfiles(profilesHtml);

    return stagesFromRacePage.map(stage => {
      const profile = profilesByStage[stage.stageNumber] || {};
      return {
        ...stage,
        elevationGainM: profile.elevationGainM != null ? profile.elevationGainM : null,
        profileScore: profile.profileScore != null ? profile.profileScore : null,
        pcsProfileUrl: profile.pcsProfileUrl || null
      };
    });
  }

  parseStagesFromRacePage(html, year) {
    const $ = cheerio.load(html);
    const stages = [];

    $('table.basic tbody tr').each((_, tr) => {
      const $tr = $(tr);
      const link = $tr.find('td a').first();
      const href = link.attr('href');
      if (!href) return; // jour de repos ou ligne de total, sans lien

      const stageMatch = href.match(/stage-(\d+)/);
      if (!stageMatch) return;
      const stageNumber = parseInt(stageMatch[1], 10);
      const name = link.text().trim();

      const tds = $tr.find('td');
      const dateRaw = $(tds[0]).text().trim(); // "04/07"
      const dateMatch = dateRaw.match(/^(\d{2})\/(\d{2})/);
      const date = dateMatch ? `${year}-${dateMatch[2]}-${dateMatch[1]}` : null;

      const iconClasses = ($tr.find('span.icon.profile').attr('class') || '').split(/\s+/);
      let pcsStageType = null;
      iconClasses.forEach(c => {
        const m = c.match(/^p(\d+)$/);
        if (m) pcsStageType = PCS_PROFILE_TYPE_MAP[m[1]] || null;
      });

      const distanceRaw = $(tds[tds.length - 1]).text().trim();
      const distanceKm = distanceRaw ? parseFloat(distanceRaw) : null;

      const cityPart = name.includes('|') ? name.split('|').slice(1).join('|').trim() : name;
      const cities = cityPart.split(' - ');
      const startCity = cities[0] ? cities[0].trim() : null;
      const finishCity = cities.length > 1 ? cities[cities.length - 1].trim() : startCity;

      stages.push({ stageNumber, name, date, startCity, finishCity, distanceKm, pcsStageType, pcsStageUrl: href });
    });

    return stages;
  }

  parseStageProfiles(html) {
    const $ = cheerio.load(html);
    const profiles = {};
    let current = {};

    $('ul.keyvalueList li').each((_, li) => {
      const $li = $(li);
      const titleEl = $li.find('.title');
      const label = titleEl.text().trim().replace(/:$/, '');

      if (!label) {
        // <li></li> vide = séparateur entre étapes, OU ligne image (title vide avec un espace)
        const img = $li.find('img');
        if (img.length && img.attr('src')) {
          const src = img.attr('src');
          current.pcsProfileUrl = /^https?:\/\//.test(src) ? src : `https://www.procyclingstats.com/${src}`;
        } else if (current.stageNumber) {
          profiles[current.stageNumber] = current;
          current = {};
        }
        return;
      }

      if (label === 'Stage') {
        const href = $li.find('a').attr('href');
        const m = href ? href.match(/stage-(\d+)/) : null;
        if (m) current.stageNumber = parseInt(m[1], 10);
      } else if (label === 'Vertical meters') {
        const txt = $li.find('.value').text().trim();
        current.elevationGainM = /^\d+$/.test(txt) ? parseInt(txt, 10) : null;
      } else if (label === 'ProfileScore') {
        const txt = $li.find('.value').text().trim();
        current.profileScore = /^\d+$/.test(txt) ? parseInt(txt, 10) : null;
      }
    });
    if (current.stageNumber) profiles[current.stageNumber] = current;

    return profiles;
  }
}

module.exports = { PCSStageListProvider };
