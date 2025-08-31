import React, { useEffect, useRef, useState } from 'react';

// DEMO ONLY — Do not hardcode secrets in production apps.
const SUMUP_PUBLIC_API_KEY = 'sup_pk_sqF1jxa2zIFtMYGPcr92JsOAkkdC1TwGL';
const SUMUP_SECRET_API_KEY = 'sup_sk_0g4b3l3t3r_g0bl3d1g00k_f4k3_k3y';
const SUMUP_MERCHANT_CODE = 'TCF4K3M3RCH4NT';

declare global {
  interface Window {
    SumUpCard?: {
      mount: (config: {
        id: string;
        checkoutId: string;
        publicKey: string;
        onResponse?: (type: 'success' | 'error', body: any) => void;
      }) => { unmount?: () => void } | void;
    };
  }
}

type Props = {
  amount: number; // cart total
  currency?: string; // default EUR
  description?: string; // description shown in SumUp
};

const CORS_CHECKOUT_URL = 'https://proxy.cors.sh/https://api.sumup.com/v0.1/checkouts';
const SDK_SRC = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js';

export const CheckoutPage: React.FC<Props> = ({ amount, currency = 'EUR', description = 'Payment for course(s) at Agentes.academy' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const sumupInstance = useRef<{ unmount?: () => void } | null>(null);

  // Phase 1: Create the checkout
  useEffect(() => {
    let cancelled = false;
    async function createCheckout() {
      try {
        setIsLoading(true);
        setError(null);
        const body = {
          checkout_reference: `order_${Date.now()}`,
          amount: Number(amount),
          currency,
          pay_to_email: 'test-merchant@example.com',
          merchant_code: SUMUP_MERCHANT_CODE,
          description,
          return_url: 'https://your-domain.com/#/confirmation'
        };

        const res = await fetch(CORS_CHECKOUT_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUMUP_SECRET_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const data = await res.text();
          throw new Error(`Checkout failed: ${res.status} ${data}`);
        }
        const data = await res.json();
        if (!cancelled) setCheckoutId(data.id);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to create checkout');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    createCheckout();
    return () => {
      cancelled = true;
    };
  }, [amount, currency, description]);

  // Phase 2: Load SDK and mount widget after we have a checkoutId
  useEffect(() => {
    if (!checkoutId) return;

    function mountWidget() {
      if (!window.SumUpCard) return;
      const maybeInstance = window.SumUpCard.mount({
        id: 'sumup-card-widget',
        checkoutId,
        publicKey: SUMUP_PUBLIC_API_KEY,
        onResponse: (type, body) => {
          if (type === 'success') {
            // Navigate to confirmation page in a real app
            // For demo we just log
            console.log('Payment success', body);
          } else {
            setError(body?.message || 'Payment error');
          }
        }
      });
      if (maybeInstance && typeof maybeInstance === 'object') {
        sumupInstance.current = maybeInstance as { unmount?: () => void };
      }
    }

    // load script if needed
    const existing = document.getElementById('sumup-card-sdk');
    if (existing) {
      mountWidget();
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.id = 'sumup-card-sdk';
    s.onload = mountWidget;
    s.onerror = () => setError('Failed to load SumUp SDK');
    document.body.appendChild(s);

    return () => {
      if (sumupInstance.current?.unmount) {
        try { sumupInstance.current.unmount!(); } catch {}
      }
    };
  }, [checkoutId]);

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <h1>Checkout</h1>
      {isLoading && <p>Loading payment...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!isLoading && !error && checkoutId && (
        <div id="sumup-card-widget" />
      )}
    </div>
  );
};

export default CheckoutPage;

