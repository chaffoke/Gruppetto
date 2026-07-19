const fs = require('fs');
const path = require('path');
const { PCSStageResultProvider } = require('../providers/PCSStageResultProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/stage-result-sample.html'), 'utf-8');

describe('PCSStageResultProvider.parseStageResultHtml (sur fixture réelle)', () => {
  const provider = new PCSStageResultProvider();
  const entries = provider.parseStageResultHtml(fixtureHtml);

  test('récupère les 7 lignes de la fixture (4 classées + 3 DNS)', () => {
    expect(entries).toHaveLength(7);
  });

  test('le vainqueur a un temps absolu, un dossard, une bonification et des points corrects', () => {
    const winner = entries.find(e => e.pcsRiderSlug === 'mauro-schmid');
    expect(winner).toMatchObject({ rank: 1, bib: 118, pcsTeamSlug: 'team-jayco-alula-2026', time: '4:06:58', bonusSeconds: 10, points: 100 });
  });

  test('les coureurs suivants ont un écart (gap), pas de temps absolu', () => {
    const second = entries.find(e => e.pcsRiderSlug === 'harold-tejada');
    expect(second.gap).toBe('0:00');
    expect(second.time).toBeNull();
  });

  test('les coureurs DNS ont rank=null et pcsRawStatus="DNS"', () => {
    const dns = entries.filter(e => e.pcsRawStatus === 'DNS');
    expect(dns).toHaveLength(3);
    expect(dns.map(d => d.pcsRiderSlug).sort()).toEqual(['fernando-gaviria', 'frits-biesterbos', 'jenno-berckmoes'].sort());
    dns.forEach(d => expect(d.rank).toBeNull());
  });

  test('bonification absente -> null, pas une exception (rang 4)', () => {
    const fourth = entries.find(e => e.pcsRiderSlug === 'maxim-van-gils');
    expect(fourth.bonusSeconds).toBeNull();
  });
});

describe('PCSStageResultProvider.parseJerseyWearersHtml (sur fixture réelle)', () => {
  const provider = new PCSStageResultProvider();
  const jerseys = provider.parseJerseyWearersHtml(fixtureHtml);

  test('extrait les 4 porteurs de maillots', () => {
    expect(jerseys).toEqual({
      general: 'tadej-pogacar',
      points: 'mads-pedersen',
      mountain: 'jonas-vingegaard', // le porteur réel, distinct du leader du classement
      youth: 'juan-ayuso-pesquera'
    });
  });
});
