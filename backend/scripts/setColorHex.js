/**
 * Maps every product variant's color string to a colorHex value.
 * Non-colors (perfume names, pattern names, brand names) → null (no hex set).
 * Multi-color combos → primary (first) color's hex.
 */

const mongoose = require('mongoose');

const ATLAS_URI =
  'mongodb+srv://jrwaldehzx:NWXdpyCMP7yB7a4N@cluster0.ukrr40p.mongodb.net/kentaz?retryWrites=true&w=majority';

// null = no single representative color (pattern, perfume name, etc.)
const COLOR_MAP = {
  // ── Blacks ──────────────────────────────────────────────────────────────
  'BLACK':                                    '#000000',
  'BLAC':                                     '#000000',
  'BLAK':                                     '#000000',
  'BLCK':                                     '#000000',
  'PLAIN BLACK':                              '#000000',
  'SATIN BLACK':                              '#000000',
  'PATENT BLACK':                             '#000000',
  'METALLIC BLACK':                           '#000000',
  'FADED BLACK':                              '#1C1C1C',
  'SIYAH BLACK':                              '#000000',
  'BLACK MESH':                               '#000000',
  'BLACK STRETCH':                            '#000000',
  'BLACK STRIPED':                            '#000000',
  'BLACK PRINT':                              '#000000',
  'BLACK PRINT PUFF':                         '#000000',
  'BLACK SINGLE BUTTON':                      '#000000',
  'PARTTERNED BLACK':                         '#000000',
  'BACK':                                     '#000000',

  // ── Whites ───────────────────────────────────────────────────────────────
  'WHITE':                                    '#FFFFFF',
  'WHITEE':                                   '#FFFFFF',
  'OFF WHITE':                                '#FAF9F6',
  'OFFWHITE':                                 '#FAF9F6',
  'MILK':                                     '#FDFCFB',
  'WHITE SINGLE BUTTON':                      '#FFFFFF',
  'WHITE MERYEM':                             '#FFFFFF',
  'CARMEL WHITE':                             '#FAF9F6',

  // ── Reds & Pinks ─────────────────────────────────────────────────────────
  'RED':                                      '#DC143C',
  'PLAIN RED':                                '#DC143C',
  'PATENT RED':                               '#DC143C',
  'PATERN RED':                               '#DC143C',
  'RED XXL':                                  '#DC143C',
  'RED STONE NECK':                           '#DC143C',
  'HOT PINK':                                 '#FF69B4',
  'PINK':                                     '#FFC0CB',
  'BABY PINK':                                '#F4C2C2',
  'LIGHT PINK':                               '#FFB6C1',
  'SINPINK':                                  '#FFC0CB',
  'PINK STRIPED':                             '#FFC0CB',
  'PINK STRIPPED':                            '#FFC0CB',

  // ── Burgundy / Wine / Oxblood ─────────────────────────────────────────────
  'BURGUNDY':                                 '#800020',
  'WINE':                                     '#722F37',
  'OX BLOOD':                                 '#800000',
  'OX BLOOD PLAIN':                           '#800000',
  'OXBLOOD':                                  '#800000',

  // ── Purple / Lilac / Mauve ────────────────────────────────────────────────
  'PURPLE':                                   '#800080',
  'DARK PURPLE':                              '#4B0082',
  'DOT PURPLE':                               '#800080',
  'LILAC':                                    '#C8A2C8',
  'MAUVE':                                    '#E0B0FF',
  'MAJENTA':                                  '#FF00FF',
  'MAJENTA, 1':                               '#FF00FF',
  'MORDOM PLUM':                              '#8E4585',
  'MINK':                                     '#AC9482',

  // ── Blues ─────────────────────────────────────────────────────────────────
  'BLUE':                                     '#0047AB',
  'DARK BLUE':                                '#00008B',
  'NAVY BLUE':                                '#000080',
  'NAVY':                                     '#000080',
  'ROYAL BLUE':                               '#4169E1',
  'SKY BLUE':                                 '#87CEEB',
  'DUSTY BLUE':                               '#7393B3',
  'LIGHT BLUE':                               '#ADD8E6',
  'PLAIN LIGHT BLUE':                         '#ADD8E6',
  'PLAIN BLUE / LINE POCKET':                 '#0047AB',
  'TORQUISE BLUE':                            '#40E0D0',
  'TURQUOISE BLUE':                           '#40E0D0',
  'AGRO BLUE':                                '#0047AB',
  'DOT BLUE':                                 '#0047AB',
  'PATTERN BLUE':                             '#0047AB',
  'BLUE MILD':                                '#6699CC',
  'BLUE MESH':                                '#0047AB',
  'BLUE STRIPED':                             '#0047AB',
  'BROCADE SKY BLUE':                         '#87CEEB',
  'BLUE BETTY':                               '#0047AB',
  'BLUE STRAP':                               '#0047AB',
  'BLUE FLOWERY':                             '#0047AB',
  'BLUE FLOWERY, SILVER':                     '#0047AB',
  'BLUE MILD RIPPED/GOLD':                    '#6699CC',
  'BLUE RIPPED CONTRAST MESH':                '#0047AB',
  'BLUE, 4':                                  '#0047AB',
  'NAVY BLUE WITH FLANK':                     '#000080',
  'SKY BLUE & WHITE':                         '#87CEEB',
  'SKY BLUE STRIPED WITH LINE POCKET':        '#87CEEB',
  'SKY BLUE STRIPED/WHITE':                   '#87CEEB',
  'LIGHT BLUE DOTED WHITE':                   '#ADD8E6',

  // ── Greens ────────────────────────────────────────────────────────────────
  'GREEN':                                    '#228B22',
  'DARK GREEN':                               '#006400',
  'LIGHT GREEN':                              '#90EE90',
  'OLIVE GREEN':                              '#6B8E23',
  'ARMY GREEN':                               '#4B5320',
  'MATTE GREEN':                              '#4E6B3E',
  'MUSTARD GREEN':                            '#6B8C21',
  'LEMON GREEN':                              '#8DB600',
  'LIGHT SAGE GREEN':                         '#BCB88A',
  'OFF GREEN':                                '#6B8E23',
  'GRENN':                                    '#228B22',
  'GREENISH BLCK':                            '#2D4A2D',
  'SEA GREEN':                                '#2E8B57',
  'GREEN STONE NECK':                         '#228B22',
  'GREEN IRISH TWEED':                        '#228B22',
  'GREEN ANIMA':                              '#228B22',
  'GREEN, 2':                                 '#228B22',

  // ── Yellows / Oranges / Gold ──────────────────────────────────────────────
  'YELLOW':                                   '#FFD700',
  'LEMON':                                    '#FFF44F',
  'LEMON & WHITE':                            '#FFF44F',
  'ORANGE':                                   '#FFA500',
  'BURNT ORANGE':                             '#CC5500',
  'BUNT ORANGE':                              '#CC5500',
  'BONT ORANGE':                              '#CC5500',
  'GOLD':                                     '#FFD700',
  'ABSOLUTELY GOLD':                          '#FFD700',

  // ── Browns / Neutrals ─────────────────────────────────────────────────────
  'BROWN':                                    '#A52A2A',
  'DARK BROWN':                               '#5C4033',
  'DARCK BROWN':                              '#5C4033',
  'DARK BROWN, 23XL':                         '#5C4033',
  'LIGHT BROWN':                              '#C4A882',
  'PLAIN BROWN':                              '#A52A2A',
  'CHOCOLATE':                                '#D2691E',
  'CHOCOLATE BROWN':                          '#D2691E',
  'COFFEE BROWN':                             '#6F4E37',
  'GOLDEN BROWN':                             '#996515',
  'GOLDEN BROWN BROWN':                       '#996515',
  'BRONZE':                                   '#CD7F32',
  'BURNT BROWN':                              '#8B4513',
  'BROW':                                     '#A52A2A',
  'SEQUIN/BROWN':                             '#A52A2A',
  'SPORTED DOT BROWN':                        '#A52A2A',
  'CARAMEL OXBLOOD':                          '#800000',

  // ── Greys / Ash ───────────────────────────────────────────────────────────
  'GREY':                                     '#808080',
  'GRAY':                                     '#808080',
  'ASH':                                      '#B2BEB5',
  'DARK ASH':                                 '#696969',
  'DAARK ASH':                                '#696969',
  'HEATHER GREY':                             '#8E8E93',
  'ASH TINY STRIPED DOUBLE BREASTED':         '#B2BEB5',
  'ASH TINY STRIPED DOUBLE BRESTED':          '#B2BEB5',
  'ASH & TROUSER BLACKLNED POCKET':           '#B2BEB5',

  // ── Metallics ─────────────────────────────────────────────────────────────
  'SILVER':                                   '#C0C0C0',
  'SILVE':                                    '#C0C0C0',
  'PLATINUM':                                 '#E5E4E2',

  // ── Creams / Beiges / Neutrals ────────────────────────────────────────────
  'CREAM':                                    '#FFFDD0',
  'BEIGE':                                    '#F5F5DC',
  'BIEGE':                                    '#F5F5DC',
  'KHAKI':                                    '#C3B091',
  'ONION':                                    '#E8CDAD',
  'PEACH':                                    '#FFCBA4',
  'CARTON COLOR':                             '#D2B48C',
  'CARTON COLOR FLOWERY':                     '#D2B48C',
  'CARTON COLOR STRIPED':                     '#D2B48C',
  'CATON':                                    '#D2B48C',

  // ── Multi-color combos (primary color hex) ────────────────────────────────
  'BLACK/WHITE':                              '#000000',
  'WHITE/BLACK':                              '#000000',
  'BLACK & WHITE':                            '#000000',
  'WHITE & BLACK':                            '#000000',
  'BLACK&WHITE':                              '#000000',
  'WHITE AND BLACK':                          '#000000',
  'BLACK N WHITE':                            '#000000',
  'WHITE /BLACK':                             '#000000',
  'WHITE& BLACK':                             '#000000',
  'BLACK / GREY':                             '#000000',
  'BLACK GREY':                               '#000000',
  'GREY/BLACK':                               '#808080',
  'BLACK/BROWN':                              '#000000',
  'BLACK/GOLD':                               '#000000',
  'BLACK & GOLD':                             '#000000',
  'BLACK/SILVER':                             '#000000',
  'BLACK&SILVER':                             '#000000',
  'BLACK SHINNY/ SILVER':                     '#000000',
  'BLACK SHINNY/ SILVER STONED O WRIST/WAIST':'#000000',
  'BLACK & BROWN':                            '#000000',
  'BLACK & RED':                              '#000000',
  'BLACK/RED':                                '#000000',
  'BLACK / RED':                              '#000000',
  'BLACK & FLOWERY':                          '#000000',
  'BLACK&FLOWERY':                            '#000000',
  'BLACK/PINK':                               '#000000',
  'BLACK / PINK':                             '#000000',
  'BLACK /PINK':                              '#000000',
  'BLACK/GREEN':                              '#000000',
  'BLACK&GREEN':                              '#000000',
  'BLACK/ ORANGE ZIPPER':                     '#000000',
  'BLACK/ORANGE ZIPER':                       '#000000',
  'BLACK/ WHITE DOT':                         '#000000',
  'BLACK/PEACH':                              '#000000',
  'BLACK/GOLD STRAP':                         '#000000',
  'BLACK/YELLOW COLAR':                       '#000000',
  'BLACK1BROWN':                              '#000000',
  'BLACK/BROWN/ASH':                          '#000000',
  'BLACK/COLORED STONED':                     '#000000',
  'BLACK W BLUE FLOWERY':                     '#000000',
  'BLACK/WHITE LACED POCKET':                 '#000000',
  'BLACK/WHITE STONE':                        '#000000',
  'BLACK/WHITE STRECHY':                      '#000000',
  'BLACK, 5':                                 '#000000',
  'BLACK/ HEAD SET':                          '#000000',
  'SUEDE/BLACK':                              '#000000',
  'AMY BYER BLACK N RED':                     '#000000',
  'GRAPHIC BLACK/WHITE':                      '#000000',
  'SNAK SKIN':                                '#8B7355',
  'WHITE/BLUE':                               '#FFFFFF',
  'WHITE/PINK':                               '#FFFFFF',
  'WHITE/RED':                                '#FFFFFF',
  'WHITE/BLACK STONE':                        '#FFFFFF',
  'WHITE/GOLD':                               '#FFFFFF',
  'WHITE/GRAY':                               '#FFFFFF',
  'WHITE/SILVER':                             '#FFFFFF',
  'WHITE/BROWN':                              '#FFFFFF',
  'WHITE/BROWN BROWN':                        '#FFFFFF',
  'WHITE/GREEN/PINK':                         '#FFFFFF',
  'WHITE/BLUE FLOWERY':                       '#FFFFFF',
  'WHITE & BLACK STRIPPED':                   '#FFFFFF',
  'WHITE & BROWN':                            '#FFFFFF',
  'WHITE & MULTICOLOR':                       '#FFFFFF',
  'WHITE & PINK':                             '#FFFFFF',
  'WHITE& FLOWERING':                         '#FFFFFF',
  'WHITE&GREEN':                              '#FFFFFF',
  'WHITE BLAZER & BLACK':                     '#FFFFFF',
  'WHITE SPOTTED DUST BROWN':                 '#FFFFFF',
  'WHITE WITH DESIGN':                        '#FFFFFF',
  'WHITE WITH PRINT':                         '#FFFFFF',
  'WHITEPINK/BLACK':                          '#FFFFFF',
  'BROWN/ASH':                                '#A52A2A',
  'BROWN/GREEN':                              '#A52A2A',
  'BROWN/WHITE COLLAR':                       '#A52A2A',
  'BROWN & BLACK':                            '#A52A2A',
  'BROWN & CREAM':                            '#A52A2A',
  'BROWN/SILVER':                             '#A52A2A',
  'BROWN/BLACK':                              '#A52A2A',
  'BOWN/BLACK':                               '#A52A2A',
  'RED/BLACK':                                '#DC143C',
  'RED&BLACK':                                '#DC143C',
  'RED N BLACK':                              '#DC143C',
  'RED/BLUE':                                 '#DC143C',
  'RED/BLUE STRAP':                           '#DC143C',
  'RED/BLUE DESIGN':                          '#DC143C',
  'RED&BLUE STRIPED':                         '#DC143C',
  'RED/BLACK DESIGN':                         '#DC143C',
  'RED/WINE DESIGN':                          '#722F37',
  'RED/GREEN':                                '#DC143C',
  'BLUE/BLACK':                               '#0047AB',
  'BLUE/BROWN':                               '#0047AB',
  'BLUE/GREEN':                               '#0047AB',
  'BLUE/PINK':                                '#0047AB',
  'BLUE/WHITE':                               '#0047AB',
  'BLUE & RED':                               '#0047AB',
  'BLUE/WHITE SPORT':                         '#0047AB',
  'NAVY BLUE/PINK':                           '#000080',
  'NAVY BLUE/SKY BLUE DESIGN':                '#000080',
  'GREEN/WHITE':                              '#228B22',
  'GREEN/WHITE DESIN':                        '#228B22',
  'GREEN/YELLOW':                             '#228B22',
  'GREEN/ANIMAL PRINT':                       '#228B22',
  'GREEN/GOLD/WINE':                          '#228B22',
  'GREEN/BLACK':                              '#228B22',
  'GREY & BLUE TINY STRIPED':                 '#808080',
  'GREY & PINK LITTLE STRIPED':               '#808080',
  'GREY /BOLD STRIPED':                       '#808080',
  'GREY BOLD STRIPED':                        '#808080',
  'GREY&WHIE':                                '#808080',
  'PINK & BLUE STRIPED':                      '#FFC0CB',
  'PINK&VIOLET':                              '#FFC0CB',
  'PINK/OFF WHITE':                           '#FFC0CB',
  'PINK/WHITE/BLACK':                         '#FFC0CB',
  'PINK/BLACK':                               '#FFC0CB',
  '\\PINK/BLACK':                             '#FFC0CB',
  'LIGHT PINK & ORANGE':                      '#FFB6C1',
  'GOLD/PEARL':                               '#FFD700',
  'GOLD/PINK':                                '#FFD700',
  'GOLD/RED':                                 '#FFD700',
  'GOLD/SILVER':                              '#FFD700',
  'GOLD/WHITE':                               '#FFD700',
  'GOLD/BLACK':                               '#FFD700',
  'SILVER & PURPLE':                          '#C0C0C0',
  'SILVER & PURPLE STRIPED':                  '#C0C0C0',
  'ASH/PINK':                                 '#B2BEB5',
  'OFF WHITE/ASH':                            '#FAF9F6',
  'BEIGE&FLOWERY':                            '#F5F5DC',
  'BEIGE/SPORTED BLACK':                      '#F5F5DC',
  'ORANGE & BLACK':                           '#FFA500',
  'ORANGE/WHITE':                             '#FFA500',
  'ORANGE/YELLOW':                            '#FFA500',
  'YELLOW&PURPLE':                            '#FFD700',
  'YELLOW/BLUE':                              '#FFD700',
  'YELLOW/SILVER':                            '#FFD700',
  'ONION & NAVY BLUE':                        '#E8CDAD',
  'PEACH & BLACK':                            '#FFCBA4',
  'PURPLE & BROWN':                           '#800080',
  'PRPLE/BLUE':                               '#800080',
  'FLOWERY PURPLE MESH':                      '#800080',

  // ── Patterns / prints → null ──────────────────────────────────────────────
  'ANIMAL PRINT':                             null,
  'ANIMAL SKIN':                              null,
  'BLACK ANIMAL PRINT':                       null,
  'LEOPARD':                                  null,
  'LEOPARD PRINT':                            null,
  'TIGER PRINT':                              null,
  'TIGER FACE':                               null,
  'ZEBRA':                                    null,
  'FLORAL':                                   null,
  'COLORFUL':                                 null,
  'COLORS':                                   null,
  'MULTI COLOR':                              null,
  'MULTI COLORED':                            null,
  'MULTI COLORS':                             null,
  'MULTICOLOR':                               null,
  'MULTICOLORED':                             null,
  'EGYPTIAN PRINT':                           null,
  'PRINT SAINT DANN CULTURE':                 null,
  'PAPAER PRINT':                             null,

  // ── Perfume / brand / descriptor → null ──────────────────────────────────
  '.':                                        null,
  'AH SUIT':                                  null,
  'BATH BUBBLES':                             null,
  'BROOCH':                                   null,
  'D DON':                                    null,
  'FASHION CLASSIC':                          null,
  'FOREVER':                                  null,
  'FOREVER 21':                               null,
  'HER':                                      null,
  'INTENSE':                                  null,
  'INTENSE LEATHER':                          null,
  'INTERLUDE MAN':                            null,
  'IRISH LEATHER':                            null,
  'ITALIAN LEATHER':                          null,
  'JUBILATION':                               null,
  'LAULIA':                                   null,
  'LIBRARY COLLECTION':                       null,
  'LIV':                                      null,
  'LUX TEES':                                 null,
  'MEN':                                      null,
  'OASIS':                                    null,
  'OUD':                                      null,
  'RECKLESS LEATHER':                         null,
  'RING FOR ATTENTION':                       null,
  'SPICY LEATHER':                            null,
  'WOMAN':                                    null,
  'WOMEN':                                    null,
};

