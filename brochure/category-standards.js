/**
 * Category / product family standards & selling copy for sell sheets.
 * Keys match products.csv `sub_sub_category` values.
 */
export const CATEGORY_META = {
  'PVC Pipes': {
    slug: 'pvc-pipes',
    title: 'PVC Pipe',
    material: 'PVC',
    collection: 'PVC PIPE COLLECTION',
    hero: 'hero-pvc-pipes.jpg',
    heroCaption: 'SCH 40 SOLID & FOAM CORE',
    tagline: 'Schedule 40 solid & foam-core DWV pipe for drain, waste, and vent systems.',
    overview:
      'Contractor-grade PVC pipe for residential and commercial DWV and pressure applications. Solid-wall Sch 40 and cellular-core foam DWV constructions.',
    standards: [
      { code: 'ASTM D1785', name: 'Sch 40 Solid PVC Pressure Pipe' },
      { code: 'ASTM F891', name: 'Cellular Core (Foam) PVC DWV Pipe' },
      { code: 'NSF/ANSI 14', name: 'Plastic Piping System Components' },
    ],
    highlights: [
      { title: 'ASTM D1785', sub: 'Sch 40 Solid Wall' },
      { title: 'ASTM F891', sub: 'Foam Core DWV' },
      { title: 'Trade Sizes', sub: '½″ – 10″ Available' },
    ],
    construction: [
      { label: 'Material', value: 'PVC (polyvinyl chloride)' },
      { label: 'Solid Wall', value: 'ASTM D1785 Schedule 40' },
      { label: 'Foam Core', value: 'ASTM F891 Cellular Core DWV' },
      { label: 'Join Method', value: 'Solvent cement (hub)' },
      { label: 'Applications', value: 'DWV, drainage, vent' },
    ],
    applications: ['DWV systems', 'Drainage & vent', 'Above / below grade', 'Res & commercial'],
    notes: 'Confirm local code acceptance for foam-core DWV before install.',
  },
  'PVC Fittings': {
    slug: 'pvc-fittings',
    title: 'PVC DWV Fittings',
    material: 'PVC',
    collection: 'PVC DWV FITTINGS COLLECTION',
    hero: 'hero-pvc-fittings.jpg',
    heroCaption: 'HUB & STREET · SOLVENT WELD',
    tagline: 'Hub & street DWV fittings — elbows, tees, wyes, traps, adapters, and more.',
    overview:
      'Full line of PVC DWV fittings for solvent-cement joining: bends, sanitary tees, wyes, P-traps, couplings, bushings, caps, closet flanges, and cleanouts.',
    standards: [
      { code: 'ASTM D2665', name: 'PVC Plastic Drain, Waste & Vent Pipe and Fittings' },
      { code: 'ASTM D1785', name: 'Compatible with Sch 40 PVC pipe systems' },
      { code: 'NSF/ANSI 14', name: 'Plastic Piping System Components' },
    ],
    highlights: [
      { title: 'ASTM D2665', sub: 'DWV Fittings Spec' },
      { title: 'Hub & Street', sub: 'H × H / H × S Ends' },
      { title: '24 Types', sub: 'Elbows to Closet Flanges' },
    ],
    construction: [
      { label: 'Material', value: 'PVC DWV' },
      { label: 'Standard', value: 'ASTM D2665' },
      { label: 'Join Method', value: 'Solvent cement' },
      { label: 'End Styles', value: 'Hub (H) & Street (S)' },
      { label: 'Compatibility', value: 'Sch 40 PVC DWV pipe' },
    ],
    applications: ['Drain, waste & vent', 'Sanitary branches', 'Cleanouts & traps', 'Closet flanges'],
    notes: 'Hub (H) = socket; Street (S) = spigot. Use listed PVC cement.',
  },
  'Copper Pipes': {
    slug: 'copper-pipes',
    title: 'Copper Tube / Pipe',
    material: 'Copper',
    collection: 'COPPER TUBE COLLECTION',
    hero: 'hero-copper-pipes.jpg',
    heroCaption: 'TYPE K SOFT · TYPE L HARD',
    tagline: 'Type K soft and Type L hard copper water tube for potable and mechanical systems.',
    overview:
      'ASTM B88 copper water tube in Type K (soft) and Type L (hard) for potable water, hydronic, and mechanical piping.',
    standards: [
      { code: 'ASTM B88', name: 'Seamless Copper Water Tube (Types K & L)' },
      { code: 'NSF/ANSI 61', name: 'Drinking Water System Components' },
      { code: 'UPC / IPC', name: 'Recognized for potable water when listed' },
    ],
    highlights: [
      { title: 'ASTM B88', sub: 'Type K & Type L' },
      { title: 'Potable Rated', sub: 'NSF/ANSI 61' },
      { title: 'Trade Sizes', sub: '½″ – 2½″+' },
    ],
    construction: [
      { label: 'Material', value: 'Seamless copper water tube' },
      { label: 'Type K', value: 'Soft — thicker wall' },
      { label: 'Type L', value: 'Hard — indoor distribution' },
      { label: 'Standard', value: 'ASTM B88' },
      { label: 'Join Method', value: 'Solder / braze / press' },
    ],
    applications: ['Potable water', 'Hydronic heating', 'Mechanical piping', 'Repair & remodel'],
    notes: 'Type K for underground / severe service; Type L for indoor water.',
  },
  'Copper Fittings': {
    slug: 'copper-fittings',
    title: 'Copper Fittings',
    material: 'Copper',
    collection: 'COPPER FITTINGS COLLECTION',
    hero: 'hero-copper-fittings.jpg',
    heroCaption: 'WROUGHT · SOLDER JOINT',
    tagline: 'Wrought copper solder-joint fittings — elbows, tees, couplings, reducers, and adapters.',
    overview:
      'Wrought copper solder-joint pressure fittings for Type K and Type L tube: elbows, tees, reducing tees, couplings, reducers, stub-outs, and copper-to-PEX adapters.',
    standards: [
      { code: 'ASME B16.22', name: 'Wrought Copper & Copper Alloy Solder-Joint Pressure Fittings' },
      { code: 'ASTM B88', name: 'For use with copper water tube' },
      { code: 'NSF/ANSI 61', name: 'Drinking Water System Components (where listed)' },
    ],
    highlights: [
      { title: 'ASME B16.22', sub: 'Solder-Joint Spec' },
      { title: 'Type K & L', sub: 'Soft & Hard Families' },
      { title: 'Lead-Free', sub: 'Potable-Ready Joints' },
    ],
    construction: [
      { label: 'Material', value: 'Wrought copper / copper alloy' },
      { label: 'Standard', value: 'ASME B16.22' },
      { label: 'Join Method', value: 'Solder / braze' },
      { label: 'Families', value: 'Type K Soft · Type L Hard' },
      { label: 'Extras', value: 'Stub-outs · Cu-to-PEX adapters' },
    ],
    applications: ['Potable water', 'Branch & reducer runs', 'Remodel', 'Cu-to-PEX transitions'],
    notes: 'Use lead-free solder/flux for potable water per local code.',
  },
  'CPVC Pipes': {
    slug: 'cpvc-pipes',
    title: 'CPVC Pipe',
    material: 'CPVC',
    collection: 'CPVC PIPE COLLECTION',
    hero: 'hero-cpvc-pipes.jpg',
    heroCaption: 'SCH 80 · SDR-11 · SDR-13.5',
    tagline: 'Hot- and cold-water CPVC — Schedule 80 and ASTM D2846 SDR tubing.',
    overview:
      'CPVC pipe for hot and cold water: Schedule 80 and SDR-11 / SDR-13.5 CTS tubing to ASTM D2846.',
    standards: [
      { code: 'ASTM F441', name: 'CPVC Schedule 80 Plastic Pipe' },
      { code: 'ASTM D2846', name: 'CPVC Hot- and Cold-Water Distribution (SDR)' },
      { code: 'NSF/ANSI 61 & 14', name: 'Potable water & plastic piping components' },
    ],
    highlights: [
      { title: 'Hot & Cold', sub: 'Potable Distribution' },
      { title: 'ASTM D2846', sub: 'SDR-11 & 13.5 CTS' },
      { title: 'Sch 80', sub: 'ASTM F441 Pressure' },
    ],
    construction: [
      { label: 'Material', value: 'Chlorinated PVC (CPVC)' },
      { label: 'Sch 80', value: 'ASTM F441' },
      { label: 'SDR-11 / 13.5', value: 'ASTM D2846 CTS' },
      { label: 'Join Method', value: 'CPVC solvent cement' },
      { label: 'Service', value: 'Hot & cold potable water' },
    ],
    applications: ['Hot & cold water', 'Res & light commercial', 'CTS systems', 'Sch 80 pressure'],
    notes: 'SDR sizes listed as nominal × OD. Use temperature-rated CPVC cement.',
  },
  'PEX Pipes': {
    slug: 'pex-pipes',
    title: 'PEX-B Pipe',
    material: 'PEX',
    collection: 'PEX-B TUBE COLLECTION',
    hero: 'hero-pex-pipes.jpg',
    heroCaption: 'CROSSLINKED POLYETHYLENE',
    tagline: 'Crosslinked polyethylene (PEX-B) tubing for flexible potable water distribution.',
    overview:
      'PEX-B tubing for hot and cold potable water. Flexible, freeze-tolerant, compatible with listed PEX fitting systems.',
    standards: [
      { code: 'ASTM F876', name: 'Crosslinked Polyethylene (PEX) Tubing' },
      { code: 'ASTM F877', name: 'PEX Hot- and Cold-Water Distribution Systems' },
      { code: 'NSF/ANSI 61 & 14', name: 'Potable water & plastic piping' },
      { code: 'CSA B137.5', name: 'Crosslinked polyethylene (PEX) tubing systems' },
    ],
    highlights: [
      { title: 'ASTM F876/F877', sub: 'PEX Potable Tube' },
      { title: 'PEX-B Method', sub: 'Silane Crosslinked' },
      { title: 'Flexible', sub: 'Freeze-Tolerant Runs' },
    ],
    construction: [
      { label: 'Material', value: 'PEX-B (silane method)' },
      { label: 'Standards', value: 'ASTM F876 / F877' },
      { label: 'Listing', value: 'NSF/ANSI 61 & 14' },
      { label: 'Join Method', value: 'Listed PEX fittings' },
      { label: 'UV Note', value: 'Protect from sunlight' },
    ],
    applications: ['Potable distribution', 'Manifold / home-run', 'Retrofit', 'Radiant (where rated)'],
    notes: 'Match fittings, rings/clamps, and tools to the tubing listing.',
  },
  'PEX Fittings': {
    slug: 'pex-fittings',
    title: 'PEX Fittings',
    material: 'PEX',
    collection: 'PEX FITTINGS COLLECTION',
    hero: 'hero-pex-fittings.jpg',
    heroCaption: 'ELBOWS · REDUCERS',
    tagline: 'Elbows and reducers for PEX-B water distribution systems.',
    overview:
      'PEX system fittings for direction changes and size transitions with PEX-B tubing in potable water applications.',
    standards: [
      { code: 'ASTM F1807 / F2159', name: 'Metal insert & plastic PEX fittings (system-dependent)' },
      { code: 'ASTM F877', name: 'PEX Hot- and Cold-Water Distribution Systems' },
      { code: 'NSF/ANSI 61', name: 'Drinking Water System Components' },
    ],
    highlights: [
      { title: 'System Listed', sub: 'Match Tool & Tube' },
      { title: 'ASTM F877', sub: 'Distribution Systems' },
      { title: 'Potable', sub: 'NSF/ANSI 61' },
    ],
    construction: [
      { label: 'Use With', value: 'PEX-B tubing' },
      { label: 'Standards', value: 'ASTM F1807 / F2159 / F877' },
      { label: 'Types', value: 'Elbows · Reducers' },
      { label: 'Join Method', value: 'Crimp / clamp / push / expand' },
      { label: 'Service', value: 'Hot & cold potable' },
    ],
    applications: ['Direction changes', 'Size reductions', 'Branch connections', 'Retrofit'],
    notes: 'Confirm fitting style matches your tool and tubing brand listing.',
  },
  Insulation: {
    slug: 'insulation',
    title: 'Pipe Insulation',
    material: 'INSULATION',
    collection: 'PIPE INSULATION COLLECTION',
    hero: 'hero-insulation.jpg',
    heroCaption: 'COLD WATER SUPPLY',
    tagline: 'Cold-water supply pipe insulation for condensation control and energy savings.',
    overview:
      'Pipe insulation sized for common copper / PEX / CPVC ODs. Controls condensation and reduces heat gain/loss on supply piping.',
    standards: [
      { code: 'ASTM C1427', name: 'Flexible Cellular Polyolefin Thermal Insulation (typical)' },
      { code: 'IECC / local codes', name: 'Insulation thickness by climate zone' },
    ],
    highlights: [
      { title: 'Condensation', sub: 'Cold-Water Control' },
      { title: 'Multi-Size', sub: '½″ – 4″ Range' },
      { title: 'Energy Codes', sub: 'IECC Compatible' },
    ],
    construction: [
      { label: 'Type', value: 'Flexible foam pipe insulation' },
      { label: 'Service', value: 'Cold water supply' },
      { label: 'Sizing', value: 'Match ID to pipe OD' },
      { label: 'Install Tip', value: 'Seal seams & butt joints' },
      { label: 'Use Cases', value: 'Mech rooms · exposed runs' },
    ],
    applications: ['Cold water supply', 'Condensation control', 'Mechanical rooms', 'Exposed piping'],
    notes: 'Select ID to match pipe OD; seal longitudinal seams.',
  },
  'Vinyl Tiles': {
    slug: 'vinyl-tiles',
    title: 'Vinyl Floor Tiles',
    material: 'Vinyl Tiles',
    collection: 'ACHIM VINYL TILE COLLECTION',
    hero: 'hero-achim.png',
    heroCaption: 'PEEL & STICK · DIY FLOORING',
    tagline: 'Self-adhesive vinyl floor tiles — Portfolio, Sterling, Tivoli, Nexus, Retro, Palazzo, and more.',
    overview:
      'Achim Home Decor peel-and-stick vinyl tiles for kitchens, baths, basements, and unit turns. Commercial-gauge 2.0mm Portfolio through 12x12 Nexus and 12x24 Palazzo planks-look tiles.',
    standards: [
      { code: 'Peel & Stick', name: 'No extra adhesive on flat, dry subfloors' },
      { code: 'DIY / Reno', name: 'Cut with a utility knife' },
    ],
    highlights: [
      { title: 'Achim Line', sub: 'Family Pricing' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Multi-Series', sub: '12" / 18" / 12x24"' },
    ],
    construction: [
      { label: 'Install', value: 'Self-adhesive vinyl' },
      { label: 'Series', value: 'Portfolio · Sterling · Tivoli · Nexus · Retro · Palazzo' },
      { label: 'Also', value: 'OutdoorZ deck tiles · interlocking foam' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Kitchens & baths', 'Basements', 'Unit turns', 'Retail / DIY'],
    notes: 'Confirm subfloor is flat, dry, and clean. Call for carton counts, coverage, and trade pricing.',
  },
  'Vinyl Planks': {
    slug: 'vinyl-planks',
    title: 'Vinyl Floor Planks',
    material: 'Vinyl Planks',
    collection: 'ACHIM VINYL PLANK COLLECTION',
    hero: 'hero-achim.png',
    heroCaption: '6x36 PEEL & STICK · 9x48 LOOSELAY',
    tagline: 'Self-adhesive and looselay vinyl planks — Tivoli II, Sterling, Nexus, and Flex Flor.',
    overview:
      'Achim vinyl plank flooring in 6x36 peel-and-stick (Tivoli II, Sterling 2.0mm / 1.2mm, Nexus) and 9x48 Flex Flor looselay.',
    standards: [
      { code: 'Peel & Stick', name: 'Tivoli II / Sterling / Nexus 6x36' },
      { code: 'Looselay', name: 'Flex Flor 9x48' },
    ],
    highlights: [
      { title: 'Wood Looks', sub: 'Oak · Walnut · Maple' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Formats', value: '6x36 self-adhesive · 9x48 looselay' },
      { label: 'Gauges', value: '1.2mm and 2.0mm Sterling' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Living areas', 'Bedrooms', 'Unit turns', 'Retail / DIY'],
    notes: 'Looselay vs peel-and-stick install methods differ — confirm the series before quoting labor.',
  },
  'Carpet Tiles': {
    slug: 'carpet-tiles',
    title: 'Carpet Tiles',
    material: 'Carpet Tiles',
    collection: 'ACHIM NEXUS CARPET TILES',
    hero: 'hero-achim.png',
    heroCaption: '12x12 PEEL & STICK POLYESTER',
    tagline: 'Nexus self-adhesive 12x12 carpet tiles — mix colors or run a solid field.',
    overview:
      'Achim Nexus polyester peel-and-stick carpet tiles, 12 tiles per carton (12 sq ft). Ribbed texture for offices, playrooms, basements, and garages.',
    standards: [
      { code: 'Peel & Stick', name: 'Flat, dry subfloor' },
      { code: '12 / ctn', name: '12 sq ft per carton' },
    ],
    highlights: [
      { title: '6 Colors', sub: 'Mix or Match' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Material', value: 'Polyester carpet tile' },
      { label: 'Size', value: '12x12' },
      { label: 'Pack', value: '12 tiles / 12 sq ft' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Offices', 'Playrooms', 'Basements', 'Garages'],
    notes: 'Vacuum regularly; spot clean. Call for availability by color.',
  },
  Rugs: {
    slug: 'rugs',
    title: 'Area Rug Sets',
    material: 'Rugs',
    collection: 'ACHIM CAPRI RUG SETS',
    hero: 'hero-achim.png',
    heroCaption: '5x7 + RUNNER + MAT',
    tagline: 'Capri 3-piece rug sets — 5x7 rug, 22x59 runner, and 22x31 mat.',
    overview:
      'Achim Capri coordinated 3-piece rug sets for living rooms, hallways, and entries. Seven current colorways.',
    standards: [{ code: '3-Piece Set', name: 'Rug + runner + mat' }],
    highlights: [
      { title: '3-Piece', sub: 'Rug · Runner · Mat' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Set', value: '5x7 rug, 22x59 runner, 22x31 mat' },
      { label: 'Line', value: 'Capri' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Living rooms', 'Hallways', 'Entries', 'Unit staging'],
    notes: 'Call for current colorways and pack-out.',
  },
  Mats: {
    slug: 'mats',
    title: 'Entrance & Kitchen Mats',
    material: 'Mats',
    collection: 'ACHIM MATS COLLECTION',
    hero: 'hero-achim.png',
    heroCaption: 'COIR · RUBBER · MEMORY FOAM · ANTI-FATIGUE',
    tagline: 'Door mats, coco and rubber entrance mats, memory foam, and anti-fatigue kitchen mats.',
    overview:
      'Achim printed coir, welcome rubber, coco, wrought-iron rubber, memory foam, anti-fatigue kitchen prints, and woven-embossed faux-leather mats.',
    standards: [{ code: 'Common Sizes', name: '18x30 · 17x24 · 20x39' }],
    highlights: [
      { title: 'Indoor / Outdoor', sub: 'Entry & Kitchen' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Types', value: 'Coir · rubber · coco · memory foam · anti-fatigue · faux-leather' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Entries', 'Kitchens', 'Mudrooms', 'Retail / staging'],
    notes: 'Seasonal coir prints rotate. Call for current art and carton packs.',
  },
  Blinds: {
    slug: 'blinds',
    title: 'Window Blinds',
    material: 'Blinds',
    collection: 'ACHIM BLINDS COLLECTION',
    hero: 'hero-achim.png',
    heroCaption: 'CORDLESS · VINYL · FAUX WOOD · MINI',
    tagline: 'Cordless vinyl roll-up, 2" venetian, faux-wood plantation, and 1" mini blinds.',
    overview:
      'Achim cordless GII blinds: Veranda and Solstice roll-up, Luna 2" vinyl venetian, Madera Falsa 2" faux wood, Morningstar light-filtering mini, and Deluxe Sundown room-darkening mini.',
    standards: [{ code: 'Cordless', name: 'Child-safer cord-free operation' }],
    highlights: [
      { title: 'Cordless', sub: 'GII Families' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Types', value: 'Roll-up · venetian · faux wood · mini' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Apartments', 'Unit turns', 'Retail / DIY', 'Light commercial'],
    notes: 'Stock widths — call for the cut chart and colors. Do not add to cart until priced.',
  },
  Shades: {
    slug: 'shades',
    title: 'Window Shades',
    material: 'Shades',
    collection: 'ACHIM SHADES COLLECTION',
    hero: 'hero-achim.png',
    heroCaption: 'ROLLER · CELLULAR · PLEATED · ROMAN',
    tagline: 'Cordless roller, honeycomb cellular, pleated, roman, jute, and tear-down shades.',
    overview:
      'Achim cordless and cords-free shades including Glide n\' Go blackout roller, honeycomb cellular (including top-down/bottom-up), 1-2-3 room-darkening pleated, Celestial sheer, blackout roman, privacy jute, and tear-down light-filtering / room-darkening.',
    standards: [{ code: 'Cordless / Cords Free', name: 'Child-safer operation' }],
    highlights: [
      { title: 'Blackout & Light Filter', sub: 'Multiple Families' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Types', value: 'Roller · cellular · pleated · roman · jute · tear-down' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Bedrooms', 'Living areas', 'Unit turns', 'Retail / DIY'],
    notes: 'Stock widths — call for the cut chart, opacity, and colors.',
  },
  'Curtain Panels': {
    slug: 'curtain-panels',
    title: 'Curtain Panels',
    material: 'Curtains',
    collection: 'ACHIM CURTAIN PANELS',
    hero: 'hero-achim.png',
    heroCaption: 'GROMMET · ROD POCKET · PINCH PLEAT · FRENCH DOOR',
    tagline: 'Named Achim curtain panel lines — grommet, rod pocket, pinch pleat, and French door.',
    overview:
      'Achim decorative curtain panels including Constellation, Gramercy, Bordeaux, Darcy and Buffalo Check French door sizes, and a full list of named room panels.',
    standards: [{ code: 'Ready-Made', name: 'Named styles; call for sizes/colors' }],
    highlights: [
      { title: 'Named Lines', sub: 'Trade Ready' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Headings', value: 'Grommet · rod pocket · pinch pleat · French door' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Living rooms', 'Bedrooms', 'French doors', 'Unit staging'],
    notes: 'Colors and exact lengths vary by style. Call before quoting a job pack.',
  },
  'Kitchen Curtains': {
    slug: 'kitchen-curtains',
    title: 'Kitchen Curtains',
    material: 'Curtains',
    collection: 'ACHIM KITCHEN CURTAINS',
    hero: 'hero-achim.png',
    heroCaption: 'TIER · VALANCE · COTTAGE SETS',
    tagline: 'Cottage, tier-and-valance, and printed kitchen curtain sets.',
    overview:
      'Achim kitchen and cottage window sets — Bon Appetit, Napa, farmhouse, sunflower, Tuscany, and matching printed tier/valance collections.',
    standards: [{ code: 'Sets', name: 'Tier + valance / swag / multi-piece' }],
    highlights: [
      { title: 'Kitchen Looks', sub: 'Printed & Cottage' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Typical', value: 'Tier pair + valance or cottage set' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Kitchens', 'Breakfast nooks', 'Unit staging', 'Retail'],
    notes: 'Many prints match Achim kitchen mats. Call to coordinate a package.',
  },
  'Valances & Tiers': {
    slug: 'valances-tiers',
    title: 'Valances & Tiers',
    material: 'Curtains',
    collection: 'ACHIM VALANCES & TIERS',
    hero: 'hero-achim.png',
    heroCaption: 'VALANCE · TIER · SCARF · TIE-UP',
    tagline: 'Standalone valances, tier pairs, scarves, and tie-up shades.',
    overview:
      'Achim mix-and-match window toppers: Bordeaux, Gramercy, Oakwood, Ombre, Darcy, Buffalo Check, and Charlotte valances, tiers, scarves, and tie-ups.',
    standards: [{ code: 'Mix & Match', name: 'Pair with Achim panels or kitchen sets' }],
    highlights: [
      { title: 'Toppers', sub: 'Valance · Tier · Tie-Up' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Pieces', value: 'Valance, tier pair, scarf, tie-up shade' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Kitchens', 'Baths', 'French doors', 'Layered treatments'],
    notes: 'Call for size (e.g. 52x14, 58x14, 58x24) before a job quote.',
  },
  Rods: {
    slug: 'rods',
    title: 'Curtain Rods & Finials',
    material: 'Rods',
    collection: 'ACHIM ROD & FINIAL SETS',
    hero: 'hero-achim.png',
    heroCaption: 'BUONO II · CAMINO · METALLO',
    tagline: 'Decorative rod and finial sets — Buono II, Camino, and Metallo.',
    overview:
      'Achim decorative drapery hardware: Buono II (13 finial styles), Camino (Lincroft, Fairmont, Ava), and Metallo (Lexus, Leaf, Ilana, Carrera).',
    standards: [{ code: 'Sets', name: 'Rod + finials; call for lengths/finishes' }],
    highlights: [
      { title: '3 Collections', sub: 'Buono II · Camino · Metallo' },
      { title: 'Call for Pricing', sub: '732-734-1123' },
      { title: 'Achim', sub: 'Family Pricing' },
    ],
    construction: [
      { label: 'Collections', value: 'Buono II, Camino, Metallo' },
      { label: 'Source', value: 'Achim Importing Co. / Achim Home Decor' },
    ],
    applications: ['Panels', 'Sheers', 'Layered treatments', 'Unit staging'],
    notes: 'Call for rod lengths and finish options.',
  },
};

/** Per-SKU standard overlays when description / code implies a specific spec. */
export function standardsForSku(row) {
  const code = (row.Code || '').toUpperCase();
  const desc = (row.Description || '').toUpperCase();
  if (code.includes('PIPE-SOLID') || desc.includes('D1785') || desc.includes('SCH40 PVC')) {
    return ['ASTM D1785 Sch 40', 'NSF/ANSI 14'];
  }
  if (code.includes('PIPE-FOAM') || desc.includes('F891')) {
    return ['ASTM F891 Foam Core DWV', 'NSF/ANSI 14'];
  }
  if (code.includes('SDR11')) return ['ASTM D2846 SDR-11', 'NSF/ANSI 61'];
  if (code.includes('SDR13.5')) return ['ASTM D2846 SDR-13.5', 'NSF/ANSI 61'];
  if (code.includes('SCH80') || desc.includes('SCH80')) return ['ASTM F441 Sch 80', 'NSF/ANSI 61'];
  if (code.startsWith('COPPER-K')) return ['ASTM B88 Type K'];
  if (code.startsWith('COPPER-L')) return ['ASTM B88 Type L'];
  if (code.startsWith('PEX') || code.includes('PEX')) return ['ASTM F876/F877'];
  if (code.startsWith('PVC-')) return ['ASTM D2665 DWV'];
  if (code.includes('INSLTN') || (row.Material || '').toUpperCase() === 'INSULATION') {
    return ['Cold-water insulation'];
  }
  if (code.startsWith('ACH-')) return ['Achim Home Decor'];
  return [];
}

export const COMPANY = {
  name: 'All Pro Building Supplies LLC',
  short: 'ALL PRO',
  phone: '732-734-1123',
  email: 'info@allprobuildingsupplies.com',
  web: 'allprobuildingsupplies.com',
  tag: 'Trade & Volume Pricing · New Jersey',
  updated: '09.2026',
};
