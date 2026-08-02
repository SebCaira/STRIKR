Promise.all([
  fetch('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Real%20Madrid&language=en&format=json&origin=*&type=item&limit=1').then(r=>r.json()),
  fetch('https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=Q8682&format=json&origin=*').then(r=>r.json())
]).then(([search, claims]) => {
  console.log('SEARCH RESULT:', JSON.stringify(search.search && search.search[0]));
  console.log('HAS P154 ON Q8682:', !!(claims.claims && claims.claims.P154));
  console.log('ALL PROPS ON Q8682:', Object.keys(claims.claims || {}).slice(0, 20).join(', '));
});
