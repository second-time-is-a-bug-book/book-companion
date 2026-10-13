import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  escapeHtml,
  renderInvoiceList,
} from '../src/ui/pages.ts';

test('the list shows each invoice with its total', () => {
  const html = renderInvoiceList([
    {
      number: 'INV-0001',
      clientName: 'Ada Studio',
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      status: 'sent',
      subtotalCents: 1000,
      taxCents: 200,
      totalCents: 1200,
    },
  ]);
  assert.match(html, /<td>INV-0001<\/td>/);
  assert.match(html, /<td class="amount">12.00<\/td>/);
});

test('client names are escaped', () => {
  assert.equal(
    escapeHtml(`<b>"Tom" & 'Jerry'</b>`),
    '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;',
  );
});
