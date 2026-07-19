const fs = require('fs');
const path = require('path');
const { PCSTeamJerseyProvider } = require('../providers/PCSTeamJerseyProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/startlist-sample.html'), 'utf-8');

describe('PCSTeamJerseyProvider.parseTeamJerseysHtml (sur fixture réelle)', () => {
  const provider = new PCSTeamJerseyProvider();
  const entries = provider.parseTeamJerseysHtml(fixtureHtml);

  test('récupère les 4 équipes de la fixture avec leur maillot (URL + slug)', () => {
    expect(entries).toHaveLength(4);
    const uae = entries.find(e => e.pcsTeamSlug === 'uae-team-emirates-xrg-2026');
    expect(uae).toEqual({
      pcsTeamSlug: 'uae-team-emirates-xrg-2026',
      name: 'UAE Team Emirates - XRG (WT)',
      pcsJerseyUrl: 'https://www.procyclingstats.com/images/shirts/bx/eb/uae-team-emirates-xrg-2026-n2.png',
      pcsJerseySlug: 'uae-team-emirates-xrg-2026-n2'
    });
  });

  test('le slug est bien le nom de fichier sans extension, y compris pour une URL sans suffixe -nN', () => {
    const soudal = entries.find(e => e.pcsTeamSlug === 'soudal-quick-step-2026');
    expect(soudal.pcsJerseySlug).toBe('soudal-quick-step-2026');
  });

  test('page sans équipe -> tableau vide, pas d\'exception', () => {
    expect(provider.parseTeamJerseysHtml('<html><body></body></html>')).toEqual([]);
  });
});
