export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/sumup-checkout') {
      return new Response('Not found', { status: 404 });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { amount, currency = 'EUR', description = 'Payment', reference } = await request.json();
      if (!amount || isNaN(Number(amount))) {
        return new Response(JSON.stringify({ error: 'invalid_amount' }), { status: 400 });
      }
      const payload = {
        checkout_reference: reference || `order_${Date.now()}`,
        amount: Number(amount),
        currency,
        pay_to_email: env.SUMUP_PAY_TO_EMAIL,
        merchant_code: env.SUMUP_MERCHANT_CODE,
        description,
        return_url: env.SUMUP_RETURN_URL || `https://${url.hostname}/confirmation`
      };

      const r = await fetch('https://api.sumup.com/v0.1/checkouts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SUMUP_SECRET_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await r.json();
      if (!r.ok) {
        return new Response(JSON.stringify({ error: 'sumup_error', details: data }), { status: r.status });
      }
      return new Response(JSON.stringify({ id: data.id }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'checkout_error', message: String(e) }), { status: 500 });
    }
  }
}

