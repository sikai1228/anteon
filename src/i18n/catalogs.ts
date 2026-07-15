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
  /* The index section: heading and its short body. */
  indexTitle: string;
  indexBody: string;
  /* The compiler section: heading, lede, and the three steps. */
  compilerTitle: string;
  compilerBody: string;
  compilerStep1Title: string;
  compilerStep1Body: string;
  compilerStep2Title: string;
  compilerStep2Body: string;
  compilerStep3Title: string;
  compilerStep3Body: string;
  /* The footer: tagline, the three column headings and their links, and the
     rights line. The Product column reuses product/pricing/support/bookCall. */
  footerTag: string;
  company: string;
  legal: string;
  about: string;
  blog: string;
  contact: string;
  credits: string;
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
      "Your AI rebuilds solved algorithms, uses them once, and trashes them. Antaeon preloads 1,000+ and grows your firm's own proprietary library.",
    mediaStripLabel: 'Team from',
    libraryTitle: '1,000+ preloaded engines',
    libraryTitle2: 'and the intelligence framework to call them',
    libraryBody:
      'There are thousands of tasks that are deterministic and should invoke a pre-written algorithm. Yet modern AI systems continue to reinvent them from scratch, often inaccurately, and discard the result immediately after one use. Antaeon preloads 1,000+ engines and trains your AI to call them intelligently, so every request runs faster, breaks less, and costs less.',
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
    cell16Name: 'Already solved elsewhere',
    cell16Desc: 'When the deterministic answer exists behind an API, we route to it instead of building it.',
    cell16ExA: '→ existing API',
    cell16ExB: '→ a payments API',
    indexTitle: 'Never build what someone already sells',
    indexBody:
      'A curated index of existing APIs sits alongside the library. When a service already does the job, Antaeon points you to it instead of asking you to build it again.',
    compilerTitle: 'The compiler makes the library yours',
    compilerBody:
      'A just-in-time compiler speeds up the paths a program runs most. Antaeon does the same for your AI, turning your hottest paths into engines that are yours alone.',
    compilerStep1Title: 'Watch',
    compilerStep1Body: 'It watches your live traffic, call by call.',
    compilerStep2Title: 'Find',
    compilerStep2Body: 'It finds the hot paths you hit again and again.',
    compilerStep3Title: 'Extend',
    compilerStep3Body: 'It extends the library with engines that are yours alone.',
    footerTag: 'Your AI shouldn’t stand alone.',
    company: 'Company',
    legal: 'Legal',
    about: 'About',
    blog: 'Blog',
    contact: 'Contact',
    credits: 'Credits',
    privacy: 'Privacy',
    terms: 'Terms',
    cookiePolicy: 'Cookie policy',
    theme: 'Theme',
    themeSystem: 'System theme',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    rights: '© 2026 Antaeon. All rights reserved.',
    ariaChangeLanguage: 'Change language',
    metaDescription: 'If I have seen further, it is by standing on the shoulders of Giants.',
  },
  es: {
    product: 'Producto',
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
      'Tu IA reconstruye algoritmos resueltos, los usa una vez y los tira. Antaeon precarga 1.000+ y cultiva la biblioteca propietaria de tu empresa.',
    mediaStripLabel: 'Equipo formado en',
    libraryTitle: 'Más de 1.000 motores precargados',
    libraryTitle2: 'y el marco de inteligencia para llamarlos',
    libraryBody:
      'Hay miles de tareas que son deterministas y deberían invocar un algoritmo ya escrito. Aun así, los sistemas de IA modernos siguen reinventándolas desde cero, a menudo con errores, y descartan el resultado tras un solo uso. Antaeon precarga más de 1.000 motores y entrena a tu IA para llamarlos con inteligencia, de modo que cada petición es más rápida, falla menos y cuesta menos.',
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
    cell16Name: 'Ya resuelto fuera',
    cell16Desc: 'Cuando la respuesta determinista existe tras una API, la enrutamos en lugar de construirla.',
    cell16ExA: '→ existing API',
    cell16ExB: '→ a payments API',
    indexTitle: 'Nunca construyas lo que alguien ya vende',
    indexBody:
      'Junto a la biblioteca hay un índice curado de APIs que ya existen. Cuando un servicio ya hace el trabajo, Antaeon te lo indica en lugar de pedirte que lo construyas otra vez.',
    compilerTitle: 'El compilador hace tuya la biblioteca',
    compilerBody:
      'Un compilador just-in-time acelera las rutas que un programa ejecuta más. Antaeon hace lo mismo con tu IA, y convierte tus rutas más transitadas en motores que son solo tuyos.',
    compilerStep1Title: 'Observa',
    compilerStep1Body: 'Vigila tu tráfico en vivo, llamada por llamada.',
    compilerStep2Title: 'Encuentra',
    compilerStep2Body: 'Detecta las rutas que recorres una y otra vez.',
    compilerStep3Title: 'Amplía',
    compilerStep3Body: 'Extiende la biblioteca con motores que son solo tuyos.',
    footerTag: 'Tu IA no debería estar sola.',
    company: 'Empresa',
    legal: 'Legal',
    about: 'Nosotros',
    blog: 'Blog',
    contact: 'Contacto',
    credits: 'Créditos',
    privacy: 'Privacidad',
    terms: 'Términos',
    cookiePolicy: 'Política de cookies',
    theme: 'Tema',
    themeSystem: 'Tema del sistema',
    themeLight: 'Tema claro',
    themeDark: 'Tema oscuro',
    rights: '© 2026 Antaeon. Todos los derechos reservados.',
    ariaChangeLanguage: 'Cambiar idioma',
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
