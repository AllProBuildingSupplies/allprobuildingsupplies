/**
 * Initial Tommur / Lesso factory SKU mapping (admin-only fields).
 * Lesso suffix → catalog size; pipe SKUs assigned in catalog size order.
 */
export const FACTORY_CODE_SEED = [
  // PIPE-SOLID sizes: 2, 3, 4
  { code: 'PIPE-SOLID', size: '2', tommur_code: 'A01P01-SCH40', lesso_code: 'PIPE-SOLID' },
  { code: 'PIPE-SOLID', size: '3', tommur_code: 'A01P01-SCH40', lesso_code: 'PIPE-SOLID' },
  { code: 'PIPE-SOLID', size: '4', tommur_code: 'A01P01-SCH40', lesso_code: 'PIPE-SOLID' },
  // PIPE-FOAM sizes: 1-1/2, 2, 3, 4
  { code: 'PIPE-FOAM', size: '1-1/2', tommur_code: 'A100P01-', lesso_code: 'PIPE-FOAM' },
  { code: 'PIPE-FOAM', size: '2', tommur_code: 'A100P01-', lesso_code: 'PIPE-FOAM' },
  { code: 'PIPE-FOAM', size: '3', tommur_code: 'A100P01-', lesso_code: 'PIPE-FOAM' },
  { code: 'PIPE-FOAM', size: '4', tommur_code: 'A100P01-', lesso_code: 'PIPE-FOAM' },
  { code: 'PVC-1/16HH', size: '1-1/2', tommur_code: 'D057', lesso_code: 'LP324-015' },
  { code: 'PVC-1/16HH', size: '2', tommur_code: 'D057', lesso_code: 'LP324-020' },
  { code: 'PVC-1/16HH', size: '3', tommur_code: 'D057', lesso_code: 'LP324-030' },
  { code: 'PVC-1/16HS', size: '1-1/2', tommur_code: 'D059', lesso_code: 'LP326-015' },
  { code: 'PVC-1/16HS', size: '2', tommur_code: 'D059', lesso_code: 'LP326-020' },
  { code: 'PVC-1/16HS', size: '3', tommur_code: 'D059', lesso_code: 'LP326-030' },
  { code: 'PVC-1/4HH', size: '1-1/2', tommur_code: 'D035', lesso_code: 'LP300-015' },
  { code: 'PVC-1/4HH', size: '2', tommur_code: 'D035', lesso_code: 'LP300-020' },
  { code: 'PVC-1/4HH', size: '3', tommur_code: 'D035', lesso_code: 'LP300-030' },
  { code: 'PVC-1/4HH', size: '4', tommur_code: 'D035', lesso_code: 'LP300-040' },
  { code: 'PVC-1/4LOWHEEL', size: '3x3x2', tommur_code: 'D050', lesso_code: 'LP303-338' },
  { code: 'PVC-1/4HS', size: '1-1/2', tommur_code: 'D040', lesso_code: 'LP302-015' },
  { code: 'PVC-1/4HS', size: '2', tommur_code: 'D040', lesso_code: 'LP302-020' },
  { code: 'PVC-1/4HS', size: '3', tommur_code: 'D040', lesso_code: 'LP302-030' },
  { code: 'PVC-1/4HS', size: '4', tommur_code: 'D040', lesso_code: 'LP302-040' },
  { code: 'PVC-1/8HH', size: '1-1/2', tommur_code: 'D053', lesso_code: 'LP321-015' },
  { code: 'PVC-1/8HH', size: '2', tommur_code: 'D053', lesso_code: 'LP321-020' },
  { code: 'PVC-1/8HH', size: '3', tommur_code: 'D053', lesso_code: 'LP321-030' },
  { code: 'PVC-1/8HH', size: '4', tommur_code: 'D053', lesso_code: 'LP321-040' },
  { code: 'PVC-1/8HS', size: '1-1/2', tommur_code: 'D055', lesso_code: 'LP323-015' },
  { code: 'PVC-1/8HS', size: '2', tommur_code: 'D055', lesso_code: 'LP323-020' },
  { code: 'PVC-1/8HS', size: '3', tommur_code: 'D055', lesso_code: 'LP323-030' },
  { code: 'PVC-1/8HS', size: '4', tommur_code: 'D055', lesso_code: 'LP323-040' },
  { code: 'PVC-CAPSOC', size: '1-1/2', tommur_code: 'D025', lesso_code: 'LP116-015' },
  { code: 'PVC-CAPSOC', size: '2', tommur_code: 'D025', lesso_code: 'LP116-020' },
  { code: 'PVC-CAPSOC', size: '3', tommur_code: 'D025', lesso_code: 'LP116-030' },
  { code: 'PVC-CAPSOC', size: '4', tommur_code: 'D025', lesso_code: 'LP116-040' },
  { code: 'PVC-CLEANTEE', size: '2', tommur_code: 'D078', lesso_code: 'LP444X-020' },
  { code: 'PVC-CLEANTEE', size: '3', tommur_code: 'D078', lesso_code: 'LP444X-030' },
  { code: 'PVC-CLEANTEE', size: '4', tommur_code: 'D078', lesso_code: 'LP444X-040' },
  { code: 'PVC-CLSTFLNGH', size: '4x3', tommur_code: 'D121', lesso_code: 'LP800T-422' },
  { code: 'PVC-CPLNG', size: '1-1/2', tommur_code: 'D004', lesso_code: 'LP100-015' },
  { code: 'PVC-CPLNG', size: '2', tommur_code: 'D004', lesso_code: 'LP100-020' },
  { code: 'PVC-CPLNG', size: '3', tommur_code: 'D004', lesso_code: 'LP100-030' },
  { code: 'PVC-CPLNG', size: '4', tommur_code: 'D004', lesso_code: 'LP100-040' },
  { code: 'PVC-SANTEEDBL', size: '2x2x1-1/2x1-1/2', tommur_code: 'D073', lesso_code: 'LP429-251' },
  { code: 'PVC-BUSHINGHS', size: '2x1-1/2', tommur_code: 'D019', lesso_code: 'LP107-251' },
  { code: 'PVC-BUSHINGHS', size: '3x2', tommur_code: 'D019', lesso_code: 'LP107-338' },
  { code: 'PVC-BUSHINGHS', size: '4x3', tommur_code: 'D019', lesso_code: 'LP107-422' },
  { code: 'PVC-1/4HHLNG', size: '2', tommur_code: 'D043', lesso_code: 'LP304-020' },
  { code: 'PVC-1/4HHLNG', size: '3', tommur_code: 'D043', lesso_code: 'LP304-030' },
  { code: 'PVC-1/4HHLNG', size: '4', tommur_code: 'D043', lesso_code: 'LP304-040' },
  { code: 'PVC-MADPTR', size: '1-1/2', tommur_code: 'D021', lesso_code: 'LP109-015' },
  { code: 'PVC-MADPTR', size: '2', tommur_code: 'D021', lesso_code: 'LP109-020' },
  { code: 'PVC-INCREDHH', size: '2x1-1/2', tommur_code: 'D007', lesso_code: 'LP102-251' },
  { code: 'PVC-INCREDHH', size: '3x2', tommur_code: 'D007', lesso_code: 'LP102-338' },
  { code: 'PVC-INCREDHH', size: '4x3', tommur_code: 'D007', lesso_code: 'LP102-422' },
  { code: 'PVC-PTRAP', size: '1-1/2', tommur_code: 'D103', lesso_code: 'LP706X-015' },
  { code: 'PVC-PTRAP', size: '2', tommur_code: 'D103', lesso_code: 'LP706X-020' },
  { code: 'PVC-PTRAP', size: '3', tommur_code: 'D103', lesso_code: 'LP706X-030' },
  { code: 'PVC-PTRAP', size: '4', tommur_code: 'D103', lesso_code: 'LP706X-040' },
  { code: 'PVC-PTRAPLOW', size: '1-1/2', tommur_code: 'A 062', lesso_code: 'LP710-015' },
  { code: 'PVC-PTRAPLOW', size: '2', tommur_code: 'A 062', lesso_code: 'LP710-020' },
  { code: 'PVC-PTRAPLOW', size: '3', tommur_code: 'A 062', lesso_code: 'LP710-030' },
  { code: 'PVC-PTRAPLOW', size: '4', tommur_code: 'A 062', lesso_code: 'LP710-040' },
  { code: 'PVC-WYEDBL', size: '3x3x2x2', tommur_code: 'D097', lesso_code: 'LP612-338' },
  { code: 'PVC-SANTEERED', size: '2x1-1/2x1-1/2', tommur_code: 'D066', lesso_code: 'LP401-241' },
  { code: 'PVC-SANTEERED', size: '2x1-1/2x2', tommur_code: 'D066', lesso_code: 'LP401-257' },
  { code: 'PVC-SANTEERED', size: '2x2x1-1/2', tommur_code: 'D066', lesso_code: 'LP401-251' },
  { code: 'PVC-SANTEERED', size: '3x3x2', tommur_code: 'D066', lesso_code: 'LP401-338' },
  { code: 'PVC-SANTEERED', size: '4x4x3', tommur_code: 'D066', lesso_code: 'LP401-422' },
  { code: 'PVC-WYERED', size: '3x3x2', tommur_code: 'D092', lesso_code: 'LP601-338' },
  { code: 'PVC-WYERED', size: '4x4x2', tommur_code: 'D092', lesso_code: 'LP601-420' },
  { code: 'PVC-WYERED', size: '4x4x3', tommur_code: 'D092', lesso_code: 'LP601-422' },
  { code: 'PVC-SANTEE', size: '1-1/2', tommur_code: 'D065', lesso_code: 'LP400-015' },
  { code: 'PVC-SANTEE', size: '2', tommur_code: 'D065', lesso_code: 'LP400-020' },
  { code: 'PVC-SANTEE', size: '3', tommur_code: 'D065', lesso_code: 'LP400-030' },
  { code: 'PVC-SANTEE', size: '4', tommur_code: 'D065', lesso_code: 'LP400-040' },
  { code: 'PVC-WYEHUB', size: '1-1/2', tommur_code: 'D090', lesso_code: 'LP600-015' },
  { code: 'PVC-WYEHUB', size: '2', tommur_code: 'D090', lesso_code: 'LP600-020' },
  { code: 'PVC-WYEHUB', size: '3', tommur_code: 'D090', lesso_code: 'LP600-030' },
  { code: 'PVC-WYEHUB', size: '4', tommur_code: 'D090', lesso_code: 'LP600-040' },
];

/** Apply seed once (or when marker row is missing/outdated). Returns counts. */
export async function seedFactoryCodes(env, normalizeSize, options = {}) {
  const force = options.force === true;
  if (!force) {
    const marker = await env.DB.prepare(
      `SELECT tommur_code, lesso_code FROM products WHERE code = ? AND size = ? LIMIT 1`
    )
      .bind('PVC-1/16HH', '2')
      .first();
    if (marker && marker.tommur_code === 'D057' && marker.lesso_code === 'LP324-020') {
      return { seeded: false, updated: 0, reason: 'already-seeded' };
    }
  }

  const stmts = FACTORY_CODE_SEED.map((row) =>
    env.DB.prepare(
      `UPDATE products SET tommur_code = ?, lesso_code = ? WHERE code = ? AND size = ?`
    ).bind(row.tommur_code, row.lesso_code, row.code, normalizeSize(row.size))
  );
  if (stmts.length) await env.DB.batch(stmts);

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM products WHERE IFNULL(tommur_code,'') != '' OR IFNULL(lesso_code,'') != ''`
  ).first();
  return { seeded: true, updated: stmts.length, withCodes: countRow?.c || 0 };
}
