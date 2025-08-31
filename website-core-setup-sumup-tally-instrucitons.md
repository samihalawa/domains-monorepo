Title: Website Core Setup — Shared Contact/Newsletter (Tally) + Payments (SumUp) + Polished Footer

Purpose: A reusable, step-by-step prompt/instructions to implement common site elements across static sites or SPAs in this monorepo without repeating code, while keeping branding flexible per site.

Scope
- Add shared, embeddable components:
  - Contact form (Tally embed)
  - Newsletter form (Tally embed)
  - Polished footer with Agents AI Limited details
- Add payments via SumUp card widget
- Keep styling decoupled so per‑site themes can vary; only common elements share consistent markup and base classes.

Assumptions
- Sites are static (served via Cloudflare Pages) and/or SPA.
- Router Worker forwards requests based on hostname.
- For payments:
  - Preferred: create checkouts on a secure backend (Cloudflare Worker) using SumUp Secret.
  - Demo‑only fallback: frontend creates checkout via CORS proxy (NOT for production).

Deliverables
1) Shared partials: a small HTML+CSS+JS include for Tally and Footer.
2) SumUp integration (secure Worker + frontend mount), plus demo‑only variant.
3) Minimal integration changes in each site page.

---

1) Shared Elements — Markup, Styles, and Loader

Use these canonical snippets. Keep them as shared partials (e.g., `/statics/shared/tally-footer.html` and `/statics/shared/tally-footer.css`) or inline per site if not using includes. Adjust classes to match each site’s palette.

1.1 Tally Loader (single load, supports dynamic height)
<script>
  (function loadTally(){
    var d=document, w='https://tally.so/widgets/embed.js';
    var v=function(){
      if(typeof Tally!=='undefined') Tally.loadEmbeds();
      else d.querySelectorAll('iframe[data-tally-src]:not([src])')
        .forEach(function(e){ e.src=e.dataset.tallySrc; });
    };
    if(d.querySelector('script[src="'+w+'"]')) { v(); return; }
    var s=d.createElement('script'); s.src=w; s.onload=v; s.onerror=v; d.head.appendChild(s);
  })();
</script>

1.2 Newsletter Block (Tally)
<section id="newsletter" class="shared-newsletter">
  <h2 class="shared-title">Stay in the loop</h2>
  <p class="shared-sub">Fresh updates, launches, and guides.</p>
  <div class="shared-form">
    <iframe
      data-tally-src="https://tally.so/embed/mY1V66?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
      loading="lazy" width="100%" height="180" frameborder="0" marginheight="0" marginwidth="0"
      title="Newsletter"></iframe>
  </div>
</section>

1.3 Contact Block (Tally)
<section id="contact" class="shared-contact">
  <h2 class="shared-title">Get in touch</h2>
  <p class="shared-sub">We usually reply in under 24 hours.</p>
  <div class="shared-form">
    <iframe
      data-tally-src="https://tally.so/embed/wz9VVq?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
      loading="lazy" width="100%" height="480" frameborder="0" marginheight="0" marginwidth="0"
      title="Contact"></iframe>
  </div>
</section>

1.4 Polished Footer (Agents AI Limited)
<footer class="shared-footer" role="contentinfo" itemscope itemtype="https://schema.org/Organization">
  <div class="shared-footer-wrap">
    <div class="shared-footer-brand">
      <div class="shared-logo" itemprop="name">Agents AI Limited</div>
      <div class="shared-reg">Reg. No: <span itemprop="taxID">16570822</span></div>
    </div>
    <address class="shared-address" itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
      <div><span itemprop="streetAddress">27 Old Gloucester Street</span></div>
      <div>
        <span itemprop="addressLocality">London</span>
        <span itemprop="postalCode">WC1N 3AX</span>
      </div>
      <div><span itemprop="addressCountry">United Kingdom</span></div>
    </address>
    <div class="shared-contactpoints">
      <a href="mailto:info@AgentsAI.ltd" itemprop="email">info@AgentsAI.ltd</a>
      <a href="tel:+447883306011" itemprop="telephone">+44 7883 306011</a>
    </div>
    <div class="shared-footnote">© <span id="year"></span> Agents AI Limited. All rights reserved.</div>
  </div>
  <script>document.getElementById('year').textContent = new Date().getFullYear();</script>
</footer>

1.5 Base Styles (adjust per site theme)
<style>
  :root { --muted:#9ca3af; --text:#e5e7eb; --bg:#0f172a; --card:#111827; --accent:#60a5fa; }
  .shared-title{font-size:clamp(1.4rem,2.5vw,2rem);margin:0 0 .4rem 0}
  .shared-sub{color:var(--muted);margin:0 0 1rem 0}
  .shared-form{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:6px}
  .shared-footer{margin-top:48px;border-top:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(17,24,39,.4),rgba(17,24,39,.7));color:var(--text)}
  .shared-footer-wrap{max-width:1100px;margin:0 auto;padding:24px 20px;display:grid;gap:16px;grid-template-columns:1fr 1fr 1fr 1fr}
  .shared-logo{font-weight:700;letter-spacing:.2px}
  .shared-reg,.shared-footnote{color:var(--muted)}
  .shared-address div{color:var(--text)}
  .shared-contactpoints a{display:block;color:#fff;text-decoration:none}
  .shared-contactpoints a:hover{color:var(--accent)}
  @media (max-width:760px){.shared-footer-wrap{grid-template-columns:1fr;}}
</style>

Integration Checklist (Shared Elements)
- Place the loader script once per page (anywhere before closing body).
- Add Newsletter and Contact sections where appropriate.
- Add the Footer at the bottom.
- Optionally split these into shared files and include during your build.

---

2) SumUp Payments — Secure Worker + Frontend (Recommended)

