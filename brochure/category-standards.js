/**
 * Category / product family standards & selling copy for sell sheets.
 * Keys match products.csv `sub_sub_category` values.
 *
 * CUSTOMER-FACING RULE: never mention factories, suppliers, Tommur, Lesso,
 * factory SKUs/order codes, competitor brands, or internal sourcing notes
 * in any string that renders into HTML/PDF.
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
      'Contractor-grade PVC pipe for residential and commercial DWV applications. Solid-wall Sch 40 (ASTM D1785) and cellular-core foam DWV (ASTM F891).',
    standards: [
      { code: 'ASTM D1785', name: 'Sch 40 Solid PVC Pipe (pressure-rated wall)' },
      { code: 'ASTM F891', name: 'Coextruded Cellular-Core PVC DWV Pipe' },
      { code: 'ASTM D2665', name: 'Compatible with PVC DWV fitting systems' },
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
    notes:
      'Confirm local code acceptance for foam-core DWV before install.',
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
      { code: 'ASTM D3311', name: 'DWV fitting patterns (typical for this line)' },
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
    notes:
      'Hub (H) = socket; Street (S) = spigot. Use listed PVC cement. These are DWV fittings (D2665), not Sch 40 pressure fittings (D2466).',
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
      'ASTM B88 seamless copper water tube in Type K (soft) and Type L (hard) for potable water, hydronic, and mechanical piping.',
    standards: [
      { code: 'ASTM B88', name: 'Seamless Copper Water Tube (Types K & L)' },
      { code: 'Type K Soft', name: 'Thicker wall — underground / severe service' },
      { code: 'Type L Hard', name: 'Standard indoor water distribution' },
    ],
    highlights: [
      { title: 'ASTM B88', sub: 'Type K & Type L' },
      { title: 'Type K Soft', sub: 'Thicker Wall / Underground' },
      { title: 'Type L Hard', sub: 'Indoor Distribution' },
    ],
    construction: [
      { label: 'Material', value: 'Seamless copper water tube' },
      { label: 'Type K', value: 'Soft — thicker wall' },
      { label: 'Type L', value: 'Hard — indoor distribution' },
      { label: 'Standard', value: 'ASTM B88' },
      { label: 'Join Method', value: 'Solder / braze / press' },
    ],
    applications: ['Potable water', 'Hydronic heating', 'Mechanical piping', 'Repair & remodel'],
    notes:
      'Type K for underground / severe service; Type L for indoor water. Confirm potable listing requirements with local code before install.',
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
      { code: 'ASTM B88', name: 'For use with copper water tube Types K & L' },
    ],
    highlights: [
      { title: 'ASME B16.22', sub: 'Solder-Joint Spec' },
      { title: 'Type K & L', sub: 'Soft & Hard Families' },
      { title: 'Lead-Free Solder', sub: 'Use for Potable Joints' },
    ],
    construction: [
      { label: 'Material', value: 'Wrought copper / copper alloy' },
      { label: 'Standard', value: 'ASME B16.22' },
      { label: 'Join Method', value: 'Solder / braze' },
      { label: 'Families', value: 'Type K Soft · Type L Hard' },
      { label: 'Extras', value: 'Stub-outs · Cu-to-PEX adapters' },
    ],
    applications: ['Potable water', 'Branch & reducer runs', 'Remodel', 'Cu-to-PEX transitions'],
    notes:
      'Use lead-free solder/flux for potable water per local code. Confirm potable listing requirements before install.',
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
      'CPVC pipe for hot and cold water: Schedule 80 (ASTM F441) and SDR-11 / SDR-13.5 CTS tubing (ASTM D2846).',
    standards: [
      { code: 'ASTM F441', name: 'CPVC Plastic Pipe, Schedules 40 & 80' },
      { code: 'ASTM D2846', name: 'CPVC Hot- and Cold-Water Distribution (CTS SDR)' },
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
    notes:
      'SDR sizes listed as nominal × OD. Use temperature-rated CPVC cement. Confirm potable listing requirements with local code before install.',
  },
  'PEX Pipes': {
    slug: 'pex-pipes',
    title: 'PEX-B Pipe',
    material: 'PEX',
    collection: 'PEX-B TUBE COLLECTION',
    hero: 'hero-pex-pipes.jpg',
    heroCaption: 'PEX-B · SDR-9 CTS',
    tagline: 'Crosslinked polyethylene (PEX-B) tubing for flexible potable water distribution.',
    overview:
      'PEX-B (silane-method) SDR-9 CTS tubing for hot and cold potable water. Flexible, freeze-tolerant, and sized for ASTM F2159 poly-alloy crimp/clamp fittings.',
    standards: [
      { code: 'ASTM F876', name: 'Crosslinked Polyethylene (PEX) Tubing' },
      { code: 'ASTM F877', name: 'PEX Hot- and Cold-Water Distribution Systems' },
      { code: 'SDR-9 CTS', name: 'Standard Dimension Ratio · Copper Tube Size' },
    ],
    highlights: [
      { title: 'ASTM F876/F877', sub: 'PEX-B Potable Tube' },
      { title: 'PEX-B Method', sub: 'Silane Crosslinked' },
      { title: 'SDR-9 CTS', sub: 'Crimp / Clamp Ready' },
    ],
    construction: [
      { label: 'Material', value: 'PEX-B (silane crosslinked PE)' },
      { label: 'Dimension', value: 'SDR-9 · CTS (½″–2″)' },
      { label: 'Standards', value: 'ASTM F876 / F877' },
      { label: 'Join Method', value: 'ASTM F2159 crimp / clamp fittings' },
      { label: 'UV Note', value: 'Protect from sunlight' },
    ],
    applications: ['Potable distribution', 'Manifold / home-run', 'Retrofit', 'Hot & cold supply'],
    notes:
      'Use with ASTM F2159 poly-alloy crimp/clamp fittings — not F1960 cold-expansion systems. Protect tubing from sunlight. Confirm potable listing requirements with local code before install.',
  },
  'PEX Fittings': {
    slug: 'pex-fittings',
    title: 'PEX Fittings',
    material: 'PEX',
    collection: 'PEX FITTINGS COLLECTION',
    hero: 'hero-pex-fittings.jpg',
    heroCaption: 'PPSU · ASTM F2159 CRIMP',
    tagline: 'Poly-alloy (PPSU) barb elbows and reducers for PEX-B crimp / clamp systems.',
    overview:
      'ASTM F2159 poly-alloy insert fittings for PEX-B SDR-9 tubing. Barb ends seal with a copper crimp ring or stainless steel clamp. Not cold-expansion (F1960) and not brass metal-insert (F1807).',
    standards: [
      { code: 'ASTM F2159', name: 'Plastic Insert Fittings Utilizing Copper Crimp Ring for SDR9 PEX' },
      { code: 'ASTM F877', name: 'PEX Hot- and Cold-Water Distribution Systems' },
      { code: 'ASTM F876', name: 'For use with listed SDR-9 PEX tubing' },
    ],
    highlights: [
      { title: 'ASTM F2159', sub: 'Poly / PPSU Crimp' },
      { title: 'Crimp / Clamp', sub: 'Cu Ring or SS Clamp' },
      { title: 'PEX-B Ready', sub: 'Not F1960 Expand' },
    ],
    construction: [
      { label: 'Material', value: 'PPSU / poly-alloy (lead-free)' },
      { label: 'Standard', value: 'ASTM F2159' },
      { label: 'Types', value: '90° Elbows · Reducers' },
      { label: 'Join Method', value: 'Copper crimp ring or SS clamp' },
      { label: 'Use With', value: 'PEX-B SDR-9 CTS tubing' },
    ],
    applications: ['Direction changes', 'Size reductions', 'PEX-B distribution', 'Retrofit'],
    notes:
      'ASTM F2159 poly-alloy (PPSU) crimp fittings for PEX-B — not F1960 cold-expansion. Use copper crimp rings or stainless clamps rated for F2159. Confirm potable listing requirements with local code before install.',
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
      'Flexible cellular foam pipe insulation sized for common copper / PEX / CPVC ODs. Controls condensation and reduces heat gain/loss on supply piping.',
    standards: [
      { code: 'ASTM C1427', name: 'Extruded Preformed Flexible Cellular Polyolefin Insulation' },
      { code: 'ASTM C534', name: 'Preformed Flexible Elastomeric Cellular Insulation (alt. family)' },
      { code: 'IECC / local', name: 'Thickness by climate zone / energy code' },
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
    notes: 'Select ID to match pipe OD; seal longitudinal seams. Confirm flame/smoke ratings when required by local code.',
  },
};

function retailLine(opts) {
  return {
    standards: [],
    highlights: opts.highlights || [
      { title: 'In Stock', sub: 'Trade Catalog' },
      { title: 'Sizes & Colors', sub: 'Listed Per Style' },
      { title: 'Bulk Quotes', sub: 'Call for Volume' },
    ],
    construction: opts.construction || [],
    applications: opts.applications || [],
    notes: opts.notes || '',
    ...opts,
  };
}

Object.assign(CATEGORY_META, {
  'PVC DWV Fittings': {
    ...CATEGORY_META['PVC Fittings'],
    slug: 'pvc-dwv-fittings',
    title: 'PVC DWV Fittings',
    collection: 'PVC DWV FITTINGS COLLECTION',
  },
  'SCH40 Solid': {
    slug: 'sch40-solid',
    title: 'PVC SCH 40 Solid Pipe',
    material: 'PVC',
    collection: 'SCH 40 SOLID PIPE',
    hero: 'hero-sch40-solid.jpg',
    heroCaption: 'ASTM D1785 · SCH 40',
    tagline: 'Schedule 40 solid-wall PVC pipe for DWV and compatible systems.',
    overview: 'ASTM D1785 Schedule 40 solid-wall PVC pipe.',
    standards: [{ code: 'ASTM D1785', name: 'Sch 40 Solid PVC Pipe' }],
    highlights: [
      { title: 'ASTM D1785', sub: 'Sch 40 Solid Wall' },
      { title: 'Join', sub: 'Solvent Cement' },
      { title: 'Trade Sizes', sub: 'Listed Below' },
    ],
    construction: [
      { label: 'Material', value: 'PVC (polyvinyl chloride)' },
      { label: 'Wall', value: 'ASTM D1785 Schedule 40 solid' },
      { label: 'Join Method', value: 'Solvent cement (hub)' },
    ],
    applications: ['DWV systems', 'Drainage & vent'],
    notes: '',
  },
  'SCH40 Foam': {
    slug: 'sch40-foam',
    title: 'PVC SCH 40 Foam-Core Pipe',
    material: 'PVC',
    collection: 'SCH 40 FOAM CORE PIPE',
    hero: 'hero-sch40-foam.jpg',
    heroCaption: 'ASTM F891 · FOAM CORE',
    tagline: 'Cellular-core PVC DWV pipe.',
    overview: 'ASTM F891 cellular-core (foam) PVC DWV pipe.',
    standards: [{ code: 'ASTM F891', name: 'Cellular Core PVC DWV Pipe' }],
    highlights: [
      { title: 'ASTM F891', sub: 'Foam Core DWV' },
      { title: 'Join', sub: 'Solvent Cement' },
      { title: 'Trade Sizes', sub: 'Listed Below' },
    ],
    construction: [
      { label: 'Material', value: 'PVC cellular core' },
      { label: 'Standard', value: 'ASTM F891' },
      { label: 'Join Method', value: 'Solvent cement (hub)' },
    ],
    applications: ['DWV systems', 'Drainage & vent'],
    notes: 'Confirm local code acceptance for foam-core DWV before install.',
  },
  'Vinyl Tiles': retailLine({
    slug: 'vinyl-tiles',
    title: 'Vinyl Floor Tiles',
    material: 'Flooring',
    collection: 'VINYL TILE COLLECTION',
    hero: 'hero-vinyl-tiles.jpg',
    heroCaption: 'PEEL & STICK TILES',
    tagline: 'Peel-and-stick vinyl floor tiles in current catalog colors and sizes.',
    overview: 'Self-adhesive vinyl floor tiles from the All Pro catalog.',
    construction: [
      { label: 'Type', value: 'Peel-and-stick vinyl tile' },
      { label: 'Listed', value: 'Every size and color in stock list' },
    ],
    applications: ['Kitchens', 'Baths', 'Basements', 'Unit turns'],
  }),
  'Vinyl Planks': retailLine({
    slug: 'vinyl-planks',
    title: 'Vinyl Floor Planks',
    material: 'Flooring',
    collection: 'VINYL PLANK COLLECTION',
    hero: 'hero-vinyl-planks.jpg',
    heroCaption: 'PLANKS · LOOSELAY & STICK',
    tagline: 'Vinyl plank flooring — every listed size and color.',
    overview: 'Vinyl plank styles from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Vinyl plank' }],
    applications: ['Living areas', 'Bedrooms', 'Retail / units'],
  }),
  'Click-Lock': retailLine({
    slug: 'click-lock',
    title: 'Click-Lock Flooring',
    material: 'Flooring',
    collection: 'CLICK-LOCK COLLECTION',
    hero: 'hero-click-lock.jpg',
    heroCaption: 'CLICK-LOCK PLANKS',
    tagline: 'Click-lock flooring planks in listed colors.',
    overview: 'Click-lock flooring from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Click-lock plank' }],
    applications: ['Interior floors'],
  }),
  'Carpet Tiles': retailLine({
    slug: 'carpet-tiles',
    title: 'Carpet Tiles',
    material: 'Flooring',
    collection: 'CARPET TILE COLLECTION',
    hero: 'hero-carpet-tiles.jpg',
    heroCaption: 'CARPET TILES',
    tagline: 'Carpet tiles in listed colors and carton sizes.',
    overview: 'Carpet tiles from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Carpet tile' }],
    applications: ['Offices', 'Basements', 'Playrooms'],
  }),
  'Foam Tiles': retailLine({
    slug: 'foam-tiles',
    title: 'Foam Floor Tiles',
    material: 'Flooring',
    collection: 'FOAM TILE COLLECTION',
    hero: 'hero-foam-tiles.jpg',
    heroCaption: 'FOAM TILES',
    tagline: 'Foam floor tiles in listed colors.',
    overview: 'Foam floor tiles from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Foam tile' }],
    applications: ['Play / utility floors'],
  }),
  'Deck Tiles': retailLine({
    slug: 'deck-tiles',
    title: 'Deck Tiles',
    material: 'Flooring',
    collection: 'DECK TILE COLLECTION',
    hero: 'hero-deck-tiles.jpg',
    heroCaption: 'DECK TILES',
    tagline: 'Deck tiles in listed colors.',
    overview: 'Deck tiles from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Deck tile' }],
    applications: ['Decks', 'Patios'],
  }),
  Mats: retailLine({
    slug: 'mats',
    title: 'Entrance & Kitchen Mats',
    material: 'Flooring',
    collection: 'MAT COLLECTION',
    hero: 'hero-mats.jpg',
    heroCaption: 'MATS',
    tagline: 'Entrance, kitchen, and utility mats — every listed size and color.',
    overview: 'Mats from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Floor / entrance mat' }],
    applications: ['Entries', 'Kitchens', 'Utility'],
  }),
  Rugs: retailLine({
    slug: 'rugs',
    title: 'Area Rug Sets',
    material: 'Flooring',
    collection: 'RUG COLLECTION',
    hero: 'hero-rugs.jpg',
    heroCaption: 'RUG SETS',
    tagline: 'Area rug sets in listed colors.',
    overview: 'Rug sets from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Rug set' }],
    applications: ['Living rooms', 'Entries'],
  }),
  'Mini Blinds': retailLine({
    slug: 'mini-blinds',
    title: 'Mini Blinds',
    material: 'Windows',
    collection: 'MINI BLIND COLLECTION',
    hero: 'hero-mini-blinds.jpg',
    heroCaption: 'MINI BLINDS',
    tagline: 'Mini blinds — every listed size and color.',
    overview: 'Mini blinds from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Mini blind' }],
    applications: ['Residential', 'Multi-family'],
  }),
  'Plantation Blinds': retailLine({
    slug: 'plantation-blinds',
    title: 'Plantation Blinds',
    material: 'Windows',
    collection: 'PLANTATION BLIND COLLECTION',
    hero: 'hero-plantation-blinds.jpg',
    heroCaption: 'PLANTATION BLINDS',
    tagline: 'Plantation blinds — every listed size and color.',
    overview: 'Plantation blinds from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Plantation / faux-wood blind' }],
    applications: ['Residential', 'Multi-family'],
  }),
  'Roll-Up Blinds': retailLine({
    slug: 'roll-up-blinds',
    title: 'Roll-Up Blinds',
    material: 'Windows',
    collection: 'ROLL-UP BLIND COLLECTION',
    hero: 'hero-roll-up-blinds.jpg',
    heroCaption: 'ROLL-UP BLINDS',
    tagline: 'Roll-up blinds — every listed size and color.',
    overview: 'Roll-up blinds from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Roll-up blind' }],
    applications: ['Residential', 'Multi-family'],
  }),
  'Vertical Blinds': retailLine({
    slug: 'vertical-blinds',
    title: 'Vertical Blinds',
    material: 'Windows',
    collection: 'VERTICAL BLIND COLLECTION',
    hero: 'hero-vertical-blinds.jpg',
    heroCaption: 'VERTICAL BLINDS',
    tagline: 'Vertical blinds — every listed size and color.',
    overview: 'Vertical blinds from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Vertical blind' }],
    applications: ['Patio doors', 'Wide openings'],
  }),
  'Roller Shades': retailLine({
    slug: 'roller-shades',
    title: 'Roller Shades',
    material: 'Windows',
    collection: 'ROLLER SHADE COLLECTION',
    hero: 'hero-roller-shades.jpg',
    heroCaption: 'ROLLER SHADES',
    tagline: 'Roller shades — every listed size and color.',
    overview: 'Roller shades from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Roller shade' }],
    applications: ['Residential', 'Multi-family'],
  }),
  'Cellular Shades': retailLine({
    slug: 'cellular-shades',
    title: 'Cellular Shades',
    material: 'Windows',
    collection: 'CELLULAR SHADE COLLECTION',
    hero: 'hero-cellular-shades.jpg',
    heroCaption: 'CELLULAR SHADES',
    tagline: 'Cellular / honeycomb shades — every listed size and color.',
    overview: 'Cellular shades from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Cellular shade' }],
    applications: ['Residential', 'Multi-family'],
  }),
  'Roman Shades': retailLine({
    slug: 'roman-shades',
    title: 'Roman Shades',
    material: 'Windows',
    collection: 'ROMAN SHADE COLLECTION',
    hero: 'hero-roman-shades.jpg',
    heroCaption: 'ROMAN SHADES',
    tagline: 'Roman shades — every listed size and color.',
    overview: 'Roman shades from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Roman shade' }],
    applications: ['Residential'],
  }),
  Accessories: retailLine({
    slug: 'window-accessories',
    title: 'Window Accessories',
    material: 'Windows',
    collection: 'WINDOW ACCESSORIES',
    hero: 'hero-window-accessories.jpg',
    heroCaption: 'ACCESSORIES',
    tagline: 'Window accessories from the catalog.',
    overview: 'Window accessories from the All Pro catalog.',
    construction: [{ label: 'Type', value: 'Window accessory' }],
    applications: ['Window hardware / extras'],
  }),
});

export const DEPARTMENT_META = {
  Plumbing: {
    slug: 'dept-plumbing',
    title: 'Plumbing',
    subtitle: 'Pipe, fittings, and insulation',
    hero: 'hero-dept-plumbing.jpg',
    feats: [
      { title: 'Pipe & Fittings', sub: 'PVC · Copper · PEX · CPVC' },
      { title: 'Suggested Wholesale', sub: 'Call for Bulk Quotes' },
      { title: 'Trade Specs', sub: 'ASTM Lines Listed' },
    ],
  },
  Windows: {
    slug: 'dept-windows',
    title: 'Windows',
    subtitle: 'Blinds, shades, and accessories',
    hero: 'hero-dept-windows.jpg',
    feats: [
      { title: 'Blinds & Shades', sub: 'Every Size & Color Listed' },
      { title: 'Suggested Wholesale', sub: 'Call for Bulk Quotes' },
      { title: 'Multi-Family Ready', sub: 'Stock Programs' },
    ],
  },
  Flooring: {
    slug: 'dept-flooring',
    title: 'Flooring',
    subtitle: 'Tiles, planks, mats, and rugs',
    hero: 'hero-dept-flooring.jpg',
    feats: [
      { title: 'Tiles & Planks', sub: 'Vinyl · Carpet · Foam · Deck' },
      { title: 'Suggested Wholesale', sub: 'Call for Bulk Quotes' },
      { title: 'Mats & Rugs', sub: 'Listed Colors' },
    ],
  },
};

/** Per-SKU standard overlays when description / code implies a specific spec. */
export function standardsForSku(row) {
  const code = (row.Code || '').toUpperCase();
  const desc = (row.Description || '').toUpperCase();
  const sub = (row.sub_sub_category || '').toUpperCase();
  if (code.includes('PIPE-SOLID') || desc.includes('D1785') || desc.includes('SCH40 PVC')) {
    return ['ASTM D1785 Sch 40', 'ASTM D2665 DWV systems'];
  }
  if (code.includes('PIPE-FOAM') || desc.includes('F891')) {
    return ['ASTM F891 Foam Core DWV'];
  }
  if (code.includes('SDR11')) return ['ASTM D2846 SDR-11'];
  if (code.includes('SDR13.5')) return ['ASTM D2846 SDR-13.5'];
  if (code.includes('SCH80') || desc.includes('SCH80')) return ['ASTM F441 Sch 80'];
  if (code.startsWith('COPPER-K') && code.includes('PIPE')) return ['ASTM B88 Type K'];
  if (code.startsWith('COPPER-L') && code.includes('PIPE')) return ['ASTM B88 Type L'];
  if (code.startsWith('COPPER-K')) return ['ASME B16.22', 'ASTM B88 Type K'];
  if (code.startsWith('COPPER-L')) return ['ASME B16.22', 'ASTM B88 Type L'];
  if (code.includes('F1807')) return ['ASTM F1807'];
  if (sub.includes('PEX FITTING') || code.startsWith('PEX-ELBOW') || code.startsWith('PEX-REDUCER') || code.startsWith('PEX-CPLNG') || code.startsWith('PEX-TEE') || code.startsWith('PEX-FADPTR') || code.startsWith('PEX-MADPTR') || code.startsWith('PEX-REDTEE') || code.startsWith('PEX-PLUG')) {
    return ['ASTM F2159', 'ASTM F877'];
  }
  if (code.includes('PEX-B') || (code.includes('PEX') && sub.includes('PIPE'))) {
    return ['ASTM F876/F877', 'SDR-9 CTS'];
  }
  if (code.startsWith('PVC-')) return ['ASTM D2665 DWV'];
  if (code.includes('INSLTN') || (row.Material || '').toUpperCase() === 'INSULATION') {
    return ['ASTM C1427 / C534'];
  }
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
