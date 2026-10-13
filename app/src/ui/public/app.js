// Browser code for the invoice form. Plain JavaScript, no
// build step.
const form = document.querySelector('#invoice-form');
const clientSelect = document.querySelector('#client');
const status = document.querySelector('#status');

async function loadClients() {
  const clients = await (await fetch('/api/clients')).json();
  for (const client of clients) {
    clientSelect.append(
      new Option(client.name, String(client.id)),
    );
  }
}

// Same rule as app/src/domain/money.ts: integer cents in, text
// out, no floats.
function formatCents(cents) {
  const fraction = String(cents % 100).padStart(2, '0');
  return `${Math.floor(cents / 100)}.${fraction}`;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

// Creates the invoice, then marks it sent. Prices stay text;
// the server parses them into cents.
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = new FormData(form);
  try {
    const invoice = await postJson('/api/invoices', {
      clientId: Number(fields.get('client')),
      lines: [
        {
          description: fields.get('description'),
          quantity: Number(fields.get('quantity')),
          unitPrice: fields.get('unitPrice'),
        },
      ],
    });
    const sent = await postJson(
      `/api/invoices/${invoice.id}/send`,
      {},
    );
    const total = formatCents(sent.totalCents);
    const number = `Invoice ${sent.number}`;
    status.textContent = `${number} sent. Total ${total}`;
  } catch (error) {
    status.textContent = `Not sent: ${error.message}`;
  }
});

loadClients();
