/**
 * The typed string catalogs, one per locale. Every user-facing string on the
 * main page has a key here; a missing key in either locale fails the type
 * check. The film captions and the opening quote are folded in from src/copy.ts
 * so the film keeps a single source for its words; this file adds the landing
 * chrome, the hero, and the footer.
 *
 * English is frozen: each value below is byte-identical to the static HTML it
 * replaces on first paint. Spanish uses a modern SaaS register, tu-form.
 */

import { FILM_COPY } from '../copy';

export type Locale = 'en' | 'es';

export const LOCALES: readonly Locale[] = ['en', 'es'];

export interface Catalog {
  /* Landing and site chrome, shared by both headers. */
  product: string;
  megaEnginesTitle: string;
  megaEnginesSub: string;
  megaApisTitle: string;
  megaApisSub: string;
  megaLibraryTitle: string;
  megaLibrarySub: string;
  explore: string;
  seeMore: string;
  apiKey: string;
  enterprise: string;
  pricing: string;
  support: string;
  bookCall: string;
  getStarted: string;
  /* The film's skip control. */
  skipFilm: string;
  introTitle: string;
  introSub: string;
  /* The opening quote, folded from src/copy.ts. */
  quoteText: string;
  quoteAttribution: string;
  /* Film captions, folded from src/copy.ts. */
  newton1: string;
  newton2: string;
  wrights: string;
  lilienthal: string;
  nasa: string;
  armstrong: string;
  card1: string;
  card2: string;
  /* The site hero: the two-line heading, its lead words, the four rotating
     wheel words on line one, and the tail line. */
  heroLead: string;
  heroTail: string;
  heroWheel1: string;
  heroWheel2: string;
  heroWheel3: string;
  heroWheel4: string;
  heroWheel5: string;
  siteNote: string;
  /* The hero's subheadline and the team band's provenance label. */
  heroSub: string;
  mediaStripLabel: string;
  /* The library section: heading and lede, then a 32-cell grid of deterministic
     work. The first sixteen show; the rest wait in a region a See more control
     reveals. Each cell carries a name, a one-line description, and two mono
     examples (ExA at rest, ExB on hover). Cell 16, the And more boundary, moves
     to the very end; cells 17 through 32 are the added categories. */
  libraryTitle: string;
  libraryTitle2: string;
  libraryBody: string;
  cell1Name: string;
  cell1Desc: string;
  cell1ExA: string;
  cell1ExB: string;
  cell2Name: string;
  cell2Desc: string;
  cell2ExA: string;
  cell2ExB: string;
  cell3Name: string;
  cell3Desc: string;
  cell3ExA: string;
  cell3ExB: string;
  cell4Name: string;
  cell4Desc: string;
  cell4ExA: string;
  cell4ExB: string;
  cell5Name: string;
  cell5Desc: string;
  cell5ExA: string;
  cell5ExB: string;
  cell6Name: string;
  cell6Desc: string;
  cell6ExA: string;
  cell6ExB: string;
  cell7Name: string;
  cell7Desc: string;
  cell7ExA: string;
  cell7ExB: string;
  cell8Name: string;
  cell8Desc: string;
  cell8ExA: string;
  cell8ExB: string;
  cell9Name: string;
  cell9Desc: string;
  cell9ExA: string;
  cell9ExB: string;
  cell10Name: string;
  cell10Desc: string;
  cell10ExA: string;
  cell10ExB: string;
  cell11Name: string;
  cell11Desc: string;
  cell11ExA: string;
  cell11ExB: string;
  cell12Name: string;
  cell12Desc: string;
  cell12ExA: string;
  cell12ExB: string;
  cell13Name: string;
  cell13Desc: string;
  cell13ExA: string;
  cell13ExB: string;
  cell14Name: string;
  cell14Desc: string;
  cell14ExA: string;
  cell14ExB: string;
  cell15Name: string;
  cell15Desc: string;
  cell15ExA: string;
  cell15ExB: string;
  cell16Name: string;
  cell16Desc: string;
  cell16ExA: string;
  cell16ExB: string;
  cell17Name: string;
  cell17Desc: string;
  cell17ExA: string;
  cell17ExB: string;
  cell18Name: string;
  cell18Desc: string;
  cell18ExA: string;
  cell18ExB: string;
  cell19Name: string;
  cell19Desc: string;
  cell19ExA: string;
  cell19ExB: string;
  cell20Name: string;
  cell20Desc: string;
  cell20ExA: string;
  cell20ExB: string;
  cell21Name: string;
  cell21Desc: string;
  cell21ExA: string;
  cell21ExB: string;
  cell22Name: string;
  cell22Desc: string;
  cell22ExA: string;
  cell22ExB: string;
  cell23Name: string;
  cell23Desc: string;
  cell23ExA: string;
  cell23ExB: string;
  cell24Name: string;
  cell24Desc: string;
  cell24ExA: string;
  cell24ExB: string;
  cell25Name: string;
  cell25Desc: string;
  cell25ExA: string;
  cell25ExB: string;
  cell26Name: string;
  cell26Desc: string;
  cell26ExA: string;
  cell26ExB: string;
  cell27Name: string;
  cell27Desc: string;
  cell27ExA: string;
  cell27ExB: string;
  cell28Name: string;
  cell28Desc: string;
  cell28ExA: string;
  cell28ExB: string;
  cell29Name: string;
  cell29Desc: string;
  cell29ExA: string;
  cell29ExB: string;
  cell30Name: string;
  cell30Desc: string;
  cell30ExA: string;
  cell30ExB: string;
  cell31Name: string;
  cell31Desc: string;
  cell31ExA: string;
  cell31ExB: string;
  cell32Name: string;
  cell32Desc: string;
  cell32ExA: string;
  cell32ExB: string;
  /* The API index section: a two-line heading, a lede, and an eight-cell
     grid of famous APIs, the eighth being the more box. */
  apiIndexTitle: string;
  apiIndexTitle2: string;
  apiIndexLede: string;
  apiCell1Name: string;
  apiCell1Desc: string;
  apiCell1ExA: string;
  apiCell1ExB: string;
  apiCell2Name: string;
  apiCell2Desc: string;
  apiCell2ExA: string;
  apiCell2ExB: string;
  apiCell3Name: string;
  apiCell3Desc: string;
  apiCell3ExA: string;
  apiCell3ExB: string;
  apiCell4Name: string;
  apiCell4Desc: string;
  apiCell4ExA: string;
  apiCell4ExB: string;
  apiCell5Name: string;
  apiCell5Desc: string;
  apiCell5ExA: string;
  apiCell5ExB: string;
  apiCell6Name: string;
  apiCell6Desc: string;
  apiCell6ExA: string;
  apiCell6ExB: string;
  apiCell7Name: string;
  apiCell7Desc: string;
  apiCell7ExA: string;
  apiCell7ExB: string;
  apiCell8Name: string;
  apiCell8Desc: string;
  apiCell8ExA: string;
  apiCell8ExB: string;
  /* The compiler section: heading, lede, and a small external link out to the
     small-software idea. */
  compilerTitle: string;
  compilerBody: string;
  smallSoftware: string;
  /* The footer: tagline, the three column headings and their links, and the
     rights line. The Product column reuses product/pricing/support/bookCall. */
  footerTag: string;
  company: string;
  legal: string;
  about: string;
  blog: string;
  contact: string;
  privacy: string;
  terms: string;
  cookiePolicy: string;
  rights: string;
  /* The footer theme switch (visual only): group label and the three modes. */
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  /* Assistive text and page metadata. */
  ariaChangeLanguage: string;
  ariaMenu: string;
  metaDescription: string;
  /* The compiler diagram's one label, riding the library slab. */
  diagramLabel: string;
  /* The hero terminal demo. The two pane heads (name and the API cost seed),
     the cost ticker's prefix, the fast forward control's two titles, and every
     scripted line of the race: the shared prompt, then Anteon's tool calls and
     elbow results and close, then the rival's prose, working glyphs, failed
     search, upload, and late answer. File names, §7.2(b), and prices stay put
     inside the otherwise-translated sentences. */
  withAnteon: string;
  withoutAnteon: string;
  apiCost: string;
  apiCostSeed: string;
  demoFastForward: string;
  demoPlayAgain: string;
  demoPrompt: string;
  demoATool1: string;
  demoAOut1: string;
  demoATool2: string;
  demoAOut2: string;
  demoATool3: string;
  demoAOut3: string;
  demoAOut4: string;
  demoATool4: string;
  demoAOut5: string;
  demoASay1: string;
  demoBSay1: string;
  demoBWork1: string;
  demoBSay2: string;
  demoBWork2: string;
  demoBSay3: string;
  demoBWork3: string;
  demoBSay4: string;
  demoBWork4: string;
  demoBFail1: string;
  demoBSay5: string;
  demoBUser1: string;
  demoBSay6: string;
  demoBWork5: string;
  demoBSay7: string;
  demoBWork6: string;
  demoBSay8: string;
  /* The auth screens: sign in, create account, and reset password. Standalone
     shell pages whose flow mirrors the account screens ported from the app;
     the forms carry real fields but post nowhere until an auth backend exists.
     emailLabel and passwordLabel are shared across the three. */
  authEmailLabel: string;
  authPasswordLabel: string;
  signinTitle: string;
  signinSubtitle: string;
  signinForgot: string;
  rememberMe: string;
  signinSubmit: string;
  signinNoAccount: string;
  signinNoAccountLink: string;
  signupTitle: string;
  signupSubtitle: string;
  signupSubmit: string;
  signupHaveAccount: string;
  signupHaveAccountLink: string;
  forgotTitle: string;
  forgotSubtitle: string;
  forgotSubmit: string;
  forgotBackToSignin: string;
  /* The auth dialog's close control. */
  ariaClose: string;
}

