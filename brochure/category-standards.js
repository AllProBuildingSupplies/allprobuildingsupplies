/**
 * Category / product family standards & selling copy for sell sheets.
 * Keys match products.csv `sub_sub_category` values.
 *
 * ASTM/ASME lines describe the product class matching Tommur factory SKUs.
 * NSF / cUPC / CSA listing numbers are NOT printed as hard claims here —
 * Tommur/TOMEX had no verified NSF company listings as of 2026-09-02.
 * Ask Tommur for listing certificates before potable / code submittals.
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
      'Confirm local code acceptance for foam-core DWV before install. Request factory NSF/cUPC listing docs when required for submittals.',
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
      'Full line of PVC DWV fittings for solvent-cement joining: bends, sanitary tees, wyes, P-traps, couplings, bushings, caps, closet flanges, and cleanouts. Tommur DWV series (Dxxx factory codes).',
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
      'Type K for underground / severe service; Type L for indoor water. Request mill NSF/ANSI 61 listing certificates for potable submittals.',
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
      'Use lead-free solder/flux for potable water per local code. Request NSF/ANSI 61 listing certificates when required for submittals.',
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
      'SDR sizes listed as nominal × OD. Use temperature-rated CPVC cement. Request NSF/ANSI 14 & 61 listing certificates for potable code installs.',
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
      'Factory line: Tommur PEX-B (order code 4B200B). Pair with F2159 poly-alloy crimp fittings — not F1960 cold-expansion. Request NSF/cUPC listing certificates before potable submittals.',
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
      'ASTM F2159 poly-alloy insert fittings for PEX-B SDR-9 tubing. Barb ends seal with a copper crimp ring or stainless steel clamp — the same system as common Bluefin-style poly crimp fittings. Not cold-expansion (F1960) and not brass metal-insert (F1807).',
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
      'Tommur F2159 poly-alloy (PPSU) crimp fittings for PEX-B — not F1960 cold-expansion. Use copper crimp rings or stainless clamps rated for F2159. Request NSF listing certificates when required for submittals.',
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
  if (sub.includes('PEX FITTING') || code.startsWith('PEX-ELBOW') || code.startsWith('PEX-REDUCER') || code.startsWith('PEX-CPLNG') || code.startsWith('PEX-TEE') || code.startsWith('PEX-FADPTR') || code.startsWith('PEX-MADPTR') || code.startsWith('PEX-REDTEE')) {
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