Goal: Create a payment checkout server‑side (to keep secrets safe), then mount SumUp’s card widget client‑side.

2.1 Cloudflare Worker (secure checkout creation)
// workers/payments-sumup/index.js
export default {
  async fetch(req, env) {
    if (new URL(req.url).pathname !== '/api/sumup-checkout')
      return new Response('Not found', { status: 404 });

    if (req.method !== 'POST')
      return new Response('Method not allowed', { status: 405 });

    try {
      const { amount, currency = 'EUR', description = 'Payment', reference } = await req.json();
      const body = {
        checkout_reference: reference || `order_${Date.now()}`,
        amount,
        currency,
        pay_to_email: env.SUMUP_PAY_TO_EMAIL,
        merchant_code: env.SUMUP_MERCHANT_CODE,
        description,
        return_url: env.SUMUP_RETURN_URL || 'https://example.com/confirmation'
      };

      const r = await fetch('https://api.sumup.com/v0.1/checkouts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SUMUP_SECRET_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok) return new Response(JSON.stringify(data), { status: r.status });
      return new Response(JSON.stringify({ id: data.id }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'checkout_error', message: String(e) }), { status: 500 });
    }
  }
}

// workers/payments-sumup/wrangler.toml
name = "payments-sumup"
main = "index.js"
compatibility_date = "2024-03-01"

// Set secrets (wrangler secret put ...)
// SUMUP_SECRET_API_KEY
// SUMUP_MERCHANT_CODE
// SUMUP_PAY_TO_EMAIL
// SUMUP_RETURN_URL

2.2 Frontend Mount (static page or SPA)
<!-- Somewhere in the payment page -->
<div id="sumup-card-widget"></div>

<script>
  async function createCheckout(amount, currency, description){
    const r = await fetch('/api/sumup-checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, description })
    });
    if(!r.ok) throw new Error('Failed to create checkout');
    const { id } = await r.json();
    return id;
  }

  function loadSumUp(cb){
    const id='sumup-card-sdk';
    if(document.getElementById(id)) return cb();
    const s=document.createElement('script'); s.id=id; s.src='https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js';
    s.onload=cb; s.onerror=()=>console.error('SumUp SDK failed');
    document.body.appendChild(s);
  }

  (async function initPayment(){
    try{
      const checkoutId = await createCheckout(99.00, 'EUR', 'Example payment');
      loadSumUp(function(){
        if(!window.SumUpCard){ console.error('SDK not available'); return; }
        window.SumUpCard.mount({
          id: 'sumup-card-widget',
          checkoutId,
          publicKey: window.SUMUP_PUBLIC_API_KEY || 'REPLACE_WITH_PUBLIC_KEY',
          onResponse: function(type, body){
            if(type==='success'){
              console.log('Paid', body);
              // Navigate or show success state
            } else {
              console.warn('Payment error', body);
            }
          }
        });
      });
    }catch(e){ console.error(e); }
  })();
</script>

Notes
- Never expose the SumUp secret in production frontend code.
- Keep the Worker small and dedicated to the single action.

---

3) SumUp Payments — Demo‑Only Frontend (CORS Proxy)

This follows the local guidance you documented for React/TS. Use ONLY for demos/tests. Do NOT ship with secrets in public code.

Key points (from your guide):
- Create checkout via POST to `https://proxy.cors.sh/https://api.sumup.com/v0.1/checkouts` with headers:
  - `Authorization: Bearer <SUMUP_SECRET_API_KEY>`
  - `Content-Type: application/json`
- Mount widget via `https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js` and `window.SumUpCard.mount({ id, checkoutId, publicKey, onResponse })`.

4) Integration Steps (Per Site)
1. Add the Tally loader script once per page.
2. Insert Newsletter and Contact sections where appropriate.
3. Insert the Footer at the bottom.
4. If payments are needed on the site:
   - Prefer the secure Worker flow (section 2) and mount the SumUp widget.
   - For demos only, use the CORS proxy method (section 3).
5. Keep site‑specific style by overriding `.shared-*` classes (colors, spacing, typography).

5) QA Checklist
- Tally iframes have `data-tally-src` and the loader injected exactly once.
- Footer shows correct business info and current year.
- SumUp flow creates a checkout and mounts widget; `onResponse` handles success/error.
- No secrets are present in production frontend bundles.

