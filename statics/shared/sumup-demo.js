// SumUp frontend-only DEMO helper
// WARNING: Do not use hardcoded secrets in production.
// Uses CORS proxy to create a checkout, then mounts the SumUp card widget.

export async function initSumUpDemo({
  amount = 9.99,
  currency = 'EUR',
  description = 'Demo payment',
  publicKey,
  secretKey,
  merchantCode,
  payToEmail,
  widgetId = 'sumup-card-widget'
} = {}) {
  if (!publicKey || !secretKey || !merchantCode || !payToEmail) {
    console.error('Missing SumUp config');
    return;
  }

  const createCheckout = async () => {
    const body = {
      checkout_reference: `order_${Date.now()}`,
      amount: Number(amount),
      currency,
      pay_to_email: payToEmail,
      merchant_code: merchantCode,
      description
      // Intentionally omit return_url to let SumUp handle default flow
    };
    const r = await fetch('https://proxy.cors.sh/https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('Failed to create checkout');
    const data = await r.json();
    return data.id;
  };

  const loadSDK = (cb) => {
    const id = 'sumup-card-sdk';
    if (document.getElementById(id)) return cb();
    const s = document.createElement('script');
    s.id = id; s.src = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js';
    s.onload = cb; s.onerror = () => console.error('SumUp SDK failed to load');
    document.body.appendChild(s);
  };

  try {
    const checkoutId = await createCheckout();
    loadSDK(() => {
      if (!window.SumUpCard) return console.error('SumUp SDK unavailable');
      window.SumUpCard.mount({
        id: widgetId,
        checkoutId,
        publicKey,
        onResponse: (type, body) => {
          if (type === 'success') console.log('Payment success', body);
          else console.warn('Payment failed', body);
        }
      });
    });
  } catch (e) {
    console.error(e);
  }
}

