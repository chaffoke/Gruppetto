const fs = require('fs');
const path = require('path');
const { PCSTeamJerseyProvider } = require('../providers/PCSTeamJerseyProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/startlist-sample.html'), 'utf-8');

describe('PCSTeamJerseyProvider.parseTeamJerseysHtml (sur fixture réelle)', () => {
  const provider = new PCSTeamJerseyProvider();
  const entries = provider.parseTeamJerseysHtml(fixtureHtml);

  test('récupère les 4 équipes de la fixture avec leur maillot', () => {
    expect(entries).toHaveLength(4);
    const uae = entries.find(e => e.pcsTeamSlug === 'uae-team-emirates-xrg-2026');
    expect(uae).toEqual({
      pcsTeamSlug: 'uae-team-emirates-xrg-2026',
      name: 'UAE Team Emirates - XRG (WT)',
      pcsJerseyUrl: 'https://www.procyclingstats.com/images/shirts/bx/eb/uae-team-emirates-xrg-2026-n2.png'
    });
  });

  test('page sans équipe -> tableau vide, pas d\'exception', () => {
    expect(provider.parseTeamJerseysHtml('<html><body></body></html>')).toEqual([]);
  });
});
