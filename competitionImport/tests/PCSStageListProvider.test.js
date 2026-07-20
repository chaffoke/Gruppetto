const fs = require('fs');
const path = require('path');
const { PCSStageListProvider } = require('../providers/PCSStageListProvider');

const racePageHtml = fs.readFileSync(path.join(__dirname, 'fixtures/race-page-sample.html'), 'utf-8');
const profilesHtml = fs.readFileSync(path.join(__dirname, 'fixtures/stage-profiles-sample.html'), 'utf-8');

describe('PCSStageListProvider.parseStagesFromRacePage (sur fixture réelle)', () => {
  const provider = new PCSStageListProvider();
  const stages = provider.parseStagesFromRacePage(racePageHtml, 2026);

  test('récupère les 21 vraies étapes, exclut jours de repos et ligne de total', () => {
    expect(stages).toHaveLength(21);
  });

  test('étape 1 (TTT) correctement extraite', () => {
    expect(stages[0]).toMatchObject({
      stageNumber: 1, date: '2026-07-04', startCity: 'Barcelona', finishCity: 'Barcelona', distanceKm: 19.6
    });
  });

  test('villes différentes correctement séparées', () => {
    const stage3 = stages.find(s => s.stageNumber === 3);
    expect(stage3.startCity).toBe('Granollers');
    expect(stage3.finishCity).toBe('Les Angles');
  });

  test('type de profil PCS extrait de l\'icône (pN), même pour une étape chrono', () => {
    // Confirmé sur la vraie page : PCS assigne un profil même aux étapes
    // contre-la-montre — StageTypeMapper gère déjà cette incohérence.
    expect(stages[0].pcsStageType).toBe('Hills, uphill finish');
    const stage3 = stages.find(s => s.stageNumber === 3);
    expect(stage3.pcsStageType).toBe('Mountains, uphill finish');
  });
});

describe('PCSStageListProvider.parseStageProfiles (sur fixture réelle)', () => {
  const provider = new PCSStageListProvider();
  const profiles = provider.parseStageProfiles(profilesHtml);

  test('extrait dénivelé et score pour les 3 étapes de la fixture', () => {
    expect(profiles[1]).toMatchObject({ elevationGainM: 167, profileScore: 16 });
    expect(profiles[2]).toMatchObject({ elevationGainM: 2049, profileScore: 137 });
  });

  test('URL d\'image confirmée au caractère près (vrai code source)', () => {
    expect(profiles[1].pcsProfileUrl).toBe('https://www.procyclingstats.com/images/profiles/ap/ae/tour-de-france-2026-stage-1-profile-4a23bab936fefac3f3f4.jpg');
  });
});

describe('PCSStageListProvider.mergeStageData (fusion complète, deux fixtures réelles)', () => {
  const provider = new PCSStageListProvider();
  const merged = provider.mergeStageData(racePageHtml, profilesHtml, 2026);

  test('21 étapes au total après fusion', () => {
    expect(merged).toHaveLength(21);
  });

  test('étape avec profil disponible -> toutes les données présentes', () => {
    const stage1 = merged.find(s => s.stageNumber === 1);
    expect(stage1.elevationGainM).toBe(167);
    expect(stage1.profileScore).toBe(16);
    expect(stage1.pcsProfileUrl).not.toBeNull();
  });

  test('étape SANS profil dans la fixture (partielle) -> repli propre sur null, jamais d\'exception', () => {
    const stage21 = merged.find(s => s.stageNumber === 21);
    expect(stage21.elevationGainM).toBeNull();
    expect(stage21.profileScore).toBeNull();
    expect(stage21.pcsProfileUrl).toBeNull();
    // Les données de la page course restent, elles, intactes
    expect(stage21.startCity).toBe('Thoiry');
    expect(stage21.finishCity).toBe('Paris');
  });
});
