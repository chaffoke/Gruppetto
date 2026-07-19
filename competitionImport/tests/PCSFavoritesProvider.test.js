const fs = require('fs');
const path = require('path');
const { PCSFavoritesProvider } = require('../providers/PCSFavoritesProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/top-competitors-sample.html'), 'utf-8');

describe('PCSFavoritesProvider.parseFavoritesHtml (sur fixture réelle)', () => {
  const provider = new PCSFavoritesProvider();
  const entries = provider.parseFavoritesHtml(fixtureHtml);

  test('récupère les 10 favoris dans l\'ordre', () => {
    expect(entries).toHaveLength(10);
    expect(entries[0]).toEqual({ rank: 1, pcsRiderSlug: 'tadej-pogacar', name: 'POGAČAR Tadej', nationalityCode: 'SI' });
    expect(entries[9]).toEqual({ rank: 10, pcsRiderSlug: 'mathieu-van-der-poel', name: 'VAN DER POEL Mathieu', nationalityCode: 'NL' });
  });

  test('page sans section "Top competitors" -> tableau vide, pas d\'exception', () => {
    const empty = provider.parseFavoritesHtml('<html><body>rien ici</body></html>');
    expect(empty).toEqual([]);
  });
});
