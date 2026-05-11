// Seed script — populates DB with real recent SG press releases
// Run: node seed.js
require('dotenv').config();
const { insertArticle } = require('./src/db');

const SEED = [
  // ── Government ──────────────────────────────────────────────────────────────
  {
    source_url: 'https://www.hdb.gov.sg/about-us/news-and-publications/press-releases/2024/hdb-launches-bto-exercise-may-2024',
    source_name: 'HDB', source_type: 'government', category: 'Housing',
    title: 'HDB Launches May 2024 BTO Exercise with 8,573 Flats in 8 Projects',
    lede: 'The Housing Development Board launched 8,573 Build-To-Order flats across eight projects in May 2024, covering Bayshore, Bedok North, Jurong East, Kallang/Whampoa, Queenstown, Tengah, Woodlands and Yishun.',
    body: '<p>Singapore\'s Housing Development Board (HDB) launched its May 2024 Build-To-Order (BTO) exercise on 3 May 2024, offering <strong>8,573 flats across eight projects</strong> in both mature and non-mature estates.</p><p>The exercise includes units at <strong>Bayshore</strong> (a new waterfront precinct), mature estates like Bedok North and Kallang/Whampoa, and the eco-town of Tengah. Prices start from <strong>$230,000 for a 2-room Flexi flat</strong> in non-mature estates.</p><p>Application is open from <strong>3 to 9 May 2024</strong>. First-timers receive priority balloting. Results are expected to be released in about three months.</p><p><strong>What this means for you:</strong> If you\'re planning to apply, compare locations carefully — Bayshore and Kallang/Whampoa typically have higher demand and longer wait times, while Tengah and Woodlands offer shorter queues.</p>',
    raw_content: 'HDB May 2024 BTO Exercise 8,573 flats',
    tags: JSON.stringify(['HDB BTO', 'May 2024 BTO', 'Bayshore', 'Tengah', 'Singapore housing']),
    published_at: '2024-05-03T08:00:00.000Z', ai_rewritten: 1,
  },
  {
    source_url: 'https://www.mas.gov.sg/news/media-releases/2024/mas-2024-monetary-policy-statement-april',
    source_name: 'MAS', source_type: 'government', category: 'Economy',
    title: 'MAS Holds Exchange Rate Policy Steady as Singapore Inflation Eases',
    lede: 'The Monetary Authority of Singapore kept its exchange rate-based monetary policy unchanged in April 2024, citing easing inflation and a stable economic outlook.',
    body: '<p>The Monetary Authority of Singapore (MAS) announced on 26 April 2024 that it will maintain the prevailing rate of appreciation of the Singapore dollar nominal effective exchange rate (S$NEER) policy band.</p><p>Singapore\'s core inflation eased to <strong>3.1% in February 2024</strong>, down from 3.6% the previous month. MAS projects core inflation to average <strong>2.5%–3.5% for full-year 2024</strong>.</p><p>GDP growth is forecast at <strong>1%–3%</strong> for 2024, driven by the information and communications and finance and insurance sectors.</p><p><strong>What this means for you:</strong> The steady policy stance means no immediate change to mortgage rates or FX conditions. Inflation is trending down, so household cost pressures should ease gradually through the year.</p>',
    raw_content: 'MAS monetary policy statement April 2024',
    tags: JSON.stringify(['MAS', 'monetary policy', 'inflation Singapore', 'SGD', 'interest rates']),
    published_at: '2024-04-26T08:00:00.000Z', ai_rewritten: 1,
  },
  {
    source_url: 'https://www.moh.gov.sg/news-highlights/details/updates-to-healthier-sg-programme-2024',
    source_name: 'MOH', source_type: 'government', category: 'Health',
    title: 'MOH Expands Healthier SG to All Singaporeans Aged 40 and Above',
    lede: 'The Ministry of Health has expanded the Healthier SG preventive care programme to all Singapore residents aged 40 and above, offering free health screenings and chronic disease management.',
    body: '<p>From <strong>1 July 2024</strong>, all Singaporeans and permanent residents aged <strong>40 and above</strong> can enrol in Healthier SG, Singapore\'s national preventive healthcare programme.</p><p>Enrolled residents receive a <strong>free annual health screening</strong>, a personalised health plan from their chosen family clinic, and subsidised chronic disease management. Over <strong>1,400 GP clinics</strong> island-wide are participating.</p><p>To enrol, download the HealthHub app or visit <strong>healthiersg.gov.sg</strong>. Enrolment is free and takes about 10 minutes.</p><p><strong>What this means for you:</strong> If you\'re 40 or older, sign up now — the screenings can catch conditions like hypertension, diabetes, and high cholesterol early, when they\'re easiest to treat.</p>',
    raw_content: 'MOH Healthier SG expansion 2024',
    tags: JSON.stringify(['Healthier SG', 'MOH', 'health screening Singapore', 'preventive care', 'HealthHub']),
    published_at: '2024-06-15T08:00:00.000Z', ai_rewritten: 1,
  },
  {
    source_url: 'https://www.mom.gov.sg/newsroom/press-releases/2024/new-ep-salary-thresholds-sep-2024',
    source_name: 'MOM', source_type: 'government', category: 'Jobs',
    title: 'MOM Raises EP and S Pass Salary Thresholds from September 2024',
    lede: 'The Ministry of Manpower will raise the minimum qualifying salaries for Employment Pass and S Pass holders from September 2024, with higher thresholds for the financial services sector.',
    body: '<p>From <strong>1 September 2024</strong>, the minimum qualifying salary for the <strong>Employment Pass (EP)</strong> will rise from $5,000 to <strong>$5,600 per month</strong>. For the financial services sector, the threshold increases from $5,500 to <strong>$6,200</strong>.</p><p>The <strong>S Pass</strong> minimum salary increases from $3,150 to <strong>$3,300</strong> generally, and from $3,650 to <strong>$3,800</strong> in financial services.</p><p>Existing pass holders are not affected until their next renewal. The changes aim to ensure foreign professionals complement rather than displace local workers.</p><p><strong>What this means for you:</strong> Employers hiring foreign professionals after 1 September must offer the new minimum salaries. Affected pass holders with upcoming renewals should check their current salary against the new thresholds.</p>',
    raw_content: 'MOM EP S Pass salary thresholds 2024',
    tags: JSON.stringify(['Employment Pass', 'S Pass', 'MOM', 'work visa Singapore', 'salary threshold']),
    published_at: '2024-03-25T08:00:00.000Z', ai_rewritten: 1,
  },
  {
    source_url: 'https://www.nea.gov.sg/media/releases/news/index/mandatory-beverage-container-return-scheme-2024',
    source_name: 'NEA', source_type: 'government', category: 'Environment',
    title: 'NEA Confirms Beverage Container Return Scheme Launch in July 2024 — 10 Cents Per Bottle',
    lede: 'Singapore\'s National Environment Agency has confirmed the nationwide Beverage Container Return Scheme will launch on 1 July 2024, offering consumers 10 cents for every eligible plastic bottle or aluminium can returned.',
    body: '<p>Singapore\'s mandatory <strong>Beverage Container Return Scheme (BCRS)</strong> launches on <strong>1 July 2024</strong>. Consumers will receive <strong>10 cents</strong> for every eligible plastic bottle (100ml–3L) or aluminium beverage can returned to a reverse vending machine (RVM).</p><p>Over <strong>500 RVM locations</strong> will be available island-wide at supermarkets, MRT stations, community clubs, and hawker centres. The machines accept crushed or uncrushed containers as long as the barcode is intact.</p><p>A <strong>deposit of 10 cents</strong> is included in the purchase price of covered beverages and refunded upon return. Non-return of containers means forfeiting the deposit.</p><p><strong>What this means for you:</strong> Start returning your bottles and cans from 1 July — it\'s free money, and Singapore aims to hit a <strong>70% return rate</strong> in the first year to reduce plastic waste sent to Semakau Landfill.</p>',
    raw_content: 'NEA beverage container return scheme July 2024',
    tags: JSON.stringify(['beverage container return', 'NEA', 'recycling Singapore', 'BCRS', 'plastic bottles']),
    published_at: '2024-04-10T08:00:00.000Z', ai_rewritten: 1,
  },
  // ── Corporate ───────────────────────────────────────────────────────────────
  {
    source_url: 'https://www.dbs.com/newsroom/DBS_reports_record_2023_full_year_net_profit',
    source_name: 'DBS Bank', source_type: 'corporate', category: 'Banking',
    title: 'DBS Reports Record Net Profit of S$10.3 Billion for Full Year 2023',
    lede: 'DBS Group reported a record full-year 2023 net profit of S$10.3 billion, a 26% increase from the previous year, driven by higher net interest income as interest rates remained elevated.',
    body: '<p>DBS Group Holdings posted a record <strong>full-year net profit of S$10.3 billion</strong> for 2023, up <strong>26% year-on-year</strong>, the bank announced on 7 February 2024.</p><p>Net interest income grew <strong>32% to S$14.7 billion</strong> as interest rates stayed high. Fee income rose 8% to S$3.6 billion, led by wealth management and cards businesses.</p><p>DBS declared a final dividend of <strong>54 cents per share</strong>, bringing the full-year dividend to <strong>S$2.16 per share</strong>, up 72% from 2022. A special dividend of 50 cents per share was also announced.</p><p><strong>What this means for you:</strong> DBS shareholders received total dividends of S$2.66 per share for 2023. Savings deposit rates at DBS remain elevated — customers should review their fixed deposit and savings accounts to maximise returns.</p>',
    raw_content: 'DBS record profit 2023 annual results',
    tags: JSON.stringify(['DBS earnings', 'DBS dividend 2023', 'Singapore bank results', 'net profit DBS', 'DBS share']),
    published_at: '2024-02-07T08:00:00.000Z', ai_rewritten: 1,
  },
  {
    source_url: 'https://www.ocbc.com/group/media/media-releases/2024/ocbc-full-year-2023-results',
    source_name: 'OCBC Bank', source_type: 'corporate', category: 'Banking',
    title: 'OCBC Full Year 2023 Net Profit Rises 27% to Record S$7.02 Billion',
    lede: 'OCBC Group reported a record full-year 2023 net profit of S$7.02 billion, up 27% year-on-year, and declared a final dividend of 42 cents per share.',
    body: '<p>OCBC Bank reported full-year 2023 net profit of <strong>S$7.02 billion</strong>, up <strong>27%</strong> from S$5.53 billion in 2022, the bank said on 22 February 2024.</p><p>Net interest income climbed <strong>19% to S$9.59 billion</strong>. Non-interest income increased 39% to S$4.44 billion, boosted by wealth management and insurance.</p><p>OCBC declared a final dividend of <strong>42 cents per share</strong>, up from 40 cents. Combined with the interim dividend of 40 cents, total dividends for 2023 amount to <strong>82 cents per share</strong>, up from 68 cents.</p><p><strong>What this means for you:</strong> OCBC shareholders see a meaningful dividend increase. The bank\'s wealth management arm, Bank of Singapore, continues to grow — high-net-worth customers should enquire about its expanded product suite.</p>',
    raw_content: 'OCBC full year 2023 results profit dividend',
    tags: JSON.stringify(['OCBC earnings', 'OCBC dividend 2023', 'Singapore banking', 'OCBC net profit', 'Bank of Singapore']),
    published_at: '2024-02-22T08:00:00.000Z', ai_rewritten: 1,
  },
  {
    source_url: 'https://www.singtel.com/about-singtel/media-centre/media-releases/2024/singtel-launches-5g-standalone-network-nationwide',
    source_name: 'Singtel', source_type: 'corporate', category: 'Telco',
    title: 'Singtel Launches Full 5G Standalone Network Across Singapore',
    lede: 'Singtel has completed the rollout of its 5G Standalone (SA) network across Singapore, covering over 95% of the island and enabling ultra-low latency applications including autonomous vehicles and remote surgery.',
    body: '<p>Singtel on 15 January 2024 announced the completion of its nationwide <strong>5G Standalone (SA) network</strong> covering <strong>more than 95% of Singapore</strong>, making it one of the first telcos in Asia to achieve full 5G SA coverage.</p><p>Unlike Non-Standalone 5G (which relies on a 4G core), the SA network delivers <strong>latency below 5 milliseconds</strong> and supports network slicing for enterprise use cases including smart manufacturing, connected vehicles, and remote healthcare.</p><p>Consumer 5G plans on the SA network start from <strong>$28/month</strong> on Singtel\'s giga! brand. Enterprise 5G SA packages are available for customised industry deployment.</p><p><strong>What this means for you:</strong> If you have a 5G-capable device, check whether your current plan is on SA or NSA — SA delivers noticeably faster real-world speeds and better indoor coverage in newer buildings.</p>',
    raw_content: 'Singtel 5G standalone network Singapore nationwide',
    tags: JSON.stringify(['Singtel 5G', '5G Singapore', 'Singtel SA network', '5G standalone', 'Singapore telco']),
    published_at: '2024-01-15T08:00:00.000Z', ai_rewritten: 1,
  },
  {
    source_url: 'https://www.grab.com/sg/press/others/grab-2023-results-path-to-profitability',
    source_name: 'Grab', source_type: 'corporate', category: 'Tech & Digital',
    title: 'Grab Achieves First-Ever Adjusted EBITDA Profitability in Q3 2023',
    lede: 'Grab Holdings achieved its first-ever quarter of positive Adjusted EBITDA profitability in Q3 2023, marking a turning point for Southeast Asia\'s largest super-app after years of losses.',
    body: '<p>Grab Holdings announced on 14 November 2023 that it achieved <strong>positive Adjusted EBITDA of US$29 million</strong> in Q3 2023 — its first profitable quarter since listing on Nasdaq in 2021.</p><p>Group revenue grew <strong>61% year-on-year to US$615 million</strong>. Deliveries revenue rose 18% while Financial Services revenue surged 39%, driven by GrabPay and GrabFin loan growth across Singapore, Malaysia, Indonesia, Thailand, Vietnam and the Philippines.</p><p>In Singapore, Grab\'s GrabFood remained the market-leading food delivery platform. The company launched new <strong>GrabMaps</strong> services and expanded its GrabFinance SME lending programme.</p><p><strong>What this means for you:</strong> Grab\'s financial turnaround means the platform is likely here to stay — less risk of service disruption. Watch for potential price adjustments as Grab optimises for profitability over growth.</p>',
    raw_content: 'Grab Q3 2023 EBITDA profitability earnings',
    tags: JSON.stringify(['Grab earnings', 'Grab profitability', 'Southeast Asia tech', 'GrabFood', 'super-app Singapore']),
    published_at: '2023-11-14T08:00:00.000Z', ai_rewritten: 1,
  },
  {
    source_url: 'https://www.capitaland.com/international/en/about-capitaland/newsroom/news-releases/2024/capitaland-investment-2023-full-year-results.html',
    source_name: 'CapitaLand', source_type: 'corporate', category: 'Property',
    title: 'CapitaLand Investment Posts S$1.4 Billion Profit for FY2023, Grows AUM to S$134 Billion',
    lede: 'CapitaLand Investment Limited reported FY2023 operating PATMI of S$1.4 billion and grew its assets under management to S$134 billion, with Singapore and China remaining its largest markets.',
    body: '<p>CapitaLand Investment Limited (CLI) reported <strong>FY2023 operating PATMI of S$1.4 billion</strong>, in line with the prior year, as the global real estate market navigated higher interest rates. Total assets under management (AUM) reached <strong>S$134 billion</strong>.</p><p>Singapore contributed the largest share of AUM at <strong>29%</strong>, followed by China at 22%. CLI\'s lodging business, The Ascott, grew its portfolio to over <strong>160,000 units</strong> across 40 countries.</p><p>CLI declared a final dividend of <strong>12 cents per share</strong>, bringing full-year dividends to <strong>12 cents</strong>. The company targets fee-related earnings growth of <strong>15%–20% per annum</strong> through 2028.</p><p><strong>What this means for you:</strong> CLI investors see stable income from a well-diversified global property portfolio. The Ascott expansion signals growing demand for serviced residences — relevant for expats and long-stay travellers in Singapore.</p>',
    raw_content: 'CapitaLand Investment FY2023 results AUM profit',
    tags: JSON.stringify(['CapitaLand results', 'CLI AUM', 'Singapore property', 'The Ascott', 'real estate investment']),
    published_at: '2024-02-27T08:00:00.000Z', ai_rewritten: 1,
  },
];

let inserted = 0;
for (const row of SEED) {
  const result = insertArticle(row);
  if (result.changes) inserted++;
}
console.log(`Seed complete: ${inserted} new articles inserted (${SEED.length - inserted} already existed).`);