function lookup(color) {
  if (!color) return undefined;
  const key = color.trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(COLOR_MAP, key)) {
    return COLOR_MAP[key]; // may be null (pattern/perfume — intentional)
  }
  return undefined; // truly unmapped
}

async function run() {
  console.log('Connecting to Atlas...');
  await mongoose.connect(ATLAS_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const products = await db.collection('products').find({}).toArray();
  console.log(`Processing ${products.length} products...\n`);

  let updatedProducts = 0;
  let updatedVariants = 0;
  const unmapped = new Set();

  for (const product of products) {
    if (!product.variants?.length) continue;

    let changed = false;
    const newVariants = product.variants.map(v => {
      const hex = lookup(v.color);
      if (hex === undefined) {
        if (v.color) unmapped.add(v.color.trim().toUpperCase());
        return v;
      }
      changed = true;
      updatedVariants++;
      return { ...v, colorHex: hex };
    });

    if (changed) {
      await db.collection('products').updateOne(
        { _id: product._id },
        { $set: { variants: newVariants } }
      );
      updatedProducts++;
    }
  }

  console.log(`Updated: ${updatedProducts} products, ${updatedVariants} variants`);

  if (unmapped.size > 0) {
    console.log(`\nUnmapped colors (${unmapped.size}) — need manual review:`);
    [...unmapped].sort().forEach(c => console.log('  -', c));
  } else {
    console.log('\nAll colors mapped successfully.');
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
