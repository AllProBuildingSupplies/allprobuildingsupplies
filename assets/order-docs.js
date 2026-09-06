/* Shared All Pro invoice / packing / email document builders.
 * Used by All Pro OS. Classic admin.html keeps its own copy so we do not regress it.
 */
(function (global) {
'use strict';
var cachedPaymentMethods = {};

function priorShippedQtyForLine(order, code, size, beforeIndex) {
  const ships = Array.isArray(order.shipments) ? order.shipments : [];
  const end = Math.max(0, Math.min(beforeIndex, ships.length));
  let n = 0;
  const codeKey = String(code || '');
  const sizeKey = String(size || '');
  for (let i = 0; i < end; i++) {
    const items = (ships[i] && ships[i].items) || [];
    for (let j = 0; j < items.length; j++) {
      const it = items[j];
      if (String(it.code || '') === codeKey && String(it.size || '') === sizeKey) {
        n += parseInt(it.qty, 10) || 0;
      }
    }
  }
  return n;
}

/**
 * Build a view of the order scoped to one shipment (for packing / invoice / deliver).
 * Packing slip qty fields:
 *   qtyOrdered, qtyPrevShipped, qtyThisShip, qtyBackorder (still due after this ship).
 */
function orderViewForShipment(order, shipment, shipmentIndex) {
  if (!shipment) return order;
  const ships = Array.isArray(order.shipments) ? order.shipments : [];
  let idx = typeof shipmentIndex === 'number' ? shipmentIndex : ships.indexOf(shipment);
  if (idx < 0) {
    idx = ships.findIndex(function (s) { return s && s.id && shipment.id && s.id === shipment.id; });
  }
  if (idx < 0) idx = Math.max(0, ships.length - 1);

  const byKey = {};
  (order.items || []).forEach(function (it) {
    byKey[String(it.code) + '||' + String(it.size || '')] = it;
  });
  const items = (shipment.items || []).map(function (si) {
    const key = String(si.code) + '||' + String(si.size || '');
    const orderedLine = byKey[key];
    const qtyThis = parseInt(si.qty, 10) || 0;
    const qtyOrdered = orderedLine ? (parseInt(orderedLine.qty, 10) || 0) : qtyThis;
    const qtyPrev = priorShippedQtyForLine(order, si.code, si.size, idx);
    const qtyAfter = qtyPrev + qtyThis;
    const qtyBackorder = Math.max(0, qtyOrdered - qtyAfter);
    const unitPrice = Number(si.unitPrice != null ? si.unitPrice : (orderedLine && orderedLine.unitPrice)) || 0;
    return {
      code: si.code,
      size: si.size || '',
      description: si.description || (orderedLine && orderedLine.description) || '',
      qty: qtyThis,
      qtyOrdered: qtyOrdered,
      qtyPrevShipped: qtyPrev,
      qtyThisShip: qtyThis,
      qtyShipped: qtyAfter,
      qtyDelivered: qtyThis,
      qtyBackorder: qtyBackorder,
      unitPrice: unitPrice,
      lineTotal: qtyThis * unitPrice,
      pcsPerCtn: orderedLine ? orderedLine.pcsPerCtn : 1
    };
  });
  const total = items.reduce(function (s, it) { return s + (Number(it.lineTotal) || 0); }, 0);
  return Object.assign({}, order, {
    items: items,
    total: total,
    shipmentId: shipment.id || '',
    shipmentDate: shipment.shippedAt || order.placedAt,
    shipmentIndex: idx,
    shipmentNumber: idx + 1,
    shipmentCount: ships.length
  });
}

function emailEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Keep EmailJS template_params under the 50KB variables cap. */
function minifyEmailHtml(html) {
  return String(html == null ? '' : html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function emailVarsByteSize(subject, htmlBody) {
  // Approximate EmailJS template_params JSON size (subject + body + routing fields).
  const payload = JSON.stringify({
    email_subject: subject || '',
    email_body: htmlBody || '',
    to_email: 'x@y.z',
    cust_email: 'x@y.z',
    cc_email: '',
    email_cc: '',
    cc: '',
  });
  try {
    return new TextEncoder().encode(payload).length;
  } catch (_) {
    return payload.length;
  }
}

function emailNoteRow(note) {
  if (!note) return '';
  return '<tr><td class="email-pad" style="padding:12px 20px 0;"><div style="background:#fffbf0;border-left:3px solid #C8981F;padding:12px;"><div style="font-size:11px;color:#C8981F;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Message from All Pro:</div><div style="font-size:13px;color:#333;line-height:1.5;">' +
    emailEscape(note).replace(/\n/g, '<br>') +
    '</div></div></td></tr>';
}

function emailItemRows(items) {
  return (items || []).map(function (i, idx) {
    const alt = idx % 2 ? ' e1' : '';
    return '<tr class="er' + alt + '"><td class="ec">' +
      emailEscape((i.description || '') + ' ' + (i.size || '')) +
      '<br><span class="es">' + emailEscape(String(i.qty)) +
      ' pcs @ $' + (Number(i.unitPrice) || 0).toFixed(2) +
      '</span></td><td class="ec en eright">$' +
      (Number(i.lineTotal) || 0).toFixed(2) + '</td></tr>';
  }).join('');
}

/** Absolute logo URL for printable / emailed invoice documents. */
function invoiceLogoUrl() {
  try {
    const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : 'https://allprobuildingsupplies.com';
    if (/allpro-test\.pages\.dev|test\.allprobuildingsupplies\.com|localhost|127\.0\.0\.1/i.test(origin)) {
      return 'https://allprobuildingsupplies.com/images/logo-email.png';
    }
    return origin.replace(/\/$/, '') + '/images/logo-email.png';
  } catch (_) {
    return 'https://allprobuildingsupplies.com/images/logo-email.png';
  }
}

/** Invoice line rows: Product | Ordered | Shipped | Invoice qty | Unit | Amount */
function emailInvoiceItemRows(items) {
  return (items || []).map(function (i, idx) {
    const ordered = parseInt(i.qtyOrdered != null ? i.qtyOrdered : i.qty, 10) || 0;
    const shippedRaw = i.qtyShipped != null
      ? i.qtyShipped
      : (i.qtyPrevShipped != null || i.qtyThisShip != null
        ? (parseInt(i.qtyPrevShipped, 10) || 0) + (parseInt(i.qtyThisShip, 10) || 0)
        : ordered);
    const shipped = parseInt(shippedRaw, 10) || 0;
    const invQty = parseInt(
      i.qtyThisShip != null ? i.qtyThisShip : (i.qtyDelivered != null ? i.qtyDelivered : i.qty),
      10
    ) || 0;
    const unit = Number(i.unitPrice) || 0;
    const line = Number(i.lineTotal);
    const amount = Number.isFinite(line) ? line : unit * invQty;
    const alt = idx % 2 ? 'background:#f3f5f7;' : 'background:#ffffff;';
    const desc = emailEscape(i.description || '');
    const size = i.size ? (' ' + emailEscape(i.size)) : '';
    const code = i.code ? ('<div style="font-size:10px;color:#888;margin-top:2px;font-family:Consolas,monospace;">' + emailEscape(i.code) + '</div>') : '';
    return '<tr>' +
      '<td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#222;vertical-align:top;' + alt + '">' +
        '<div style="font-weight:600;color:#0C1117;">' + desc + size + '</div>' + code +
      '</td>' +
      '<td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#333;text-align:center;white-space:nowrap;vertical-align:top;' + alt + '">' + ordered + '</td>' +
      '<td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#333;text-align:center;white-space:nowrap;vertical-align:top;' + alt + '">' + shipped + '</td>' +
      '<td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#0C1117;font-weight:700;text-align:center;white-space:nowrap;vertical-align:top;' + alt + '">' + invQty + '</td>' +
      '<td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#333;text-align:right;white-space:nowrap;vertical-align:top;' + alt + '">$' + unit.toFixed(2) + '</td>' +
      '<td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#0C1117;font-weight:700;text-align:right;white-space:nowrap;vertical-align:top;' + alt + '">$' + amount.toFixed(2) + '</td>' +
    '</tr>';
  }).join('');
}

/**
 * Formal printable invoice (PDF) — distinct from confirmation emails.
 * Letter layout: logo + company left, contact right; bill-to / meta; packing-style qty columns.
 */
function buildInvoicePdfDocument(order, note, paymentMethods) {
  const methods = paymentMethods || cachedPaymentMethods || {};
  const fee = invoiceCardFee(order.total, methods);
  const cust = order.customer || {};
  const shipTo = order.delivery && order.delivery.address ? String(order.delivery.address) : '';
  const invNo = order.shipmentId ? (order.id + ' / ' + order.shipmentId) : String(order.id || '');
  const invDate = new Date(order.shipmentDate || order.placedAt || Date.now()).toLocaleDateString();
  const bizAddr = invoiceBusinessAddress(methods) || '35 Hope Hill Lane\nLakewood NJ 08701';
  const logo = invoiceLogoUrl();
  const itemsHtml = emailInvoiceItemRows(order.items);
  const noteBlock = (note || order.notes)
    ? ('<div style="margin-top:10px;padding:10px 12px;background:#fffbf0;border:1px solid #f0e0a0;font-size:12px;color:#444;line-height:1.45;">' +
       '<strong style="color:#0C1117;">Notes:</strong> ' +
       emailEscape(note || order.notes).replace(/\n/g, '<br>') + '</div>')
    : '';
  const shipLabel = order.shipmentId
    ? ('<div style="font-size:12px;color:#555;margin-top:4px;">Shipment: <strong>' + emailEscape(order.shipmentId) + '</strong>' +
       (order.shipmentNumber ? (' (' + order.shipmentNumber + (order.shipmentCount ? ' of ' + order.shipmentCount : '') + ')') : '') +
       '</div>')
    : '';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    '<title>Invoice ' + emailEscape(invNo) + '</title>' +
    '<style type="text/css">' +
    'html,body{margin:0;padding:0;background:#fff;color:#0C1117;font-family:Arial,Helvetica,sans-serif}' +
    '@page{size:letter;margin:.5in}' +
    '@media print{html,body{background:#fff!important}.inv-wrap{padding:0!important}}' +
    '</style></head><body>' +
    '<div class="inv-wrap" style="max-width:800px;margin:0 auto;padding:28px 24px 36px;box-sizing:border-box;">' +

    // Header: logo/brand left, phone+address right
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">' +
      '<tr>' +
        '<td style="vertical-align:top;width:58%;">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
            '<td style="vertical-align:middle;padding-right:12px;">' +
              '<img src="' + emailEscape(logo) + '" alt="All Pro" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:contain;border:0;"/>' +
            '</td>' +
            '<td style="vertical-align:middle;">' +
              '<div style="font-size:20px;font-weight:900;letter-spacing:0.5px;color:#0C1117;line-height:1.15;">ALL PRO</div>' +
              '<div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#C8981F;text-transform:uppercase;margin-top:2px;">Building Supplies LLC</div>' +
            '</td>' +
          '</tr></table>' +
        '</td>' +
        '<td style="vertical-align:top;text-align:right;width:42%;font-size:12px;color:#444;line-height:1.55;">' +
          '<div style="font-weight:700;color:#0C1117;font-size:13px;">732-734-1123</div>' +
          '<div style="white-space:pre-line;margin-top:4px;">' + emailEscape(bizAddr) + '</div>' +
          '<div style="margin-top:4px;"><a href="mailto:info@allprobuildingsupplies.com" style="color:#C8981F;text-decoration:none;">info@allprobuildingsupplies.com</a></div>' +
        '</td>' +
      '</tr>' +
    '</table>' +

    '<div style="border-top:3px solid #C8981F;padding-top:14px;margin-bottom:18px;">' +
      '<div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#0C1117;text-transform:uppercase;">Invoice</div>' +
    '</div>' +

    // Meta + customer
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">' +
      '<tr>' +
        '<td style="vertical-align:top;width:52%;padding-right:16px;">' +
          '<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#888;font-weight:700;margin-bottom:6px;">Bill To</div>' +
          '<div style="font-size:14px;font-weight:700;color:#0C1117;">' + emailEscape(cust.company || cust.name || '') + '</div>' +
          (cust.company && cust.name ? ('<div style="font-size:13px;color:#444;margin-top:2px;">' + emailEscape(cust.name) + '</div>') : '') +
          (cust.email ? ('<div style="font-size:12px;color:#555;margin-top:4px;">' + emailEscape(cust.email) + '</div>') : '') +
          (cust.phone ? ('<div style="font-size:12px;color:#555;">' + emailEscape(cust.phone) + '</div>') : '') +
          (shipTo ? ('<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#888;font-weight:700;margin:12px 0 6px;">Ship To</div><div style="font-size:12px;color:#444;white-space:pre-line;line-height:1.45;">' + emailEscape(shipTo) + '</div>') : '') +
          noteBlock +
        '</td>' +
        '<td style="vertical-align:top;width:48%;">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f8fa;border:1px solid #e5e7eb;">' +
            '<tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;width:42%;">Invoice #</td>' +
                '<td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:700;color:#0C1117;font-family:Consolas,monospace;">' + emailEscape(invNo) + '</td></tr>' +
            '<tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Date</td>' +
                '<td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#222;">' + emailEscape(invDate) + '</td></tr>' +
            '<tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">PO #</td>' +
                '<td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#222;">' + emailEscape(order.po || '—') + '</td></tr>' +
            '<tr><td style="padding:10px 14px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Amount Due</td>' +
                '<td style="padding:10px 14px;font-size:16px;font-weight:900;color:#0C1117;">$' + fee.base.toFixed(2) + '</td></tr>' +
          '</table>' +
          shipLabel +
        '</td>' +
      '</tr>' +
    '</table>' +

    // Line items
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d8dde3;margin-bottom:8px;">' +
      '<tr style="background:#0C1117;">' +
        '<td style="padding:10px;font-size:10px;color:#C8981F;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Product</td>' +
        '<td style="padding:10px 6px;font-size:10px;color:#C8981F;letter-spacing:1px;text-transform:uppercase;font-weight:700;text-align:center;">Ordered</td>' +
        '<td style="padding:10px 6px;font-size:10px;color:#C8981F;letter-spacing:1px;text-transform:uppercase;font-weight:700;text-align:center;">Shipped</td>' +
        '<td style="padding:10px 6px;font-size:10px;color:#C8981F;letter-spacing:1px;text-transform:uppercase;font-weight:700;text-align:center;">Invoice</td>' +
        '<td style="padding:10px 6px;font-size:10px;color:#C8981F;letter-spacing:1px;text-transform:uppercase;font-weight:700;text-align:right;">Unit</td>' +
        '<td style="padding:10px;font-size:10px;color:#C8981F;letter-spacing:1px;text-transform:uppercase;font-weight:700;text-align:right;">Amount</td>' +
      '</tr>' +
      itemsHtml +
    '</table>' +

    // Totals
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">' +
      '<tr><td></td><td style="width:280px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
          '<tr><td style="padding:6px 0;font-size:13px;color:#666;">Invoice total</td>' +
              '<td style="padding:6px 0;font-size:16px;font-weight:900;color:#0C1117;text-align:right;">$' + fee.base.toFixed(2) + '</td></tr>' +
          (fee.pct > 0
            ? ('<tr><td style="padding:4px 0;font-size:12px;color:#888;">Card convenience fee (' + fee.pct + '%)</td>' +
               '<td style="padding:4px 0;font-size:12px;color:#555;text-align:right;">$' + fee.fee.toFixed(2) + '</td></tr>' +
               '<tr><td style="padding:8px 0 0;border-top:2px solid #C8981F;font-size:12px;color:#666;">Card total</td>' +
               '<td style="padding:8px 0 0;border-top:2px solid #C8981F;font-size:15px;font-weight:800;color:#0C1117;text-align:right;">$' + fee.cardTotal.toFixed(2) + '</td></tr>')
            : '') +
        '</table>' +
      '</td></tr>' +
    '</table>' +

    '<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:11px;color:#888;line-height:1.5;">' +
      'Thank you for your business. Remit Zelle / wire / ACH at the invoice total. Card payments include the convenience fee shown above. Include your invoice number in the payment memo.' +
    '</div>' +
    '</div></body></html>';
}

/**
 * QuickBooks-style cover email: amount due + Banquest pay CTA.
 * Formal line items live in the attached PDF (no View/Download link).
 */
function buildInvoiceCoverEmail(order, note, paymentMethods, invoiceViewUrl) {
  const methods = paymentMethods || cachedPaymentMethods || {};
  const fee = invoiceCardFee(order.total, methods);
  const built = buildCardPayUrl(order, methods);
  const custName = (order.customer && order.customer.name) ? order.customer.name : 'there';
  const invNo = order.shipmentId ? (order.id + ' / ' + order.shipmentId) : String(order.id || '');
  const pad = '24px';
  // invoiceViewUrl kept for callers; PDF is attached so we do not show a download link.
  void invoiceViewUrl;
  const payBtn = built.url
    ? ('<a href="' + emailEscape(built.url) + '" style="display:inline-block;margin-top:14px;padding:14px 22px;background:#C8981F;color:#0C1117;text-decoration:none;font-weight:800;font-size:15px;border-radius:4px;letter-spacing:0.3px;border:2px solid #0C1117;">Pay by Card — $' + fee.cardTotal.toFixed(2) + '</a>' +
       (fee.pct > 0 ? ('<div style="font-size:12px;color:#666;margin-top:8px;">Includes ' + fee.pct + '% card convenience fee ($' + fee.fee.toFixed(2) + '). Zelle / wire / ACH stay at $' + fee.base.toFixed(2) + '.</div>') : ''))
    : ('<div style="font-size:13px;color:#444;margin-top:12px;">Call <a href="tel:17327341123" style="color:#C8981F;font-weight:700;text-decoration:none;">732-734-1123</a> to pay by card.</div>');

  const otherPay = [];
  if (methods.zelle) {
    otherPay.push('<div style="margin-top:8px;font-size:13px;color:#333;"><strong>Zelle</strong> — $' + fee.base.toFixed(2) + ' to <strong>' +
      emailEscape(methods.zelle.email || 'payments@allprobuildingsupplies.com') + '</strong>' +
      (methods.zelle.handle ? (' / ' + emailEscape(methods.zelle.handle)) : '') + '</div>');
  }
  if (methods.wire) {
    otherPay.push('<div style="margin-top:6px;font-size:12px;color:#555;"><strong>Wire:</strong> ' +
      emailEscape(String(methods.wire.instructions || '').split('\n')[0]) + '</div>');
  }
  if (methods.ach) {
    otherPay.push('<div style="margin-top:6px;font-size:12px;color:#555;"><strong>ACH:</strong> ' +
      emailEscape(String(methods.ach.instructions || '').split('\n')[0]) + '</div>');
  }

  const rows =
    '<tr><td class="email-pad" style="padding:28px ' + pad + ' 0;">' +
      '<p style="margin:0;font-size:16px;color:#222;">Hi <strong>' + emailEscape(custName) + '</strong>,</p>' +
      '<p style="margin:14px 0 0;font-size:15px;color:#444;line-height:1.6;">Your invoice is ready' +
        (order.shipmentId ? ' for shipment <strong>' + emailEscape(order.shipmentId) + '</strong>' : '') +
        '. The PDF invoice is attached — use the button below to pay by card when you are ready.</p>' +
    '</td></tr>' +
    emailNoteRow(note) +
    '<tr><td class="email-pad" style="padding:20px ' + pad + ' 0;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f8fa;border:1px solid #e5e7eb;border-radius:4px;">' +
        '<tr><td style="padding:18px 20px;">' +
          '<div style="font-size:11px;color:#888;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Invoice</div>' +
          '<div style="font-size:15px;font-weight:700;color:#0C1117;font-family:Consolas,monospace;">' + emailEscape(invNo) + '</div>' +
          '<div style="margin-top:16px;font-size:11px;color:#888;letter-spacing:1.5px;text-transform:uppercase;">Amount due</div>' +
          '<div style="font-size:28px;font-weight:900;color:#0C1117;margin-top:4px;">$' + fee.base.toFixed(2) + '</div>' +
          payBtn +
        '</td></tr>' +
      '</table>' +
    '</td></tr>' +
    (otherPay.length
      ? ('<tr><td class="email-pad" style="padding:16px ' + pad + ' 0;">' +
         '<div style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Other payment options</div>' +
         otherPay.join('') +
         '<div style="font-size:11px;color:#888;margin-top:10px;">Please include invoice <strong>' + emailEscape(invNo) + '</strong> in the payment memo.</div>' +
         '</td></tr>')
      : '') +
    '<tr><td class="email-pad" style="padding:22px ' + pad + ' 28px;">' +
      '<p style="margin:0;font-size:14px;color:#444;line-height:1.6;">Questions? Call <a href="tel:17327341123" style="color:#C8981F;text-decoration:none;font-weight:600;">732-734-1123</a> or email <a href="mailto:info@allprobuildingsupplies.com" style="color:#C8981F;text-decoration:none;">info@allprobuildingsupplies.com</a>.</p>' +
      '<p style="margin:14px 0 0;font-size:13px;color:#888;">Thank you for your business,<br><strong style="color:#0C1117;">All Pro Building Supplies LLC</strong></p>' +
    '</td></tr>';

  return wrapOrderEmail('INVOICE', '#C8981F', '#0C1117', rows, 'Invoice — ' + invNo + ' — All Pro Building Supplies');
}

/**
 * Full-width letter-printable email shell (shared by all admin email formats).
 * Row styles live in a compact stylesheet so large line lists stay under EmailJS 50KB.
 */
function wrapOrderEmail(badgeLabel, badgeBg, badgeColor, bodyRowsHtml, titleOpt) {
  const title = titleOpt || 'All Pro Building Supplies';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>' + emailEscape(title) + '</title>' +
    '<!--[if mso]><style>table,td{font-family:Arial,sans-serif;}</style><![endif]-->' +
    '<style type="text/css">' +
    'html,body{margin:0!important;padding:0!important;width:100%!important}' +
    'body{-webkit-text-size-adjust:100%;font-family:Arial,Helvetica,sans-serif}' +
    'table,td{border-collapse:collapse}' +
    '.er{border-bottom:1px solid #e8e8e8}.e1{background:#e8ecef}' +
    '.ec{padding:8px 10px;font-size:12px;color:#333;vertical-align:top}' +
    '.en{text-align:center;white-space:nowrap}.eright{text-align:right;white-space:nowrap}' +
    '.eb{font-weight:700;color:#c0392b}.ew{font-weight:700;color:#0C1117}.em{color:#666}' +
    '.es{font-size:10px;color:#888}' +
    '@page{size:letter;margin:.4in}' +
    '@media print{html,body{background:#fff!important}.email-outer{padding:0!important;background:#fff!important}.email-shell{width:100%!important;max-width:100%!important}.email-pad{padding-left:14px!important;padding-right:14px!important}}' +
    '@media only screen and (max-width:640px){.email-shell{width:100%!important}.email-pad{padding-left:14px!important;padding-right:14px!important}.email-stack{display:block!important;width:100%!important;border-right:0!important}.email-stack+.email-stack{border-top:1px solid #e8e8e8!important}}' +
    '</style></head><body style="margin:0;padding:0;background:#fff;">' +
    '<table role="presentation" class="email-outer" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#fff;"><tr><td align="center" style="padding:0;">' +
    '<table role="presentation" class="email-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:100%;width:100%;background:#fff;">' +
    '<tr><td class="email-pad" style="background:#0C1117;padding:16px 20px;border-bottom:3px solid #C8981F;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="email-stack" style="vertical-align:middle;"><div style="font-family:Arial,sans-serif;font-size:17px;font-weight:900;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">ALL PRO BUILDING SUPPLIES</div><div style="font-size:10px;color:#C8981F;letter-spacing:2px;text-transform:uppercase;margin-top:2px;">LLC</div></td><td class="email-stack" align="right" style="vertical-align:middle;"><div style="background:' + badgeBg + ';color:' + badgeColor + ';font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 10px;display:inline-block;">' + emailEscape(badgeLabel) + '</div></td></tr></table></td></tr>' +
    bodyRowsHtml +
    '<tr><td class="email-pad" style="background:#0C1117;padding:12px 20px;text-align:center;"><div style="font-size:11px;color:#888;">&copy; 2026 All Pro Building Supplies LLC</div></td></tr>' +
    '</table></td></tr></table></body></html>';
}

function wrapPackingSlipEmail(badgeLabel, badgeBg, badgeColor, bodyRowsHtml) {
  return wrapOrderEmail(badgeLabel, badgeBg, badgeColor, bodyRowsHtml, 'Packing Slip — All Pro Building Supplies');
}

function buildConfirmEmail(order, note) {
  const itemsHtml = emailItemRows(order.items);
  const pad = '28px';
  const poNotesHtml = (order.po || order.notes)
    ? '<tr><td class="email-pad" style="padding:16px ' + pad + ' 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbf0;border:1px solid #f0e0a0;"><tr><td style="padding:14px 18px;"><div style="font-size:12px;color:#666;margin-bottom:4px;"><strong style="color:#333">PO Number:</strong> ' +
      emailEscape(order.po || 'N/A') + '</div><div style="font-size:12px;color:#666;"><strong style="color:#333">Notes:</strong> ' +
      emailEscape(order.notes || 'None') + '</div></td></tr></table></td></tr>'
    : '';
  const rows =
    '<tr><td class="email-pad" style="padding:24px ' + pad + ' 0;"><p style="margin:0;font-size:16px;color:#222;">Hi <strong>' + emailEscape(order.customer.name) + '</strong>,</p><p style="margin:12px 0 0;font-size:15px;color:#444;line-height:1.6;">Here is a copy of your order. If any changes were made by our team, they are reflected below.</p></td></tr>' +
    emailNoteRow(note) +
    '<tr><td class="email-pad" style="padding:20px ' + pad + ' 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f8f8;border:1px solid #e8e8e8;"><tr><td class="email-stack" style="padding:14px 16px;border-right:1px solid #e8e8e8;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Order ID</div><div style="font-size:14px;font-weight:700;color:#C8981F;font-family:monospace;">' + emailEscape(order.id) + '</div></td><td class="email-stack" style="padding:14px 16px;border-right:1px solid #e8e8e8;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Date</div><div style="font-size:14px;color:#222;">' + emailEscape(new Date(order.placedAt).toLocaleDateString()) + '</div></td><td class="email-stack" style="padding:14px 16px;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Status &amp; Logistics</div><div style="font-size:13px;color:#222;"><strong>' + emailEscape(String(order.status || '').toUpperCase()) + '</strong><br>' + emailEscape(order.delivery && order.delivery.address ? order.delivery.address : '') + '</div></td></tr></table></td></tr>' +
    '<tr><td class="email-pad" style="padding:20px ' + pad + ' 0;"><div style="font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;font-weight:700;">Items Ordered</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e8e8e8;"><tr style="background:#0C1117;"><td style="padding:10px 14px;font-size:11px;color:#C8981F;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Product</td><td style="padding:10px 14px;font-size:11px;color:#C8981F;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;text-align:right;">Total</td></tr>' + itemsHtml + '</table></td></tr>' +
    '<tr><td class="email-pad" style="padding:0 ' + pad + ';"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td></td><td style="padding:16px 0;border-top:2px solid #C8981F;width:220px;" align="right"><span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Order Total&nbsp;&nbsp;</span><span style="font-size:22px;font-weight:700;color:#0C1117;">$' + (Number(order.total) || 0).toFixed(2) + '</span></td></tr></table></td></tr>' +
    poNotesHtml +
    '<tr><td class="email-pad" style="padding:0 ' + pad + ';"><hr style="border:none;border-top:1px solid #eee;margin:16px 0 0;"/></td></tr>' +
    '<tr><td class="email-pad" style="padding:20px ' + pad + ' 24px;"><p style="margin:0;font-size:14px;color:#444;line-height:1.7;">Questions about your order?</p><p style="margin:10px 0 0;font-size:14px;color:#444;">📞 <a href="tel:17327341123" style="color:#C8981F;text-decoration:none;font-weight:600;">732-734-1123</a></p><p style="margin:4px 0 0;font-size:14px;color:#444;">✉️ <a href="mailto:info@allprobuildingsupplies.com" style="color:#C8981F;text-decoration:none;">info@allprobuildingsupplies.com</a></p></td></tr>';
  return wrapOrderEmail('ORDER COPY', '#C8981F', '#0C1117', rows);
}

/** Packing slip line rows: Ordered / Prev. shipped / This shipment / Still due (no prices). */
function emailPackingItemRows(items) {
  return (items || []).map(function (i, idx) {
    const ordered = parseInt(i.qtyOrdered != null ? i.qtyOrdered : i.qty, 10) || 0;
    const prev = parseInt(i.qtyPrevShipped, 10);
    const prevQty = Number.isFinite(prev) && prev >= 0 ? prev : 0;
    const thisRaw = i.qtyThisShip != null ? i.qtyThisShip : (i.qtyDelivered != null ? i.qtyDelivered : i.qty);
    const thisShip = parseInt(thisRaw, 10);
    const thisQty = Number.isFinite(thisShip) ? thisShip : 0;
    let back = parseInt(i.qtyBackorder, 10);
    if (!Number.isFinite(back) || back < 0) back = Math.max(0, ordered - (prevQty + thisQty));
    const codeSize = [i.code, i.size].filter(Boolean).join(' · ');
    const alt = idx % 2 ? ' e1' : '';
    const dueCls = back > 0 ? 'ec en er eb' : 'ec en er em';
    return '<tr class="er' + alt + '">' +
      '<td class="ec">' +
        emailEscape((i.description || '') + (i.size ? ' ' + i.size : '')) +
        (codeSize ? '<br><span class="es">' + emailEscape(codeSize) + '</span>' : '') +
      '</td>' +
      '<td class="ec en">' + ordered + '</td>' +
      '<td class="ec en em">' + prevQty + '</td>' +
      '<td class="ec en ew">' + thisQty + '</td>' +
      '<td class="' + dueCls + '">' + back + '</td>' +
    '</tr>';
  }).join('');
}

function buildPackingSlipEmail(order, note) {
  const itemsHtml = emailPackingItemRows(order.items);
  const shipTo = order.delivery && order.delivery.address ? order.delivery.address : '';
  const method = order.delivery && order.delivery.method ? String(order.delivery.method) : '';
  const pad = '20px';
  const shipNum = order.shipmentNumber
    ? ('Shipment ' + order.shipmentNumber + (order.shipmentCount ? ' of ' + order.shipmentCount : ''))
    : '';
  const shipLabel = (order.shipmentId || shipNum)
    ? '<div style="font-size:12px;color:#666;margin-top:6px;"><strong style="color:#333">Shipment:</strong> ' +
      emailEscape(shipNum || '') +
      (order.shipmentId ? (shipNum ? ' · ' : '') + emailEscape(order.shipmentId) : '') +
      (order.shipmentDate ? ' · ' + emailEscape(new Date(order.shipmentDate).toLocaleDateString()) : '') + '</div>'
    : '';
  const poNotesHtml = (order.po || order.notes)
    ? '<tr><td class="email-pad" style="padding:12px ' + pad + ' 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbf0;border:1px solid #f0e0a0;"><tr><td style="padding:10px 14px;"><div style="font-size:12px;color:#666;margin-bottom:2px;"><strong style="color:#333">PO:</strong> ' +
      emailEscape(order.po || 'N/A') + '</div><div style="font-size:12px;color:#666;"><strong style="color:#333">Notes:</strong> ' +
      emailEscape(order.notes || 'None') + '</div>' + shipLabel + '</td></tr></table></td></tr>'
    : (shipLabel
      ? '<tr><td class="email-pad" style="padding:12px ' + pad + ' 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbf0;border:1px solid #f0e0a0;"><tr><td style="padding:10px 14px;">' + shipLabel + '</td></tr></table></td></tr>'
      : '');
  const qtyHead =
    '<td class="ec en" style="background:#0C1117;color:#C8981F;font-size:10px;font-weight:700;text-transform:uppercase;">Ord</td>' +
    '<td class="ec en" style="background:#0C1117;color:#C8981F;font-size:10px;font-weight:700;text-transform:uppercase;">Prev</td>' +
    '<td class="ec en" style="background:#0C1117;color:#C8981F;font-size:10px;font-weight:700;text-transform:uppercase;">This</td>' +
    '<td class="ec en" style="background:#0C1117;color:#C8981F;font-size:10px;font-weight:700;text-transform:uppercase;">Due</td>';
  const rows =
    '<tr><td class="email-pad" style="padding:18px ' + pad + ' 0;"><p style="margin:0;font-size:15px;color:#222;">Hi <strong>' + emailEscape(order.customer.name) + '</strong>,</p><p style="margin:8px 0 0;font-size:13px;color:#444;line-height:1.5;">Packing slip for this shipment — Ordered / Prev. shipped / This shipment / Still due (no pricing).</p></td></tr>' +
    poNotesHtml +
    emailNoteRow(note) +
    '<tr><td class="email-pad" style="padding:14px ' + pad + ' 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f8f8;border:1px solid #e8e8e8;"><tr><td class="email-stack" style="padding:10px 12px;border-right:1px solid #e8e8e8;vertical-align:top;"><div class="es" style="letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Order ID</div><div style="font-size:13px;font-weight:700;color:#C8981F;font-family:monospace;">' + emailEscape(order.id) + '</div></td><td class="email-stack" style="padding:10px 12px;border-right:1px solid #e8e8e8;vertical-align:top;"><div class="es" style="letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Date</div><div style="font-size:13px;color:#222;">' + emailEscape(new Date(order.placedAt).toLocaleDateString()) + '</div></td><td class="email-stack" style="padding:10px 12px;vertical-align:top;"><div class="es" style="letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Ship / Deliver To</div><div style="font-size:12px;color:#222;">' +
      (method ? '<strong>' + emailEscape(method.toUpperCase()) + '</strong><br>' : '') +
      emailEscape(shipTo) +
    '</div></td></tr></table></td></tr>' +
    '<tr><td class="email-pad" style="padding:14px ' + pad + ' 0;"><div class="es" style="letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;font-weight:700;">Packing List</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e8e8e8;"><tr><td class="ec" style="background:#0C1117;color:#C8981F;font-size:10px;font-weight:700;text-transform:uppercase;">Product</td>' +
    qtyHead +
    '</tr>' +
    itemsHtml +
    '</table></td></tr>' +
    '<tr><td class="email-pad" style="padding:14px ' + pad + ' 18px;"><p style="margin:0;font-size:13px;color:#444;">Questions? <a href="tel:17327341123" style="color:#C8981F;text-decoration:none;font-weight:600;">732-734-1123</a> · <a href="mailto:info@allprobuildingsupplies.com" style="color:#C8981F;text-decoration:none;">info@allprobuildingsupplies.com</a></p></td></tr>';
  return wrapPackingSlipEmail('PACKING SLIP', '#2ecc71', '#0C1117', rows);
}

function buildDeliveredEmail(order, note) {
  const pad = '28px';
  const shipBit = order.shipmentId
    ? ' Shipment <strong>' + emailEscape(order.shipmentId) + '</strong> for'
    : '';
  const amountBit = order.shipmentId
    ? '<td class="email-stack" style="padding:14px 16px;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Shipment Total</div><div style="font-size:14px;font-weight:700;color:#0C1117;">$' + (Number(order.total) || 0).toFixed(2) + '</div></td>'
    : '<td class="email-stack" style="padding:14px 16px;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Order Total</div><div style="font-size:14px;font-weight:700;color:#0C1117;">$' + (Number(order.total) || 0).toFixed(2) + '</div></td>';
  const rows =
    '<tr><td class="email-pad" style="padding:24px ' + pad + ' 0;"><p style="margin:0;font-size:16px;color:#222;">Hi <strong>' + emailEscape(order.customer.name) + '</strong>,</p><p style="margin:12px 0 0;font-size:15px;color:#444;line-height:1.6;">Great news!' + shipBit + ' order <strong>' + emailEscape(order.id) + '</strong> has been successfully delivered or picked up.</p><p style="margin:16px 0 0;font-size:15px;color:#444;line-height:1.6;">Thank you for your business. We truly appreciate you choosing All Pro Building Supplies, and we look forward to outfitting your next job.</p></td></tr>' +
    emailNoteRow(note) +
    '<tr><td class="email-pad" style="padding:20px ' + pad + ' 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f8f8;border:1px solid #e8e8e8;"><tr><td class="email-stack" style="padding:14px 16px;border-right:1px solid #e8e8e8;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Order ID</div><div style="font-size:14px;font-weight:700;color:#C8981F;font-family:monospace;">' + emailEscape(order.id) + '</div></td>' + amountBit + '</tr></table></td></tr>' +
    '<tr><td class="email-pad" style="padding:20px ' + pad + ';"><hr style="border:none;border-top:1px solid #eee;margin:0;"/></td></tr>' +
    '<tr><td class="email-pad" style="padding:0 ' + pad + ' 24px;"><p style="margin:0;font-size:14px;color:#444;line-height:1.7;">Questions? We\'re always here:</p><p style="margin:10px 0 0;font-size:14px;color:#444;">📞 <a href="tel:17327341123" style="color:#C8981F;text-decoration:none;font-weight:600;">732-734-1123</a></p><p style="margin:4px 0 0;font-size:14px;color:#444;">✉️ <a href="mailto:info@allprobuildingsupplies.com" style="color:#C8981F;text-decoration:none;">info@allprobuildingsupplies.com</a></p></td></tr>';
  return wrapOrderEmail('ORDER DELIVERED', '#3498db', '#FFFFFF', rows);
}

// Fallback remittance address if API has not yet returned BUSINESS_MAILING_ADDRESS.
// Prefer the value from /api/admin/payment-methods (Worker env BUSINESS_MAILING_ADDRESS).
const APBS_BUSINESS_ADDRESS_FALLBACK = '35 Hope Hill Lane\nLakewood NJ 08701';

function invoiceBusinessAddress(methods) {
  const fromApi = methods && methods.businessAddress != null ? String(methods.businessAddress).trim() : '';
  return fromApi || String(APBS_BUSINESS_ADDRESS_FALLBACK || '').trim();
}

function invoiceCardFee(baseTotal, methods) {
  const pctRaw = methods && methods.card && methods.card.feePercent;
  const pct = Number.isFinite(Number(pctRaw)) ? Number(pctRaw) : 3;
  const base = Math.round((Number(baseTotal) || 0) * 100) / 100;
  const fee = Math.round(base * (pct / 100) * 100) / 100;
  const cardTotal = Math.round((base + fee) * 100) / 100;
  return { pct: pct, base: base, fee: fee, cardTotal: cardTotal };
}

/** Build hosted card URL (Banquest amount = invoice + fee, description = order id). */
function buildCardPayUrl(order, methods) {
  const m = methods || cachedPaymentMethods || {};
  const fee = invoiceCardFee(order && order.total, m);
  const payRef = order && order.shipmentId
    ? (order.id + ' / ' + order.shipmentId)
    : String((order && order.id) || '');
  let cardUrl = (m.card && m.card.url) ? String(m.card.url).trim() : '';
  if (!cardUrl) return { url: '', fee: fee, isBanquest: false };
  const isBanquest = (m.card && m.card.provider === 'banquest') || /pay\.banquest\.com/i.test(cardUrl);
  if (isBanquest) {
    try {
      const u = new URL(cardUrl.split('?')[0]);
      if (fee.cardTotal > 0) u.searchParams.set('amount', fee.cardTotal.toFixed(2));
      if (payRef) u.searchParams.set('description', String(payRef));
      cardUrl = u.toString();
    } catch (_) {
      const sep = cardUrl.indexOf('?') >= 0 ? '&' : '?';
      cardUrl = cardUrl + sep + 'amount=' + encodeURIComponent(fee.cardTotal.toFixed(2)) +
        '&description=' + encodeURIComponent(String(payRef));
    }
  } else if (cardUrl.indexOf('client_reference_id=') === -1 && payRef) {
    const sep = cardUrl.indexOf('?') >= 0 ? '&' : '?';
    cardUrl = cardUrl + sep + 'client_reference_id=' + encodeURIComponent(String(order.id || payRef));
  }
  return { url: cardUrl, fee: fee, isBanquest: isBanquest };
}

function paymentMethodsBlockHtml(methods, order) {
  const m = methods || {};
  const orderRef = emailEscape(order.id) + (order.shipmentId ? ' / ' + emailEscape(order.shipmentId) : '');
  const memo = '*Please include your Order ID (' + orderRef + ') in the memo / reference field.';
  const built = buildCardPayUrl(order, m);
  const fee = built.fee;
  const cardUrl = built.url;
  const sections = [];
  const feeLine = fee.pct > 0
    ? ('<div style="margin-top:8px;padding:10px 12px;background:#fff8e8;border:1px solid #e8d5a3;font-size:13px;color:#34495e;line-height:1.55;">' +
       '<strong>Card total: $' + fee.cardTotal.toFixed(2) + '</strong> (invoice $' + fee.base.toFixed(2) +
       ' + ' + fee.pct + '% convenience fee $' + fee.fee.toFixed(2) + ')<br>' +
       '<span style="font-size:11px;color:#7f8c8d;">This amount is what Banquest should charge — no extra Banquest surcharge. Zelle, wire, and ACH stay at $' + fee.base.toFixed(2) + '.</span></div>')
    : '';
  sections.push(
    '<div style="margin-bottom:14px;"><strong style="color:#0C1117;">Credit / Debit Card</strong><br>' +
    (cardUrl
      ? ('<a href="' + emailEscape(cardUrl) + '" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#C8981F;color:#0C1117;text-decoration:none;font-weight:700;border-radius:4px;">Pay by Card — $' + fee.cardTotal.toFixed(2) + '</a>' +
         '<div style="font-size:12px;color:#555;margin-top:6px;">' + emailEscape((m.card && m.card.note) || ('Pay online. Amount already includes the ' + fee.pct + '% card fee.')) + '</div>')
      : ('<span style="font-size:13px;color:#34495e;">Call <a href="tel:17327341123" style="color:#C8981F;text-decoration:none;font-weight:600;">732-734-1123</a> or email ' +
         '<a href="mailto:payments@allprobuildingsupplies.com?subject=' + encodeURIComponent('Card payment — ' + order.id + ' — $' + fee.cardTotal.toFixed(2)) + '" style="color:#C8981F;">payments@allprobuildingsupplies.com</a> to pay by card.</span>')) +
    feeLine +
    '</div>'
  );
  if (m.zelle) {
    sections.push(
      '<div style="margin-bottom:14px;"><strong style="color:#0C1117;">Zelle</strong> — <strong>$' + fee.base.toFixed(2) + '</strong><br>' +
      '<span style="font-size:13px;color:#34495e;">Send to <strong>' + emailEscape(m.zelle.email || 'payments@allprobuildingsupplies.com') + '</strong>' +
      (m.zelle.handle ? (' or <strong>' + emailEscape(m.zelle.handle) + '</strong>') : '') + '.</span>' +
      (m.zelle.qrUrl
        ? ('<div style="margin-top:8px;"><img src="' + emailEscape(m.zelle.qrUrl) + '" alt="Zelle QR Code" width="140" style="width:140px;max-width:140px;height:auto;border-radius:8px;border:1px solid #ccc;display:block;"></div>')
        : '') +
      '</div>'
    );
  }
  if (m.wire) {
    sections.push(
      '<div style="margin-bottom:14px;"><strong style="color:#0C1117;">Wire Transfer</strong> — <strong>$' + fee.base.toFixed(2) + '</strong><br>' +
      '<span style="font-size:13px;color:#34495e;white-space:pre-line;">' + emailEscape(m.wire.instructions || '') + '</span></div>'
    );
  }
  if (m.ach) {
    sections.push(
      '<div style="margin-bottom:10px;"><strong style="color:#0C1117;">ACH / Bank Transfer</strong> — <strong>$' + fee.base.toFixed(2) + '</strong><br>' +
      '<span style="font-size:13px;color:#34495e;white-space:pre-line;">' + emailEscape(m.ach.instructions || '') + '</span></div>'
    );
  }
  return (
    '<tr><td class="email-pad" style="padding:0 28px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f8ff;border:1px solid #a3d5ff;"><tr><td style="padding:16px 20px;">' +
    '<div style="font-size:13px;font-weight:700;color:#2c3e50;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">How to Pay</div>' +
    sections.join('') +
    '<div style="font-size:11px;color:#7f8c8d;margin-top:4px;">' + memo + '</div>' +
    '</td></tr></table></td></tr>'
  );
}

function buildInvoiceEmail(order, note, paymentMethods) {
  // Cover email only (QuickBooks-style). Formal line items live in the PDF attachment.
  return buildInvoiceCoverEmail(order, note, paymentMethods);
}

function openOrderDocumentPrintWindow(htmlBody, filename, subject) {
  const w = window.open('', '_blank');
  if (!w) {
    throw new Error('Pop-up blocked. Allow pop-ups for this site to download the PDF.');
  }
  const safeTitle = String(filename || subject || 'All-Pro-Document.pdf').replace(/\.pdf$/i, '');
  const printChrome =
    '<div id="apbs-print-bar" style="position:sticky;top:0;z-index:9999;background:#0C1117;color:#fff;font-family:Arial,sans-serif;padding:10px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between;border-bottom:2px solid #C8981F;">' +
    '<div style="font-size:13px;line-height:1.4;"><strong style="color:#C8981F;">Download PDF</strong> — in the print dialog choose <strong>Save as PDF</strong> / <strong>Microsoft Print to PDF</strong>.</div>' +
    '<div style="display:flex;gap:8px;flex-shrink:0;">' +
    '<button type="button" onclick="window.print()" style="background:#C8981F;color:#0C1117;border:none;padding:8px 14px;font-weight:700;cursor:pointer;">Print / Save PDF</button>' +
    '<button type="button" onclick="window.close()" style="background:transparent;color:#fff;border:1px solid #666;padding:8px 14px;cursor:pointer;">Close</button>' +
    '</div></div>' +
    '<style>@media print{#apbs-print-bar{display:none!important}}</style>';

  // Inject toolbar after <body ...>
  let docHtml = String(htmlBody || '');
  if (/<title>.*?<\/title>/i.test(docHtml)) {
    docHtml = docHtml.replace(/<title>.*?<\/title>/i, '<title>' + emailEscape(safeTitle) + '</title>');
  } else {
    docHtml = docHtml.replace(/<head([^>]*)>/i, '<head$1><title>' + emailEscape(safeTitle) + '</title>');
  }
  if (/<body([^>]*)>/i.test(docHtml)) {
    docHtml = docHtml.replace(/<body([^>]*)>/i, '<body$1>' + printChrome);
  } else {
    docHtml = printChrome + docHtml;
  }

  w.document.open();
  w.document.write(docHtml);
  w.document.close();
  try { w.document.title = safeTitle; } catch (_) {}
  // Give images (Zelle QR etc.) a moment, then open print dialog
  setTimeout(function () {
    try { w.focus(); w.print(); } catch (_) {}
  }, 350);
  return w;
}

async function ensurePdfLibLoaded() {
  if (window.PDFLib && window.PDFLib.PDFDocument) return window.PDFLib;
  await new Promise(function (resolve, reject) {
    const existing = document.querySelector('script[data-apbs-pdf-lib]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    s.async = true;
    s.dataset.apbsPdfLib = '1';
    s.onload = resolve;
    s.onerror = function () { reject(new Error('Could not load PDF library')); };
    document.head.appendChild(s);
  });
  if (!window.PDFLib) throw new Error('PDF library unavailable');
  return window.PDFLib;
}

function pdfMoney(n) {
  return '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

/** Compact text PDF of the formal invoice (small enough for EmailJS attachments). */
async function buildInvoicePdfBase64(order, paymentMethods) {
  const PDFLib = await ensurePdfLibLoaded();
  const methods = paymentMethods || cachedPaymentMethods || {};
  const fee = invoiceCardFee(order.total, methods);
  const cust = order.customer || {};
  const invNo = order.shipmentId ? (order.id + ' / ' + order.shipmentId) : String(order.id || '');
  const invDate = new Date(order.shipmentDate || order.placedAt || Date.now()).toLocaleDateString();
  const bizAddr = String(invoiceBusinessAddress(methods) || '35 Hope Hill Lane\nLakewood NJ 08701');
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const pageSize = PDFLib.PageSizes.Letter;
  let page = doc.addPage(pageSize);
  const pageW = page.getWidth();
  const margin = 40;
  let y = page.getHeight() - margin;

  function ensureSpace(need) {
    if (y - need < margin) {
      page = doc.addPage(pageSize);
      y = page.getHeight() - margin;
    }
  }
  function drawText(text, x, yy, size, bold, color) {
    page.drawText(String(text || ''), {
      x: x,
      y: yy,
      size: size || 10,
      font: bold ? fontBold : font,
      color: color || PDFLib.rgb(0.05, 0.07, 0.09)
    });
  }
  function line(yy) {
    page.drawLine({
      start: { x: margin, y: yy },
      end: { x: pageW - margin, y: yy },
      thickness: 1,
      color: PDFLib.rgb(0.78, 0.59, 0.12)
    });
  }

  drawText('ALL PRO BUILDING SUPPLIES LLC', margin, y, 14, true);
  drawText('732-734-1123', pageW - margin - 160, y, 10, true);
  y -= 14;
  drawText('Invoice', margin, y, 11, true, PDFLib.rgb(0.78, 0.59, 0.12));
  const addrLines = bizAddr.split(/\n/).filter(Boolean);
  addrLines.forEach(function (al, i) {
    drawText(al, pageW - margin - 160, y - (i * 11), 9, false, PDFLib.rgb(0.3, 0.3, 0.3));
  });
  y -= 22;
  line(y);
  y -= 18;

  drawText('Invoice #: ' + invNo, margin, y, 10, true); y -= 13;
  drawText('Date: ' + invDate, margin, y, 10, false); y -= 13;
  drawText('PO #: ' + (order.po || '—'), margin, y, 10, false); y -= 13;
  drawText('Amount due: ' + pdfMoney(fee.base), margin, y, 11, true); y -= 18;

  drawText('Bill To', margin, y, 9, true, PDFLib.rgb(0.45, 0.45, 0.45)); y -= 12;
  drawText(cust.company || cust.name || '', margin, y, 11, true); y -= 12;
  if (cust.company && cust.name) { drawText(cust.name, margin, y, 10, false); y -= 12; }
  if (cust.email) { drawText(cust.email, margin, y, 9, false, PDFLib.rgb(0.35, 0.35, 0.35)); y -= 11; }
  if (cust.phone) { drawText(cust.phone, margin, y, 9, false, PDFLib.rgb(0.35, 0.35, 0.35)); y -= 11; }
  const shipTo = order.delivery && order.delivery.address ? String(order.delivery.address) : '';
  if (shipTo) {
    y -= 6;
    drawText('Ship To', margin, y, 9, true, PDFLib.rgb(0.45, 0.45, 0.45)); y -= 12;
    shipTo.split(/\n/).forEach(function (al) {
      drawText(al, margin, y, 9, false); y -= 11;
    });
  }
  if (order.notes) {
    y -= 4;
    drawText('Notes: ' + String(order.notes).replace(/\s+/g, ' ').slice(0, 140), margin, y, 9, false);
    y -= 14;
  }

  y -= 6;
  ensureSpace(30);
  // Header row
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: pageW - margin * 2,
    height: 16,
    color: PDFLib.rgb(0.05, 0.07, 0.09)
  });
  const cols = [
    { label: 'Product', x: margin + 4, w: 220 },
    { label: 'Ord', x: margin + 230, w: 36 },
    { label: 'Ship', x: margin + 270, w: 36 },
    { label: 'Inv', x: margin + 310, w: 36 },
    { label: 'Unit', x: margin + 360, w: 50 },
    { label: 'Amount', x: margin + 420, w: 70 }
  ];
  cols.forEach(function (c) {
    drawText(c.label, c.x, y, 8, true, PDFLib.rgb(0.78, 0.59, 0.12));
  });
  y -= 18;

  (order.items || []).forEach(function (item, idx) {
    ensureSpace(28);
    if (idx % 2) {
      page.drawRectangle({
        x: margin,
        y: y - 4,
        width: pageW - margin * 2,
        height: 24,
        color: PDFLib.rgb(0.95, 0.96, 0.97)
      });
    }
    const ordered = parseInt(item.qtyOrdered != null ? item.qtyOrdered : item.qty, 10) || 0;
    const shipped = parseInt(
      item.qtyShipped != null
        ? item.qtyShipped
        : ((parseInt(item.qtyPrevShipped, 10) || 0) + (parseInt(item.qtyThisShip, 10) || 0)),
      10
    ) || 0;
    const invQty = parseInt(
      item.qtyThisShip != null ? item.qtyThisShip : (item.qtyDelivered != null ? item.qtyDelivered : item.qty),
      10
    ) || 0;
    const unit = Number(item.unitPrice) || 0;
    const amount = Number.isFinite(Number(item.lineTotal)) ? Number(item.lineTotal) : unit * invQty;
    const desc = String((item.description || '') + (item.size ? (' ' + item.size) : '')).slice(0, 42);
    drawText(desc, cols[0].x, y + 6, 8, true);
    if (item.code) drawText(String(item.code).slice(0, 28), cols[0].x, y - 5, 7, false, PDFLib.rgb(0.45, 0.45, 0.45));
    drawText(String(ordered), cols[1].x, y, 8, false);
    drawText(String(shipped), cols[2].x, y, 8, false);
    drawText(String(invQty), cols[3].x, y, 8, true);
    drawText(pdfMoney(unit), cols[4].x, y, 8, false);
    drawText(pdfMoney(amount), cols[5].x, y, 8, true);
    y -= 26;
  });

  y -= 8;
  ensureSpace(50);
  drawText('Invoice total', pageW - margin - 160, y, 10, false, PDFLib.rgb(0.35, 0.35, 0.35));
  drawText(pdfMoney(fee.base), pageW - margin - 70, y, 12, true);
  y -= 14;
  if (fee.pct > 0) {
    drawText('Card fee (' + fee.pct + '%)', pageW - margin - 160, y, 9, false, PDFLib.rgb(0.45, 0.45, 0.45));
    drawText(pdfMoney(fee.fee), pageW - margin - 70, y, 9, false);
    y -= 14;
    drawText('Card total', pageW - margin - 160, y, 10, true);
    drawText(pdfMoney(fee.cardTotal), pageW - margin - 70, y, 11, true);
  }

  const bytes = await doc.save();
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

global.APBSDocs = {
  setPaymentMethods: function (m) { cachedPaymentMethods = m || {}; },
  getPaymentMethods: function () { return cachedPaymentMethods || {}; },
  priorShippedQtyForLine: priorShippedQtyForLine,
  orderViewForShipment: orderViewForShipment,
  emailEscape: emailEscape,
  minifyEmailHtml: minifyEmailHtml,
  emailNoteRow: emailNoteRow,
  emailItemRows: emailItemRows,
  invoiceLogoUrl: invoiceLogoUrl,
  emailInvoiceItemRows: emailInvoiceItemRows,
  buildInvoicePdfDocument: buildInvoicePdfDocument,
  buildInvoiceCoverEmail: buildInvoiceCoverEmail,
  wrapOrderEmail: wrapOrderEmail,
  wrapPackingSlipEmail: wrapPackingSlipEmail,
  buildConfirmEmail: buildConfirmEmail,
  emailPackingItemRows: emailPackingItemRows,
  buildPackingSlipEmail: buildPackingSlipEmail,
  buildDeliveredEmail: buildDeliveredEmail,
  invoiceBusinessAddress: invoiceBusinessAddress,
  invoiceCardFee: invoiceCardFee,
  buildCardPayUrl: buildCardPayUrl,
  paymentMethodsBlockHtml: paymentMethodsBlockHtml,
  buildInvoiceEmail: buildInvoiceEmail,
  pdfMoney: pdfMoney,
  ensurePdfLibLoaded: ensurePdfLibLoaded,
  buildInvoicePdfBase64: buildInvoicePdfBase64,
  openOrderDocumentPrintWindow: openOrderDocumentPrintWindow
};
})(typeof window !== 'undefined' ? window : globalThis);
