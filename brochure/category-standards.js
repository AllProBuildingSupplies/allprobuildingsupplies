/**
 * Category / product family standards & selling copy for sell sheets.
 * Keys match products.csv `sub_sub_category` values.
 */
export const CATEGORY_META = {
  'PVC Pipes': {
    slug: 'pvc-pipes',
    title: 'PVC Pipe',
    material: 'PVC',
    tagline: 'Schedule 40 solid & foam-core DWV pipe for drain, waste, and vent systems.',
    overview:
      'Contractor-grade PVC pipe sourced for residential and commercial DWV and pressure applications. Available in solid-wall Schedule 40 and cellular-core foam DWV constructions.',
    standards: [
      { code: 'ASTM D1785', name: 'Sch 40 Solid PVC Pressure Pipe' },
      { code: 'ASTM F891', name: 'Cellular Core (Foam) PVC DWV Pipe' },
      { code: 'NSF/ANSI 14', name: 'Plastic Piping System Components' },
    ],
    applications: ['DWV systems', 'Drainage & vent runs', 'Underground & above-grade install', 'Residential & commercial'],
    notes: 'Solid-wall Sch 40 for pressure/DWV where specified; foam-core for gravity DWV where code permits. Confirm local code acceptance before install.',
  },
  'PVC Fittings': {
    slug: 'pvc-fittings',
    title: 'PVC DWV Fittings',
    material: 'PVC',
    tagline: 'Hub & street DWV fittings — elbows, tees, wyes, traps, adapters, and more.',
    overview:
      'Full line of PVC DWV fittings for solvent-cement joining. Includes bends, sanitary tees, wyes, P-traps, couplings, bushings, caps, closet flanges, and cleanouts in common trade sizes.',
    standards: [
      { code: 'ASTM D2665', name: 'PVC Plastic Drain, Waste & Vent Pipe and Fittings' },
      { code: 'ASTM D1785', name: 'Compatible with Sch 40 PVC pipe systems' },
      { code: 'NSF/ANSI 14', name: 'Plastic Piping System Components' },
    ],
    applications: ['Drain, waste & vent', 'Sanitary branch connections', 'Cleanouts & traps', 'Closet / toilet flanges'],
    notes: 'Hub (H) = socket/solvent weld; Street (S) = spigot end. All-hub fittings join with solvent cement per manufacturer instructions.',
  },
  'Copper Pipes': {
    slug: 'copper-pipes',
    title: 'Copper Tube / Pipe',
    material: 'Copper',
    tagline: 'Type K soft and Type L hard copper water tube for potable and mechanical systems.',
    overview:
      'ASTM B88 copper water tube in Type K (soft) and Type L (hard) for potable water, hydronic, and mechanical piping. Sized for standard trade OD copper systems.',
    standards: [
      { code: 'ASTM B88', name: 'Seamless Copper Water Tube (Types K & L)' },
      { code: 'NSF/ANSI 61', name: 'Drinking Water System Components' },
      { code: 'UPC / IPC', name: 'Recognized for potable water when listed' },
    ],
    applications: ['Potable water supply', 'Hydronic heating', 'Mechanical piping', 'Repair & remodel'],
    notes: 'Type K: thicker wall, often underground or severe service. Type L: standard hard-drawn for indoor water distribution.',
  },
  'Copper Fittings': {
    slug: 'copper-fittings',
    title: 'Copper Fittings',
    material: 'Copper',
    tagline: 'Wrought copper solder-joint fittings — elbows, tees, couplings, reducers, and adapters.',
    overview:
      'Wrought copper and copper-alloy solder-joint pressure fittings for Type K and Type L tube. Includes elbows, tees, reducing tees, couplings, reducers, stub-outs, and copper-to-PEX adapters.',
    standards: [
      { code: 'ASME B16.22', name: 'Wrought Copper & Copper Alloy Solder-Joint Pressure Fittings' },
      { code: 'ASTM B88', name: 'For use with copper water tube' },
      { code: 'NSF/ANSI 61', name: 'Drinking Water System Components (where listed)' },
    ],
    applications: ['Potable water', 'Solder / braze joints', 'Branch & reducer runs', 'Copper-to-PEX transitions'],
    notes: 'Type K Soft and Type L Hard families stocked. Use lead-free solder / flux for potable water per local code.',
  },
  'CPVC Pipes': {
    slug: 'cpvc-pipes',
    title: 'CPVC Pipe',
    material: 'CPVC',
    tagline: 'Hot- and cold-water CPVC — Schedule 80 and ASTM D2846 SDR tubing.',
    overview:
      'Chlorinated PVC (CPVC) pipe for hot and cold water distribution. Includes Schedule 80 pipe and SDR-11 / SDR-13.5 tubing manufactured to ASTM D2846 CTS dimensions.',
    standards: [
      { code: 'ASTM F441', name: 'CPVC Schedule 40 / 80 Plastic Pipe (Sch 80 line)' },
      { code: 'ASTM D2846', name: 'CPVC Hot- and Cold-Water Distribution (SDR-11 / 13.5)' },
      { code: 'NSF/ANSI 61 & 14', name: 'Potable water & plastic piping components' },
    ],
    applications: ['Hot & cold potable water', 'Residential & light commercial', 'CTS solvent-weld systems', 'Sch 80 industrial / pressure'],
    notes: 'SDR sizes listed as nominal × OD style (e.g. 1/2" × 1.73"). Use CPVC cement rated for the system temperature.',
  },
  'PEX Pipes': {
    slug: 'pex-pipes',
    title: 'PEX-B Pipe',
    material: 'PEX',
    tagline: 'Crosslinked polyethylene (PEX-B) tubing for flexible potable water distribution.',
    overview:
      'PEX-B (silane / moisture-cure method) tubing for hot and cold potable water. Flexible, freeze-resistant, and compatible with standard PEX fitting systems when properly listed.',
    standards: [
      { code: 'ASTM F876', name: 'Crosslinked Polyethylene (PEX) Tubing' },
      { code: 'ASTM F877', name: 'PEX Hot- and Cold-Water Distribution Systems' },
      { code: 'NSF/ANSI 61 & 14', name: 'Potable water & plastic piping' },
      { code: 'CSA B137.5', name: 'Crosslinked polyethylene (PEX) tubing systems' },
    ],
    applications: ['Potable water distribution', 'Manifold / home-run systems', 'Retrofit & remodel', 'Radiant (where rated)'],
    notes: 'Protect from UV exposure. Use listed PEX fittings, rings/clamps, and expansion tools per connection type.',
  },
  'PEX Fittings': {
    slug: 'pex-fittings',
    title: 'PEX Fittings',
    material: 'PEX',
    tagline: 'Elbows and reducers for PEX-B water distribution systems.',
    overview:
      'PEX system fittings for directional changes and size transitions. Designed for use with PEX-B tubing in potable water applications when installed with listed connection methods.',
    standards: [
      { code: 'ASTM F1807 / F2159', name: 'Metal insert & plastic PEX fittings (system-dependent)' },
      { code: 'ASTM F877', name: 'PEX Hot- and Cold-Water Distribution Systems' },
      { code: 'NSF/ANSI 61', name: 'Drinking Water System Components' },
    ],
    applications: ['Direction changes', 'Size reductions', 'Branch connections', 'Retrofit transitions'],
    notes: 'Confirm fitting style (crimp, clamp, push, expansion) matches your tool and tubing brand listing.',
  },
  Insulation: {
    slug: 'insulation',
    title: 'Pipe Insulation',
    material: 'INSULATION',
    tagline: 'Cold-water supply pipe insulation for condensation control and energy savings.',
    overview:
      'Pipe insulation sized for common copper / PEX / CPVC ODs. Helps control condensation on cold-water lines and reduce heat gain / loss on supply piping.',
    standards: [
      { code: 'ASTM C1427', name: 'Extruded Preformed Flexible Cellular Polyolefin Thermal Insulation (typical)' },
      { code: 'IECC / local energy codes', name: 'Insulation thickness requirements by climate' },
    ],
    applications: ['Cold water supply', 'Condensation control', 'Mechanical rooms', 'Exposed piping'],
    notes: 'Select ID to match pipe OD. Seal longitudinal seams and butt joints for best performance.',
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
  if (code.startsWith('COPPER-K')) return ['ASTM B88 Type K', 'ASME B16.22 (fittings)'];
  if (code.startsWith('COPPER-L')) return ['ASTM B88 Type L', 'ASME B16.22 (fittings)'];
  if (code.startsWith('PEX') || code.includes('PEX')) return ['ASTM F876/F877', 'NSF/ANSI 61'];
  if (code.startsWith('PVC-')) return ['ASTM D2665 DWV', 'Solvent-weld hub'];
  if (code.includes('INSLTN') || (row.Material || '').toUpperCase() === 'INSULATION') {
    return ['Cold-water pipe insulation', 'Match to pipe OD'];
  }
  return [];
}

export const COMPANY = {
  name: 'All Pro Building Supplies LLC',
  phone: '732-734-1123',
  email: 'info@allprobuildingsupplies.com',
  web: 'allprobuildingsupplies.com',
  tag: 'Trade & Volume Pricing · New Jersey',
};