/** The strings this file owns; the rest of a Catalog is folded from the film copy. */
type ChromeStrings = Omit<
  Catalog,
  | 'quoteText'
  | 'quoteAttribution'
  | 'newton1'
  | 'newton2'
  | 'wrights'
  | 'lilienthal'
  | 'nasa'
  | 'armstrong'
  | 'card1'
  | 'card2'
>;

const CHROME: Record<Locale, ChromeStrings> = {
  en: {
    product: 'Solutions',
    megaEnginesTitle: 'Engine database',
    megaEnginesSub: '1,000+ deterministic engines and the intelligence layer that guides your AI to call them',
    megaApisTitle: 'API database',
    megaApisSub: 'A hand-vetted, continuously updated index of the top APIs on the internet',
    megaLibraryTitle: 'Personal database',
    megaLibrarySub: 'Unique engines, compiled from your firm\u2019s unique work and shared across your team',
    explore: 'Explore further',
    seeMore: 'See more',
    apiKey: 'API / MCP',
    enterprise: 'Enterprise',
    pricing: 'Pricing',
    support: 'Support',
    bookCall: 'Book a call',
    getStarted: 'Get started',
    skipFilm: 'Skip the film',
    introTitle: 'Anteon',
    introSub: 'The determinism layer your AI stands on',
    heroLead: 'Stop wasting',
    heroTail: 'on solved problems',
    heroWheel1: 'tokens',
    heroWheel2: 'time',
    heroWheel3: 'manpower',
    heroWheel4: 'cash',
    heroWheel5: 'effort',
    siteNote: 'The site begins here.',
    heroSub:
      'Anteon runs above your AI and removes the overhead. Performance is measured against auditable KPIs: only pay after we save you money.',
    mediaStripLabel: 'Team from',
    libraryTitle: '1,000+ engines, intelligently',
    libraryTitle2: 'preloaded to cut costs',
    libraryBody:
      'Most of what your AI rebuilds is deterministic work that was solved years ago. Anteon holds 1,000+ of those solutions as versioned engines and routes every request to the right one. The same call returns the same answer, faster and at a lower cost.',
    cell1Name: 'Conversion',
    cell1Desc: 'Any format into any other, whether files, images, code, or encodings.',
    cell1ExA: 'docx → pdf',
    cell1ExB: 'png → webp',
    cell2Name: 'Extraction',
    cell2Desc: 'Structured fields pulled from raw documents, scans, logs, and pages.',
    cell2ExA: 'invoice.pdf → {total, due_date}',
    cell2ExB: 'receipt.jpg → {vendor, amount}',
    cell3Name: 'Math & dates',
    cell3Desc: 'Financial formulas, percentages, and calendar arithmetic, exactly.',
    cell3ExA: '90 business days from Mar 3',
    cell3ExB: '18% of 4,200',
    cell4Name: 'Lookups',
    cell4Desc: 'Reference codes and standardized IDs from the actual tables.',
    cell4ExA: 'HS code for lithium batteries',
    cell4ExB: 'ISO country for +44',
    cell5Name: 'Validation',
    cell5Desc: 'Data checked against schemas, formats, and check digits.',
    cell5ExA: 'IBAN checksum → valid',
    cell5ExB: 'ISBN-13 → valid',
    cell6Name: 'Reconciliation',
    cell6Desc: 'Diff, dedupe, and match across lists, no rows silently dropped.',
    cell6ExA: 'payments <-> invoices: 3 unmatched',
    cell6ExB: 'ledger <-> bank: 2 unmatched',
    cell7Name: 'Tabular ops',
    cell7Desc: 'Group, join, filter, and pivot at SQL speed and SQL accuracy.',
    cell7ExA: 'sum(revenue) by region',
    cell7ExB: 'avg(price) by category',
    cell8Name: 'Text mechanics',
    cell8Desc: 'Count, sort, dedupe, and pattern-extract, precisely.',
    cell8ExA: 'every email in this thread',
    cell8ExB: 'sort 10,000 rows by date',
    cell9Name: 'Standards formatting',
    cell9Desc: 'Citations, code style, and localization, all to the published spec.',
    cell9ExA: '→ APA 7th, every time',
    cell9ExB: 'snake_case → camelCase',
    cell10Name: 'Code mechanics',
    cell10Desc: 'Types from JSON, SDKs from specs, dialect-to-dialect translation.',
    cell10ExA: 'OpenAPI → TypeScript client',
    cell10ExB: 'JSON → Go structs',
    cell11Name: 'Document assembly',
    cell11Desc: 'Templates filled from fields, the fixed parts stay fixed.',
    cell11ExA: 'offer letter from {name, salary}',
    cell11ExB: 'invoice from {client, amount}',
    cell12Name: 'Scheduling logic',
    cell12Desc: 'Recurrence, overlaps, and business-day math across timezones.',
    cell12ExA: 'next slot free in both calendars',
    cell12ExB: 'every 2nd Tuesday, 9am ET',
    cell13Name: 'Encode & decode',
    cell13Desc: 'Hashes, tokens, and encodings, without pasting secrets into chat.',
    cell13ExA: 'decode JWT → claims',
    cell13ExB: 'base64 → bytes',
    cell14Name: 'Geo mechanics',
    cell14Desc: 'Distances, geocoding, and territory containment, computed, not guessed.',
    cell14ExA: 'address → sales territory',
    cell14ExB: 'lat,lng → timezone',
    cell15Name: 'Rule-based decisions',
    cell15Desc: 'Where the policy is written, the decision is an engine.',
    cell15ExA: 'expense > $5k → VP approval',
    cell15ExB: 'risk score > 80 → manual review',
    cell16Name: 'And more',
    cell16Desc: 'The library runs far past this page, and the compiler keeps adding to it.',
    cell16ExA: 'timezones, checksums, ocr',
    cell16ExB: 'tax math, dedupe, redlines',
    cell17Name: 'Diff & merge',
    cell17Desc: 'Text and structured diff, three-way merge, and patch application.',
    cell17ExA: 'v1.docx vs v2 → tracked changes',
    cell17ExB: 'merge 3 branches → 0 conflicts',
    cell18Name: 'Units & measures',
    cell18Desc: 'Unit conversion and dimensional analysis, exact.',
    cell18ExA: '14 psi → kPa',
    cell18ExB: '27 mi/gal → L/100km',
    cell19Name: 'Billing math',
    cell19Desc: 'Proration, tiered pricing, and tax lines, to the cent.',
    cell19ExA: 'prorate $300/yr from Mar 3',
    cell19ExB: '12 seats, tier 2 → $1,080',
    cell20Name: 'Sign & verify',
    cell20Desc: 'Signatures, certificates, and token verification.',
    cell20ExA: 'JWT → valid, expires in 3d',
    cell20ExB: 'cert chain → trusted',
    cell21Name: 'Compression & archives',
    cell21Desc: 'Pack, unpack, and list, byte-stable.',
    cell21ExA: 'logs/ → logs.tar.gz',
    cell21ExB: 'unzip report.zip → 42 files',
    cell22Name: 'Media mechanics',
    cell22Desc: 'Resize, crop, transcode, and strip metadata.',
    cell22ExA: 'strip EXIF from 400 photos',
    cell22ExB: 'mp4 → webm, 1080p',
    cell23Name: 'Color math',
    cell23Desc: 'Color spaces, contrast ratios, and palette tokens.',
    cell23ExA: '#0b0b0d on #eceae4 → 15.2:1',
    cell23ExB: 'hex → oklch',
    cell24Name: 'Parsing & grammars',
    cell24Desc: 'Cron, CSV dialects, URLs, and user agents, parsed strictly.',
    cell24ExA: 'cron 0 9 * * 1-5 → next 3 runs',
    cell24ExB: 'user agent → os, browser',
    cell25Name: 'Ranking & scoring',
    cell25Desc: 'Weighted scores, stable sorts, and tie-break rules.',
    cell25ExA: 'rank vendors by 4 criteria',
    cell25ExB: 'score leads 0-100',
    cell26Name: 'Exact statistics',
    cell26Desc: 'Percentiles, correlations, and aggregates on full data.',
    cell26ExA: 'p95 latency from 2M rows',
    cell26ExB: 'corr(spend, revenue)',
    cell27Name: 'Network math',
    cell27Desc: 'CIDR splits, subnet planning, and range membership.',
    cell27ExA: '10.0.0.0/16 → 4 /18s',
    cell27ExB: 'is 10.2.4.9 in 10.2.0.0/20',
    cell28Name: 'Fuzzy matching',
    cell28Desc: 'Similarity with fixed thresholds and phonetic keys.',
    cell28ExA: 'dedupe CRM at 0.92 match',
    cell28ExB: '"Jon Smith" ~ "John Smyth"',
    cell29Name: 'Contact normalization',
    cell29Desc: 'Addresses, phones, and names, brought to standard.',
    cell29ExA: '(415) 555-0134 → E.164',
    cell29ExB: 'normalize 5,000 addresses',
    cell30Name: 'Allocation & packing',
    cell30Desc: 'FIFO and LIFO costing, bin packing, and reorder points.',
    cell30ExA: 'allocate 1,240 units FIFO',
    cell30ExB: 'pack 38 items → 4 bins',
    cell31Name: 'Graph mechanics',
    cell31Desc: 'Dependency order, shortest paths, and cycle detection.',
    cell31ExA: 'build order for 87 packages',
    cell31ExB: 'shortest path A → K',
    cell32Name: 'Redaction & masking',
    cell32Desc: 'Format-preserving masking and deterministic PII removal.',
    cell32ExA: 'mask SSNs, keep last 4',
    cell32ExB: 'redact PII from 60 pages',
    apiIndexTitle: 'The internet’s best APIs,',
    apiIndexTitle2: 'indexed and ranked',
    apiIndexLede:
      'Not every task deserves a new engine. Anteon maintains a live index of the internet\u2019s strongest APIs, ranked on our own quality metrics. When your AI starts building what an API already does, Anteon recommends the proven one instead.',
    apiCell1Name: 'Stripe',
    apiCell1Desc: 'Payments, billing, and invoicing, from checkout to payout.',
    apiCell1ExA: 'invoice → paid',
    apiCell1ExB: 'refund → processed',
    apiCell2Name: 'Twilio',
    apiCell2Desc: 'SMS, voice, and verification at carrier scale.',
    apiCell2ExA: 'sms → delivered',
    apiCell2ExB: 'otp → verified',
    apiCell3Name: 'SendGrid',
    apiCell3Desc: 'Transactional email that reaches the inbox.',
    apiCell3ExA: 'receipt → inbox',
    apiCell3ExB: 'password reset → sent',
    apiCell4Name: 'Google Maps',
    apiCell4Desc: 'Geocoding, routing, and places for any address.',
    apiCell4ExA: 'address → lat, lng',
    apiCell4ExB: 'route → 24 min',
    apiCell5Name: 'AWS S3',
    apiCell5Desc: 'Object storage for anything, at any size.',
    apiCell5ExA: 'report.pdf → uploaded',
    apiCell5ExB: 'presigned url → ready',
    apiCell6Name: 'GitHub',
    apiCell6Desc: 'Repositories, pull requests, and release automation.',
    apiCell6ExA: 'pr #412 → merged',
    apiCell6ExB: 'v2.1 → released',
    apiCell7Name: 'Slack',
    apiCell7Desc: 'Messages, channels, and workflow alerts.',
    apiCell7ExA: 'alert → #ops',
    apiCell7ExB: 'summary → #general',
    apiCell8Name: 'More APIs',
    apiCell8Desc: 'The index runs far past this page, ranked by metrics that stay current.',
    apiCell8ExA: 'ask for any api',
    apiCell8ExB: 'ranked, then routed',
    compilerTitle: 'A personal, self-improving library precision-built for your firm',
    compilerBody:
      'Your team already writes small software, the one-off scripts every project leaves behind. Anteon compiles it into versioned engines the whole firm shares, and the same auditable KPIs show it paying for itself.',
    smallSoftware: 'Small software, explained',
    footerTag: 'Solved problems should stay solved',
    company: 'Company',
    legal: 'Legal',
    about: 'About',
    blog: 'Blog',
    contact: 'Contact',
    privacy: 'Privacy',
    terms: 'Terms',
    cookiePolicy: 'Cookie policy',
    theme: 'Theme',
    themeSystem: 'System theme',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    rights: '© 2026 Anteon. All rights reserved.',
    ariaChangeLanguage: 'Change language',
    ariaMenu: 'Menu',
    metaDescription: 'If I have seen further, it is by standing on the shoulders of Giants.',
    diagramLabel: 'Firm knowledge library',
    withAnteon: 'With Anteon',
    withoutAnteon: 'Without Anteon',
    apiCost: 'API cost: $',
    apiCostSeed: 'API cost: $0.00',
    demoFastForward: 'Fast forward',
    demoPlayAgain: 'Play again',
    demoPrompt:
      'Convert the Q2 supplier datasheet to CSV, give me spend totals by vendor with variance vs Q1, and check if policy requires an audit of the procurement team.',
    demoATool1: 'engine · database',
    demoAOut1: 'supplier_q2 pulled from company database',
    demoATool2: 'engine · convert',
    demoAOut2: 'converted → supplier_q2.csv',
    demoATool3: 'engine · tabular ops',
    demoAOut3: 'totals: 14 vendors · $2,418,644',
    demoAOut4: 'variance vs Q1: +4.2%',
    demoATool4: 'engine · policy database scan',
    demoAOut5: 'audit required → yes, §7.2(b), Vendor Audit Policy',
    demoASay1: 'Done, supplier_q2 is converted. An audit is required under §7.2(b), Vendor Audit Policy.',
    demoBSay1: 'Let me look for the Q2 datasheet first…',
    demoBWork1: 'Searching files…',
    demoBSay2: 'Found it. Converting the file format now…',
    demoBWork2: 'Converting…',
    demoBSay3: 'Now let me group the data and run the math…',
    demoBWork3: 'Computing…',
    demoBSay4: 'Searching your desktop for the company guidelines…',
    demoBWork4: 'Searching…',
    demoBFail1: 'I could not find the policy document.',
    demoBSay5: 'Could you upload the guideline file?',
    demoBUser1: 'vendor_audit_guideline.pdf attached',
    demoBSay6: 'Reading vendor_audit_guideline.pdf…',
    demoBWork5: 'Reading…',
    demoBSay7: 'Checking which sections apply to procurement…',
    demoBWork6: 'Checking…',
    demoBSay8:
      'All done. supplier_q2.csv is ready, the spend totals and variance are computed, and an audit of the procurement team is required under §7.2(b), Vendor Audit Policy.',
    authEmailLabel: 'Email',
    authPasswordLabel: 'Password',
    signinTitle: 'Sign in',
    signinSubtitle: 'Welcome back. Sign in to pick up where you left off.',
    signinForgot: 'Forgot your password?',
    rememberMe: 'Remember me',
    signinSubmit: 'Sign in',
    signinNoAccount: 'New here?',
    signinNoAccountLink: 'Create an account',
    signupTitle: 'Create your account',
    signupSubtitle: 'Start with 1,000+ deterministic engines and a library that grows with your firm.',
    signupSubmit: 'Create account',
    signupHaveAccount: 'Already have an account?',
    signupHaveAccountLink: 'Sign in',
    forgotTitle: 'Reset your password',
    forgotSubtitle: 'Enter your email and we’ll send a link to set a new password.',
    forgotSubmit: 'Send reset link',
    forgotBackToSignin: 'Back to sign in',
    ariaClose: 'Close',
  },
  es: {
    product: 'Solutions',
    megaEnginesTitle: 'Base de datos de motores',
    megaEnginesSub: 'Más de 1.000 motores deterministas y la capa de inteligencia que guía a tu IA para llamarlos',
    megaApisTitle: 'Base de datos de API',
    megaApisSub: 'Un índice verificado a mano y siempre al día de las mejores API de internet',
    megaLibraryTitle: 'Base de datos personal',
    megaLibrarySub: 'Motores únicos, compilados desde el trabajo único de tu empresa y compartidos con tu equipo',
    explore: 'Explorar más',
    seeMore: 'Ver más',
    apiKey: 'API / MCP',
    enterprise: 'Empresas',
    pricing: 'Precios',
    support: 'Soporte',
    bookCall: 'Reserva una llamada',
    getStarted: 'Comenzar',
    skipFilm: 'Salta la película',
    introTitle: 'Anteon',
    introSub: 'La capa de determinismo sobre la que se apoya tu IA',
    heroLead: 'Deja de gastar',
    heroTail: 'en problemas resueltos',
    heroWheel1: 'tokens',
    heroWheel2: 'tiempo',
    heroWheel3: 'personal',
    heroWheel4: 'dinero',
    heroWheel5: 'esfuerzo',
    siteNote: 'Aquí empieza el sitio.',
    heroSub:
      'Anteon opera sobre tu IA y elimina la sobrecarga. El rendimiento se mide con KPI auditables: paga solo cuando ya te hemos ahorrado dinero.',
    mediaStripLabel: 'Equipo formado en',
    libraryTitle: 'Más de 1.000 motores, precargados',
    libraryTitle2: 'de forma inteligente para reducir costos',
    libraryBody:
      'La mayor parte de lo que tu IA reconstruye es trabajo determinista que se resolvió hace años. Anteon guarda más de 1.000 de esas soluciones como motores versionados y dirige cada petición al correcto. La misma llamada devuelve la misma respuesta, más rápido y a menor costo.',
    cell1Name: 'Conversión',
    cell1Desc: 'Cualquier formato a cualquier otro, ya sean archivos, imágenes, código o codificaciones.',
    cell1ExA: 'docx → pdf',
    cell1ExB: 'png → webp',
    cell2Name: 'Extracción',
    cell2Desc: 'Campos estructurados de documentos, escaneos, registros y páginas en bruto.',
    cell2ExA: 'invoice.pdf → {total, due_date}',
    cell2ExB: 'receipt.jpg → {vendor, amount}',
    cell3Name: 'Cálculo y fechas',
    cell3Desc: 'Fórmulas financieras, porcentajes y aritmética de calendario, exactamente.',
    cell3ExA: '90 días hábiles desde el 3 de marzo',
    cell3ExB: '18% de 4.200',
    cell4Name: 'Búsquedas',
    cell4Desc: 'Códigos de referencia e IDs estandarizados desde las tablas reales.',
    cell4ExA: 'código HS para baterías de litio',
    cell4ExB: 'país ISO para +44',
    cell5Name: 'Validación',
    cell5Desc: 'Datos verificados contra esquemas, formatos y dígitos de control.',
    cell5ExA: 'IBAN checksum → valid',
    cell5ExB: 'ISBN-13 → valid',
    cell6Name: 'Conciliación',
    cell6Desc: 'Compara, deduplica y cruza listas, sin filas descartadas en silencio.',
    cell6ExA: 'payments <-> invoices: 3 unmatched',
    cell6ExB: 'ledger <-> bank: 2 unmatched',
    cell7Name: 'Operaciones tabulares',
    cell7Desc: 'Agrupa, une, filtra y pivota a velocidad y precisión de SQL.',
    cell7ExA: 'sum(revenue) by region',
    cell7ExB: 'avg(price) by category',
    cell8Name: 'Mecánica de texto',
    cell8Desc: 'Cuenta, ordena, deduplica y extrae patrones, con precisión.',
    cell8ExA: 'cada correo en este hilo',
    cell8ExB: 'ordenar 10.000 filas por fecha',
    cell9Name: 'Formato de estándares',
    cell9Desc: 'Citas, estilo de código y localización, todo según la especificación publicada.',
    cell9ExA: '→ APA 7th, every time',
    cell9ExB: 'snake_case → camelCase',
    cell10Name: 'Mecánica de código',
    cell10Desc: 'Tipos desde JSON, SDKs desde especificaciones, traducción entre dialectos.',
    cell10ExA: 'OpenAPI → TypeScript client',
    cell10ExB: 'JSON → Go structs',
    cell11Name: 'Ensamblaje de documentos',
    cell11Desc: 'Plantillas rellenadas desde campos, lo fijo se queda fijo.',
    cell11ExA: 'offer letter from {name, salary}',
    cell11ExB: 'invoice from {client, amount}',
    cell12Name: 'Lógica de calendario',
    cell12Desc: 'Recurrencia, solapamientos y cálculo de días hábiles entre zonas horarias.',
    cell12ExA: 'próximo hueco libre en ambos calendarios',
    cell12ExB: 'cada segundo martes, 9:00 ET',
    cell13Name: 'Codificar y decodificar',
    cell13Desc: 'Hashes, tokens y codificaciones, sin pegar secretos en el chat.',
    cell13ExA: 'decode JWT → claims',
    cell13ExB: 'base64 → bytes',
    cell14Name: 'Mecánica geográfica',
    cell14Desc: 'Distancias, geocodificación y contención de territorio, calculado, no adivinado.',
    cell14ExA: 'address → sales territory',
    cell14ExB: 'lat,lng → timezone',
    cell15Name: 'Decisiones por reglas',
    cell15Desc: 'Donde la política está escrita, la decisión es un motor.',
    cell15ExA: 'gasto > $5k → aprobación de VP',
    cell15ExB: 'puntuación de riesgo > 80 → revisión manual',
    cell16Name: 'Y más',
    cell16Desc: 'La biblioteca va mucho más allá de esta página, y el compilador no deja de ampliarla.',
    cell16ExA: 'husos horarios, checksums, ocr',
    cell16ExB: 'cálculo fiscal, dedupe, cotejos',
    cell17Name: 'Comparar y fusionar',
    cell17Desc: 'Diferencias de texto y estructura, fusión a tres vías y aplicación de parches.',
    cell17ExA: 'v1.docx vs v2 → tracked changes',
    cell17ExB: 'merge 3 branches → 0 conflicts',
    cell18Name: 'Unidades y medidas',
    cell18Desc: 'Conversión de unidades y análisis dimensional, exacto.',
    cell18ExA: '14 psi → kPa',
    cell18ExB: '27 mi/gal → L/100km',
    cell19Name: 'Cálculo de facturación',
    cell19Desc: 'Prorrateo, precios por tramos y líneas de impuestos, al céntimo.',
    cell19ExA: 'prorratea $300/año desde el 3 de marzo',
    cell19ExB: '12 licencias, nivel 2 → $1,080',
    cell20Name: 'Firmar y verificar',
    cell20Desc: 'Firmas, certificados y verificación de tokens.',
    cell20ExA: 'JWT → valid, expires in 3d',
    cell20ExB: 'cert chain → trusted',
    cell21Name: 'Compresión y archivos',
    cell21Desc: 'Empaqueta, extrae y lista, con bytes estables.',
    cell21ExA: 'logs/ → logs.tar.gz',
    cell21ExB: 'unzip report.zip → 42 files',
    cell22Name: 'Mecánica multimedia',
    cell22Desc: 'Redimensiona, recorta, transcodifica y elimina metadatos.',
    cell22ExA: 'elimina EXIF de 400 fotos',
    cell22ExB: 'mp4 → webm, 1080p',
    cell23Name: 'Cálculo de color',
    cell23Desc: 'Espacios de color, ratios de contraste y tokens de paleta.',
    cell23ExA: '#0b0b0d on #eceae4 → 15.2:1',
    cell23ExB: 'hex → oklch',
    cell24Name: 'Análisis y gramáticas',
    cell24Desc: 'Cron, dialectos CSV, URLs y user agents, analizados con rigor.',
    cell24ExA: 'cron 0 9 * * 1-5 → next 3 runs',
    cell24ExB: 'user agent → os, browser',
    cell25Name: 'Clasificación y puntuación',
    cell25Desc: 'Puntuaciones ponderadas, ordenaciones estables y reglas de desempate.',
    cell25ExA: 'clasifica proveedores por 4 criterios',
    cell25ExB: 'puntúa leads 0-100',
    cell26Name: 'Estadística exacta',
    cell26Desc: 'Percentiles, correlaciones y agregados sobre todos los datos.',
    cell26ExA: 'p95 de latencia en 2M filas',
    cell26ExB: 'corr(spend, revenue)',
    cell27Name: 'Cálculo de redes',
    cell27Desc: 'División de CIDR, planificación de subredes y pertenencia a rangos.',
    cell27ExA: '10.0.0.0/16 → 4 /18s',
    cell27ExB: 'is 10.2.4.9 in 10.2.0.0/20',
    cell28Name: 'Coincidencia difusa',
    cell28Desc: 'Similitud con umbrales fijos y claves fonéticas.',
    cell28ExA: 'dedupe CRM at 0.92 match',
    cell28ExB: '"Jon Smith" ~ "John Smyth"',
    cell29Name: 'Normalización de contactos',
    cell29Desc: 'Direcciones, teléfonos y nombres, llevados al estándar.',
    cell29ExA: '(415) 555-0134 → E.164',
    cell29ExB: 'normaliza 5.000 direcciones',
    cell30Name: 'Asignación y empaquetado',
    cell30Desc: 'Costeo FIFO y LIFO, empaquetado en contenedores y puntos de pedido.',
    cell30ExA: 'asigna 1.240 unidades FIFO',
    cell30ExB: 'empaqueta 38 artículos → 4 contenedores',
    cell31Name: 'Mecánica de grafos',
    cell31Desc: 'Orden de dependencias, rutas más cortas y detección de ciclos.',
    cell31ExA: 'orden de compilación de 87 paquetes',
    cell31ExB: 'ruta más corta A → K',
    cell32Name: 'Ocultación y enmascarado',
    cell32Desc: 'Enmascarado que preserva el formato y eliminación determinista de PII.',
    cell32ExA: 'enmascara SSN, conserva los 4 últimos',
    cell32ExB: 'oculta PII de 60 páginas',
    apiIndexTitle: 'Las mejores API de internet,',
    apiIndexTitle2: 'indexadas y clasificadas',
    apiIndexLede:
      'No toda tarea merece un motor nuevo. Anteon mantiene un índice vivo de las API más potentes de internet, clasificadas según nuestras propias métricas de calidad. Cuando tu IA empieza a construir algo que una API ya hace, Anteon te recomienda la que ya está probada.',
    apiCell1Name: 'Stripe',
    apiCell1Desc: 'Pagos, facturación y cobros, del checkout al abono.',
    apiCell1ExA: 'factura → pagada',
    apiCell1ExB: 'reembolso → procesado',
    apiCell2Name: 'Twilio',
    apiCell2Desc: 'SMS, voz y verificación a escala de operador.',
    apiCell2ExA: 'sms → entregado',
    apiCell2ExB: 'otp → verificado',
    apiCell3Name: 'SendGrid',
    apiCell3Desc: 'Correo transaccional que llega a la bandeja de entrada.',
    apiCell3ExA: 'recibo → entregado',
    apiCell3ExB: 'restablecer clave → enviado',
    apiCell4Name: 'Google Maps',
    apiCell4Desc: 'Geocodificación, rutas y lugares para cualquier dirección.',
    apiCell4ExA: 'dirección → lat, lng',
    apiCell4ExB: 'ruta → 24 min',
    apiCell5Name: 'AWS S3',
    apiCell5Desc: 'Almacenamiento de objetos para cualquier cosa, de cualquier tamaño.',
    apiCell5ExA: 'informe.pdf → subido',
    apiCell5ExB: 'url prefirmada → lista',
    apiCell6Name: 'GitHub',
    apiCell6Desc: 'Repositorios, pull requests y automatización de versiones.',
    apiCell6ExA: 'pr #412 → fusionado',
    apiCell6ExB: 'v2.1 → publicada',
    apiCell7Name: 'Slack',
    apiCell7Desc: 'Mensajes, canales y alertas de flujo de trabajo.',
    apiCell7ExA: 'alerta → #ops',
    apiCell7ExB: 'resumen → #general',
    apiCell8Name: 'Más APIs',
    apiCell8Desc: 'El índice va mucho más allá de esta página, clasificado con métricas siempre al día.',
    apiCell8ExA: 'pide cualquier api',
    apiCell8ExB: 'clasificada y enrutada',
    compilerTitle: 'Una biblioteca personal y autooptimizable, hecha a la medida de tu empresa',
    compilerBody:
      'Tu equipo ya escribe small software, los scripts puntuales que cada proyecto deja atrás. Anteon lo compila en motores versionados que toda la empresa comparte, y los mismos KPI auditables demuestran cómo se amortiza solo.',
    smallSoftware: 'Small software, explicado',
    footerTag: 'Los problemas resueltos deberían seguir resueltos',
    company: 'Empresa',
    legal: 'Legal',
    about: 'Nosotros',
    blog: 'Blog',
    contact: 'Contacto',
    privacy: 'Privacidad',
    terms: 'Términos',
    cookiePolicy: 'Política de cookies',
    theme: 'Tema',
    themeSystem: 'Tema del sistema',
    themeLight: 'Tema claro',
    themeDark: 'Tema oscuro',
    rights: '© 2026 Anteon. Todos los derechos reservados.',
    ariaChangeLanguage: 'Cambiar idioma',
    ariaMenu: 'Menú',
    metaDescription: 'Si he visto más lejos, es porque me he subido a hombros de gigantes.',
    diagramLabel: 'Biblioteca de conocimiento de la firma',
    withAnteon: 'Con Anteon',
    withoutAnteon: 'Sin Anteon',
    apiCost: 'Costo de API: $',
    apiCostSeed: 'Costo de API: $0.00',
    demoFastForward: 'Avance rápido',
    demoPlayAgain: 'Reproducir de nuevo',
    demoPrompt:
      'Convierte la hoja de datos de proveedores del Q2 a CSV, dame los totales de gasto por proveedor con la variación frente al Q1, y comprueba si la política exige una auditoría del equipo de compras.',
    demoATool1: 'motor · base de datos',
    demoAOut1: 'supplier_q2 obtenido de la base de datos de la empresa',
    demoATool2: 'motor · convertir',
    demoAOut2: 'convertido → supplier_q2.csv',
    demoATool3: 'motor · operaciones tabulares',
    demoAOut3: 'totales: 14 proveedores · $2,418,644',
    demoAOut4: 'variación frente al Q1: +4.2%',
    demoATool4: 'motor · escaneo de base de datos de políticas',
    demoAOut5: 'auditoría requerida → sí, §7.2(b), Política de Auditoría de Proveedores',
    demoASay1:
      'Listo, supplier_q2 está convertido. Se requiere una auditoría según §7.2(b), Política de Auditoría de Proveedores.',
    demoBSay1: 'Primero déjame buscar la hoja de datos del Q2…',
    demoBWork1: 'Buscando archivos…',
    demoBSay2: 'La encontré. Ahora convierto el formato del archivo…',
    demoBWork2: 'Convirtiendo…',
    demoBSay3: 'Ahora déjame agrupar los datos y hacer los cálculos…',
    demoBWork3: 'Calculando…',
    demoBSay4: 'Buscando en tu escritorio las directrices de la empresa…',
    demoBWork4: 'Buscando…',
    demoBFail1: 'No pude encontrar el documento de la política.',
    demoBSay5: '¿Podrías subir el archivo de directrices?',
    demoBUser1: 'vendor_audit_guideline.pdf adjuntado',
    demoBSay6: 'Leyendo vendor_audit_guideline.pdf…',
    demoBWork5: 'Leyendo…',
    demoBSay7: 'Comprobando qué secciones aplican a compras…',
    demoBWork6: 'Comprobando…',
    demoBSay8:
      'Todo terminado. supplier_q2.csv está listo, los totales de gasto y la variación ya están calculados, y se requiere una auditoría del equipo de compras según §7.2(b), Política de Auditoría de Proveedores.',
    authEmailLabel: 'Correo electrónico',
    authPasswordLabel: 'Contraseña',
    signinTitle: 'Iniciar sesión',
    signinSubtitle: 'Te damos la bienvenida de nuevo. Inicia sesión y continúa donde lo dejaste.',
    signinForgot: '¿Olvidaste tu contraseña?',
    rememberMe: 'Recuérdame',
    signinSubmit: 'Iniciar sesión',
    signinNoAccount: '¿Primera vez aquí?',
    signinNoAccountLink: 'Crea una cuenta',
    signupTitle: 'Crea tu cuenta',
    signupSubtitle: 'Empieza con más de 1.000 motores deterministas y una biblioteca que crece con tu empresa.',
    signupSubmit: 'Crear cuenta',
    signupHaveAccount: '¿Ya tienes una cuenta?',
    signupHaveAccountLink: 'Iniciar sesión',
    forgotTitle: 'Restablece tu contraseña',
    forgotSubtitle: 'Introduce tu correo y te enviaremos un enlace para establecer una nueva contraseña.',
    forgotSubmit: 'Enviar enlace de restablecimiento',
    forgotBackToSignin: 'Volver a iniciar sesión',
    ariaClose: 'Cerrar',
  },
};

function build(locale: Locale): Catalog {
  const film = FILM_COPY[locale];
  return {
    ...CHROME[locale],
    quoteText: film.quote.text,
    quoteAttribution: film.quote.attribution,
    ...film.captions,
  };
}

export const CATALOGS: Record<Locale, Catalog> = {
  en: build('en'),
  es: build('es'),
};
