import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://savingkc.com';
const TODAY = new Date().toISOString().split('T')[0];

// Map URL paths to source files for dynamic lastmod
const SOURCE_MAP = {
  '/': 'src/pages/index.astro',
  '/about-us/': 'src/pages/about-us.astro',
  '/how-it-works/': 'src/pages/how-it-works.astro',
  '/reviews/': 'src/pages/reviews.astro',
  '/faq/': 'src/pages/faq.astro',
  '/contact/': 'src/pages/contact.astro',
  '/get-offer/': 'src/pages/get-offer.astro',
  '/case-studies/': 'src/pages/case-studies',
  '/sitemap/': 'src/pages/sitemap.astro',
  '/privacy/': 'src/pages/privacy.astro',
  '/terms/': 'src/pages/terms.astro',
  '/mo/': 'src/pages/mo/[county].astro',
  '/ks/': 'src/pages/ks/[county].astro',
  '/situations/': 'src/pages/situations/index.astro',
  '/probate/': 'src/pages/probate.astro',
  '/tax-delinquent/': 'src/pages/tax-delinquent/index.astro',
  '/tax-delinquent/redemption/jackson-county/': 'src/pages/tax-delinquent/redemption/jackson-county.astro',
  '/tax-delinquent/payment-plans/jackson-county/': 'src/pages/tax-delinquent/payment-plans/jackson-county.astro',
  '/tax-delinquent/payment-plans/johnson-county/': 'src/pages/tax-delinquent/payment-plans/johnson-county.astro',
};

// Source files for dynamic situation pages
const SITUATION_SOURCE = 'src/pages/situations/[situation].astro';
const SITUATION_DATA = 'src/data/situations.ts';
const MO_COUNTY_SOURCE = 'src/pages/mo/[county].astro';
const KS_COUNTY_SOURCE = 'src/pages/ks/[county].astro';

function getFileDate(filepath) {
  try {
    const stat = fs.statSync(filepath);
    return stat.mtime.toISOString().split('T')[0];
  } catch {
    return TODAY;
  }
}

// Get the most recent modification date from multiple source files
function getLastmod(urlPath, ...extraFiles) {
  const files = [];
  if (SOURCE_MAP[urlPath]) files.push(SOURCE_MAP[urlPath]);
  files.push(...extraFiles);

  let latest = '2020-01-01';
  for (const f of files) {
    const d = getFileDate(f);
    if (d > latest) latest = d;
  }
  return latest;
}

function xmlUrl(loc, lastmod, priority = '0.8', changefreq = 'monthly') {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
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

  const cities = [];
  const cityStartRegex = /\{\s*\n\s*name:\s*(?:"([^"]+)"|'((?:[^'\\]|\\.)+)'),\s*\n\s*slug:\s*'([^']+)',\s*\n\s*state:\s*'(?:mo|ks)',\s*\n\s*county:/g;
  const cityStarts = [];
  let cm;
  while ((cm = cityStartRegex.exec(content)) !== null) {
    cityStarts.push({ name: cm[1] || cm[2], slug: cm[3], index: cm.index });
  }

  for (let i = 0; i < cityStarts.length; i++) {
    const start = cityStarts[i].index;
    const end = i + 1 < cityStarts.length ? cityStarts[i + 1].index : content.length;
    const cityBlock = content.substring(start, end);

    const neighborhoods = [];
    const nhStart = cityBlock.indexOf('neighborhoods:');
    if (nhStart >= 0) {
      const nhSection = cityBlock.substring(nhStart);
      const nhSlugRegex = /slug:\s*'([^']+)'/g;
      let nhMatch;
      while ((nhMatch = nhSlugRegex.exec(nhSection)) !== null) {
        neighborhoods.push(nhMatch[1]);
      }
    }

    cities.push({ name: cityStarts[i].name, slug: cityStarts[i].slug, neighborhoods });
  }

  return { state, slug: countySlug, cities, sourceFile: `src/data/counties/${filename}` };
}

// Parse all counties
const jackson = parseCounty('jackson.ts');
const clay = parseCounty('clay.ts');
const platte = parseCounty('platte.ts');
const wyandotte = parseCounty('wyandotte.ts');
const johnson = parseCounty('johnson.ts');

