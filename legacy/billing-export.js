/*
 * billing-export.js
 * Exports invoices in the semicolon format our accounting
 * customers import. Written in 2014. No tests. Customers have
 * import macros built on this exact output, so "fixing"
 * anything here can break their books.
 */

var TAX = 0.19;
var SEP = ';';
var HEADER = 'No;Date;Customer;Net;Tax;Gross';

// globals, shared between calls (yes, really)
var rows = [];
var lastExportCount = 0;

function round2(n) {
  // half up, per line. Customers reconcile tax line by line,
  // so this must stay per line even though rounding the total
  // would be "more correct".
  return Math.round(n * 100) / 100;
}

function fmtDate(iso) {
  // M/D/YY with no zero padding. The importer on the other
  // side expects it.
  var d = new Date(iso);
  var m = d.getUTCMonth() + 1;
  var yy = String(d.getUTCFullYear()).substr(2);
  return m + '/' + d.getUTCDate() + '/' + yy;
}

function exportInvoices(invoices, opts, cb) {
  if (typeof opts == 'function') {
    cb = opts;
    opts = {};
  }
  rows = [];
  var grand = 0;
  for (var i = 0; i < invoices.length; i++) {
    var inv = invoices[i];
    if (!inv.lines || !inv.lines.length) {
      return process.nextTick(function () {
        cb(new Error('invoice ' + inv.no + ' has no lines'));
      });
    }
    var net = 0;
    var tax = 0;
    for (var j = 0; j < inv.lines.length; j++) {
      var amt = inv.lines[j].qty * inv.lines[j].price;
      net = net + amt;
      tax = tax + round2(amt * TAX);
    }
    var name = inv.customer;
    if (opts.upperCaseNames) name = name.toUpperCase();
    rows.push([inv.no, fmtDate(inv.date), name, net.toFixed(2),
      tax.toFixed(2), (net + tax).toFixed(2)].join(SEP));
    grand += net + tax;
  }
  var total = ['TOTAL', '', '', '', '', grand.toFixed(2)];
  rows.push(total.join(SEP));
  lastExportCount = invoices.length;
  process.nextTick(function () {
    cb(null, HEADER + '\n' + rows.join('\n') + '\n');
  });
}

module.exports = {
  exportInvoices: exportInvoices,
  lastCount: function () {
    return lastExportCount;
  },
};
