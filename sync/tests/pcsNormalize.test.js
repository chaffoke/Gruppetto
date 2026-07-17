const { splitPcsName, extractStatus } = require('../providers/pcsNormalize');

describe('splitPcsName', () => {
  test('surnom à un seul mot', () => {
    expect(splitPcsName('POGAČAR Tadej')).toEqual({ lastName: 'POGAČAR', firstName: 'Tadej' });
  });

  test('surnom à plusieurs mots', () => {
    expect(splitPcsName('VAN DER POEL Mathieu')).toEqual({ lastName: 'VAN DER POEL', firstName: 'Mathieu' });
    expect(splitPcsName('DEL TORO Isaac')).toEqual({ lastName: 'DEL TORO', firstName: 'Isaac' });
    expect(splitPcsName('VAN ASBROECK Tom')).toEqual({ lastName: 'VAN ASBROECK', firstName: 'Tom' });
  });

  test('prénom composé', () => {
    expect(splitPcsName('JOHANNESSEN Tobias Halland')).toEqual({ lastName: 'JOHANNESSEN', firstName: 'Tobias Halland' });
  });

  test('un seul mot au total', () => {
    expect(splitPcsName('MARTIN')).toEqual({ lastName: 'MARTIN', firstName: null });
  });

  test('chaîne vide', () => {
    expect(splitPcsName('')).toEqual({ lastName: '', firstName: null });
  });
});

describe('extractStatus', () => {
  test('DNF avec étape', () => {
    expect(extractStatus("96 VAN LERBERGHE Bert (DNF #6)")).toEqual({ status: 'dnf', sinceStage: 6 });
  });

  test('DNS avec étape', () => {
    expect(extractStatus("127 TRÆEN Torstein (DNS #7)")).toEqual({ status: 'dns', sinceStage: 7 });
  });

  test('OTL mappé sur dnf', () => {
    expect(extractStatus("116 O'BRIEN Kelland (OTL #4)")).toEqual({ status: 'dnf', sinceStage: 4 });
  });

  test('DSQ avec étape', () => {
    expect(extractStatus("42 EXEMPLE Rider (DSQ #12)")).toEqual({ status: 'dsq', sinceStage: 12 });
  });

  test('aucune mention -> actif', () => {
    expect(extractStatus("1 POGAČAR Tadej")).toEqual({ status: 'active', sinceStage: null });
  });
});