// Generate URLs for a county with dynamic dates
function countyUrls(county) {
  const templateFile = county.state === 'mo' ? MO_COUNTY_SOURCE : KS_COUNTY_SOURCE;
  const countyDate = getLastmod(`/${county.state}/`, templateFile, county.sourceFile);
  const urls = [];
  urls.push(xmlUrl(`${DOMAIN}/${county.state}/${county.slug}/`, countyDate, '0.9'));
  for (const city of county.cities) {
    // City/neighborhood pages use the county data + template
    const cityDate = getLastmod('', templateFile, county.sourceFile);
    urls.push(xmlUrl(`${DOMAIN}/${county.state}/${county.slug}/${city.slug}/`, cityDate, '0.8'));
    for (const nh of city.neighborhoods) {
      urls.push(xmlUrl(`${DOMAIN}/${county.state}/${county.slug}/${city.slug}/${nh}/`, cityDate, '0.7'));
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
const sitDate = getLastmod('/situations/', SITUATION_SOURCE, SITUATION_DATA);
const situationUrls = [
  xmlUrl(`${DOMAIN}/situations/`, getLastmod('/situations/'), '0.8'),
  ...situationSlugs.map(s => xmlUrl(`${DOMAIN}/situations/${s}/`, sitDate, '0.7')),
  xmlUrl(`${DOMAIN}/probate/`, getLastmod('/probate/'), '0.8'),
  xmlUrl(`${DOMAIN}/tax-delinquent/`, getLastmod('/tax-delinquent/'), '0.8'),
  xmlUrl(`${DOMAIN}/tax-delinquent/redemption/jackson-county/`, getLastmod('/tax-delinquent/redemption/jackson-county/'), '0.7'),
  xmlUrl(`${DOMAIN}/tax-delinquent/payment-plans/jackson-county/`, getLastmod('/tax-delinquent/payment-plans/jackson-county/'), '0.7'),
  xmlUrl(`${DOMAIN}/tax-delinquent/payment-plans/johnson-county/`, getLastmod('/tax-delinquent/payment-plans/johnson-county/'), '0.7'),
];
fs.writeFileSync('public/sitemap-situations.xml', wrapUrlset(situationUrls));
console.log(`sitemap-situations.xml: ${situationUrls.length} URLs`);

// 5. sitemap-core.xml
const coreUrls = [
  xmlUrl(`${DOMAIN}/`, getLastmod('/'), '1.0', 'weekly'),
  xmlUrl(`${DOMAIN}/about-us/`, getLastmod('/about-us/'), '0.6'),
  xmlUrl(`${DOMAIN}/how-it-works/`, getLastmod('/how-it-works/'), '0.7'),
  xmlUrl(`${DOMAIN}/reviews/`, getLastmod('/reviews/'), '0.6'),
  xmlUrl(`${DOMAIN}/faq/`, getLastmod('/faq/'), '0.6'),
  xmlUrl(`${DOMAIN}/contact/`, getLastmod('/contact/'), '0.6'),
  xmlUrl(`${DOMAIN}/get-offer/`, getLastmod('/get-offer/'), '0.8'),
  xmlUrl(`${DOMAIN}/case-studies/`, getLastmod('/case-studies/'), '0.5'),
  xmlUrl(`${DOMAIN}/mo/`, getLastmod('/mo/', MO_COUNTY_SOURCE), '0.9'),
  xmlUrl(`${DOMAIN}/ks/`, getLastmod('/ks/', KS_COUNTY_SOURCE), '0.9'),
  xmlUrl(`${DOMAIN}/sitemap/`, getLastmod('/sitemap/'), '0.3'),
  xmlUrl(`${DOMAIN}/privacy/`, getLastmod('/privacy/'), '0.2'),
  xmlUrl(`${DOMAIN}/terms/`, getLastmod('/terms/'), '0.2'),
];
fs.writeFileSync('public/sitemap-core.xml', wrapUrlset(coreUrls));
console.log(`sitemap-core.xml: ${coreUrls.length} URLs`);

// 6. sitemap-index.xml — use latest date from each silo's source files
const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${DOMAIN}/sitemap-core.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-mo-jackson.xml</loc>
    <lastmod>${getFileDate(jackson.sourceFile)}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-mo-clay-platte.xml</loc>
    <lastmod>${[clay, platte].map(c => getFileDate(c.sourceFile)).sort().pop()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-ks-johnson-wyandotte.xml</loc>
    <lastmod>${[wyandotte, johnson].map(c => getFileDate(c.sourceFile)).sort().pop()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-situations.xml</loc>
    <lastmod>${getFileDate(SITUATION_DATA)}</lastmod>
  </sitemap>
</sitemapindex>`;
fs.writeFileSync('public/sitemap-index.xml', sitemapIndex);
console.log('sitemap-index.xml: 5 silo sitemaps');

const total = jacksonUrls.length + clayPlatteUrls.length + ksUrls.length + situationUrls.length + coreUrls.length;
console.log(`\nTotal URLs across all sitemaps: ${total}`);
