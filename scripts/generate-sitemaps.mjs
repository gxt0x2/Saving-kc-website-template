import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://savingkc.com';
const TODAY = new Date().toISOString().split('T')[0];

function xmlUrl(loc, priority = '0.8', changefreq = 'monthly') {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function wrapUrlset(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

// Parse county data from TS files
function parseCounty(filename) {
  const content = fs.readFileSync(path.join('src/data/counties', filename), 'utf-8');
  const stateMatch = content.match(/state:\s*'(mo|ks)'/);
  const state = stateMatch[1];
  const slugMatch = content.match(/^\s+slug:\s*'([^']+)'/m);
  const countySlug = slugMatch[1];

  // Extract city blocks by splitting on the city-level pattern
  const cities = [];
  // Find all city entries: they have slug, state, county, countySlug in sequence
  const cityStartRegex = /\{\s*\n\s*name:\s*['"]([^'"]+)['"],\s*\n\s*slug:\s*'([^']+)',\s*\n\s*state:\s*'(?:mo|ks)',\s*\n\s*county:/g;
  const cityStarts = [];
  let cm;
  while ((cm = cityStartRegex.exec(content)) !== null) {
    cityStarts.push({ name: cm[1], slug: cm[2], index: cm.index });
  }

  for (let i = 0; i < cityStarts.length; i++) {
    const start = cityStarts[i].index;
    const end = i + 1 < cityStarts.length ? cityStarts[i + 1].index : content.length;
    const cityBlock = content.substring(start, end);

    // Find all neighborhood slugs within the neighborhoods array in this city block
    const neighborhoods = [];
    const nhStart = cityBlock.indexOf('neighborhoods:');
    if (nhStart >= 0) {
      const nhSection = cityBlock.substring(nhStart);
      // Find all slug values in the neighborhoods section
      const nhSlugRegex = /slug:\s*'([^']+)'/g;
      let nhMatch;
      while ((nhMatch = nhSlugRegex.exec(nhSection)) !== null) {
        neighborhoods.push(nhMatch[1]);
      }
    }

    cities.push({ name: cityStarts[i].name, slug: cityStarts[i].slug, neighborhoods });
  }

  return { state, slug: countySlug, cities };
}

// Parse all counties
const jackson = parseCounty('jackson.ts');
const clay = parseCounty('clay.ts');
const platte = parseCounty('platte.ts');
const wyandotte = parseCounty('wyandotte.ts');
const johnson = parseCounty('johnson.ts');

// Generate URLs for a county
function countyUrls(county) {
  const urls = [];
  urls.push(xmlUrl(`${DOMAIN}/${county.state}/${county.slug}/`, '0.9'));
  for (const city of county.cities) {
    urls.push(xmlUrl(`${DOMAIN}/${county.state}/${county.slug}/${city.slug}/`, '0.8'));
    for (const nh of city.neighborhoods) {
      urls.push(xmlUrl(`${DOMAIN}/${county.state}/${county.slug}/${city.slug}/${nh}/`, '0.7'));
    }
  }
  return urls;
}

// 1. sitemap-mo-jackson.xml
const jacksonUrls = countyUrls(jackson);
fs.writeFileSync('public/sitemap-mo-jackson.xml', wrapUrlset(jacksonUrls));
console.log(`sitemap-mo-jackson.xml: ${jacksonUrls.length} URLs`);

// 2. sitemap-mo-clay-platte.xml
const clayPlatteUrls = [...countyUrls(clay), ...countyUrls(platte)];
fs.writeFileSync('public/sitemap-mo-clay-platte.xml', wrapUrlset(clayPlatteUrls));
console.log(`sitemap-mo-clay-platte.xml: ${clayPlatteUrls.length} URLs`);

// 3. sitemap-ks-johnson-wyandotte.xml
const ksUrls = [...countyUrls(wyandotte), ...countyUrls(johnson)];
fs.writeFileSync('public/sitemap-ks-johnson-wyandotte.xml', wrapUrlset(ksUrls));
console.log(`sitemap-ks-johnson-wyandotte.xml: ${ksUrls.length} URLs`);

// 4. sitemap-situations.xml
const situationSlugs = [
  'foundation-issues', 'fire-damage', 'water-damage', 'mold',
  'hoarder-house', 'inherited-property', 'divorce', 'behind-on-payments',
  'pre-foreclosure', 'vacant-property', 'bad-tenants', 'code-violations',
];
const situationUrls = [
  xmlUrl(`${DOMAIN}/situations/`, '0.8'),
  ...situationSlugs.map(s => xmlUrl(`${DOMAIN}/situations/${s}/`, '0.7')),
  xmlUrl(`${DOMAIN}/probate/`, '0.8'),
  xmlUrl(`${DOMAIN}/tax-delinquent/`, '0.8'),
  xmlUrl(`${DOMAIN}/tax-delinquent/redemption/jackson-county/`, '0.7'),
  xmlUrl(`${DOMAIN}/tax-delinquent/payment-plans/jackson-county/`, '0.7'),
  xmlUrl(`${DOMAIN}/tax-delinquent/payment-plans/johnson-county/`, '0.7'),
];
fs.writeFileSync('public/sitemap-situations.xml', wrapUrlset(situationUrls));
console.log(`sitemap-situations.xml: ${situationUrls.length} URLs`);

// 5. sitemap-core.xml
const coreUrls = [
  xmlUrl(`${DOMAIN}/`, '1.0', 'weekly'),
  xmlUrl(`${DOMAIN}/about-us/`, '0.6'),
  xmlUrl(`${DOMAIN}/how-it-works/`, '0.7'),
  xmlUrl(`${DOMAIN}/reviews/`, '0.6'),
  xmlUrl(`${DOMAIN}/faq/`, '0.6'),
  xmlUrl(`${DOMAIN}/contact/`, '0.6'),
  xmlUrl(`${DOMAIN}/get-offer/`, '0.8'),
  xmlUrl(`${DOMAIN}/case-studies/`, '0.5'),
  xmlUrl(`${DOMAIN}/mo/`, '0.9'),
  xmlUrl(`${DOMAIN}/ks/`, '0.9'),
  xmlUrl(`${DOMAIN}/sitemap/`, '0.3'),
  xmlUrl(`${DOMAIN}/privacy/`, '0.2'),
  xmlUrl(`${DOMAIN}/terms/`, '0.2'),
];
fs.writeFileSync('public/sitemap-core.xml', wrapUrlset(coreUrls));
console.log(`sitemap-core.xml: ${coreUrls.length} URLs`);

// 6. sitemap-index.xml
const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${DOMAIN}/sitemap-core.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-mo-jackson.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-mo-clay-platte.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-ks-johnson-wyandotte.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-situations.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
</sitemapindex>`;
fs.writeFileSync('public/sitemap-index.xml', sitemapIndex);
console.log('sitemap-index.xml: 5 silo sitemaps');

const total = jacksonUrls.length + clayPlatteUrls.length + ksUrls.length + situationUrls.length + coreUrls.length;
console.log(`\nTotal URLs across all sitemaps: ${total}`);
