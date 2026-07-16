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
  apiKey: string;
  pricing: string;
  support: string;
  bookCall: string;
  /* The film's skip control. */
  skipFilm: string;
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
  /* The library section: heading and lede, then a 16-cell grid of deterministic
     work. Each cell carries a name, a one-line description, and two mono
     examples (ExA at rest, ExB on hover). Cells 15 and 16 are the boundary and
     the buy-not-build case. */
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
  /* The compiler section: heading, lede, and the three steps. */
  compilerTitle: string;
  compilerBody: string;
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
    product: 'Product',
    megaEnginesTitle: 'Engine database',
    megaEnginesSub: '1,000+ deterministic engines and the intelligence layer that guides your AI to call them',
    megaApisTitle: 'API database',
    megaApisSub: 'A hand-vetted, continuously updated index of the top APIs on the internet',
    megaLibraryTitle: 'Personal database',
    megaLibrarySub: 'Unique engines, compiled from your firm\u2019s unique work and shared across your team',
    explore: 'Explore further',
    apiKey: 'API key',
    pricing: 'Pricing',
    support: 'Support',
    bookCall: 'Book a call',
    skipFilm: 'Skip the film',
    heroLead: 'Stop wasting',
    heroTail: 'on solved problems',
    heroWheel1: 'tokens',
    heroWheel2: 'time',
    heroWheel3: 'manpower',
    heroWheel4: 'cash',
    heroWheel5: 'effort',
    siteNote: 'The site begins here.',
    heroSub:
      "Your AI rebuilds solved algorithms, uses them once, and trashes them. Anteon preloads 1,000+ and grows your firm's own proprietary library.",
    mediaStripLabel: 'Team from',
    libraryTitle: '1,000+ preloaded engines and the',
    libraryTitle2: 'framework to call them',
    libraryBody:
      'There are thousands of tasks that are deterministic and should invoke a pre-written algorithm. Yet modern AI systems continue to reinvent them from scratch, often inaccurately, and discard the result immediately after one use. Anteon preloads 1,000+ engines and trains your AI to call them intelligently, so every request runs faster, breaks less, and costs less.',
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
    apiIndexTitle: 'A continuously updated index',
    apiIndexTitle2: 'of the top APIs on the internet',
    apiIndexLede:
      'Not everything deserves a new engine. Anteon collates the internet\u2019s best APIs, ranks them with its own quality metrics, and when your AI is about to build something an API already does, recommends the right one.',
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
      'Anteon compiles unique algorithms from the work your firm actually does and shares them across every employee. The library grows continuously, and a backend tracks usage and KPIs so you can watch it pay for itself.',
    footerTag: 'Your AI shouldn’t stand alone.',
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
  },
  es: {
    product: 'Producto',
    megaEnginesTitle: 'Base de datos de motores',
    megaEnginesSub: 'Más de 1.000 motores deterministas y la capa de inteligencia que guía a tu IA para llamarlos',
    megaApisTitle: 'Base de datos de API',
    megaApisSub: 'Un índice verificado a mano y siempre al día de las mejores API de internet',
    megaLibraryTitle: 'Base de datos personal',
    megaLibrarySub: 'Motores únicos, compilados desde el trabajo único de tu empresa y compartidos con tu equipo',
    explore: 'Explorar más',
    apiKey: 'Clave de API',
    pricing: 'Precios',
    support: 'Soporte',
    bookCall: 'Reserva una llamada',
    skipFilm: 'Salta la película',
    heroLead: 'Deja de gastar',
    heroTail: 'en problemas resueltos',
    heroWheel1: 'tokens',
    heroWheel2: 'tiempo',
    heroWheel3: 'personal',
    heroWheel4: 'dinero',
    heroWheel5: 'esfuerzo',
    siteNote: 'Aquí empieza el sitio.',
    heroSub:
      'Tu IA reconstruye algoritmos resueltos, los usa una vez y los tira. Anteon precarga 1.000+ y cultiva la biblioteca propietaria de tu empresa.',
    mediaStripLabel: 'Equipo formado en',
    libraryTitle: 'Más de 1.000 motores precargados y el',
    libraryTitle2: 'marco para llamarlos',
    libraryBody:
      'Hay miles de tareas que son deterministas y deberían invocar un algoritmo ya escrito. Aun así, los sistemas de IA modernos siguen reinventándolas desde cero, a menudo con errores, y descartan el resultado tras un solo uso. Anteon precarga más de 1.000 motores y entrena a tu IA para llamarlos con inteligencia, de modo que cada petición es más rápida, falla menos y cuesta menos.',
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
    apiIndexTitle: 'Un índice en continua actualización',
    apiIndexTitle2: 'de las principales API de internet',
    apiIndexLede:
      'No todo merece un motor nuevo. Anteon reúne las mejores API de internet, las clasifica con sus propias métricas de calidad y, cuando tu IA está a punto de construir algo que una API ya hace, te recomienda la adecuada.',
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
    apiCell8Name: 'More APIs',
    apiCell8Desc: 'El índice va mucho más allá de esta página, clasificado con métricas siempre al día.',
    apiCell8ExA: 'pide cualquier api',
    apiCell8ExB: 'clasificada y enrutada',
    compilerTitle: 'Una biblioteca personal y autooptimizable, hecha a la medida de tu empresa',
    compilerBody:
      'Anteon compila algoritmos únicos a partir del trabajo real de tu empresa y los comparte con todos tus empleados. La biblioteca crece sin parar, y un backend registra el uso y los KPI, para que veas cómo se amortiza sola.',
    footerTag: 'Tu IA no debería estar sola.',
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
