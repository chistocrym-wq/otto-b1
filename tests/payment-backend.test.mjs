import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPaymentEnvironment,
  paymentMatchesEnvironment,
} from '../netlify/lib/payment-environment.js';
import {
  createPayment,
  verifyPayment,
  verifyRefund,
} from '../netlify/lib/payment-provider.js';
import {
  PAYMENT_RECEIPT_PAYMENT_MODE,
} from '../netlify/lib/payment-receipt.js';
import { handleCreatePayment } from '../netlify/functions/create-payment.js';
import { handlePaymentWebhook } from '../netlify/functions/payment-webhook.js';
import { getOttoVerifiedEmail } from '../netlify/lib/otto-supabase.js';
import {
  developerAccessAllowed,
  loadPaidSubscriptionState,
  trainingAccessAllowed,
  TRIAL_MS,
} from '../netlify/functions/account-access.js';

const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';
const TEST_REFERENCE = '11111111-1111-4111-8111-111111111111';

function successfulPayment(overrides = {}) {
  return {
    id: 'yookassa-payment-1',
    status: 'succeeded',
    paid: true,
    amount: {
      value: '1500.00',
      currency: 'RUB',
    },
    test: true,
    metadata: {
      otto_user_id: TEST_USER_ID,
      otto_payment_reference: TEST_REFERENCE,
      otto_period_days: '30',
      otto_environment: 'test',
    },
    ...overrides,
  };
}

async function withMockYooKassa(payment, fn) {
  const previousFetch = globalThis.fetch;
  const previousNetlify = globalThis.Netlify;

  globalThis.Netlify = {
    env: {
      get(name) {
        if (name === 'PAYMENT_PROVIDER_SHOP_ID') return '1294607';
        if (name === 'PAYMENT_PROVIDER_SECRET') return 'test-secret';
        return '';
      },
    },
  };

  globalThis.fetch = async () => new Response(
    JSON.stringify(payment),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );

  try {
    return await fn();
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.Netlify = previousNetlify;
  }
}

async function captureYooKassaCreate(fn) {
  const previousFetch = globalThis.fetch;
  const previousNetlify = globalThis.Netlify;
  let fetchCalls = 0;
  let requestBody = null;

  globalThis.Netlify = {
    env: {
      get(name) {
        if (name === 'PAYMENT_PROVIDER_SHOP_ID') return '1294607';
        if (name === 'PAYMENT_PROVIDER_SECRET') return 'test-secret';
        return '';
      },
    },
  };

  globalThis.fetch = async (_url, options) => {
    fetchCalls += 1;
    requestBody = JSON.parse(String(options?.body || '{}'));

    return new Response(JSON.stringify({
      id: 'created-test-payment',
      status: 'pending',
      confirmation: {
        confirmation_url: 'https://yookassa.test/confirm',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = await fn();
    return { result, fetchCalls, requestBody };
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.Netlify = previousNetlify;
  }
}

test('payment environment is derived only from Netlify deploy context', () => {
  assert.equal(
    getPaymentEnvironment({ deploy: { context: 'deploy-preview' } }),
    'test',
  );
  assert.equal(
    getPaymentEnvironment({ deploy: { context: 'production' } }),
    'live',
  );
  assert.equal(
    getPaymentEnvironment({ deploy: { context: 'branch-deploy' } }),
    null,
  );
  assert.equal(
    getPaymentEnvironment({ deploy: { context: 'dev' } }),
    null,
  );
  assert.equal(getPaymentEnvironment({}), null);

  assert.equal(paymentMatchesEnvironment(true, 'test'), true);
  assert.equal(paymentMatchesEnvironment(false, 'live'), true);
  assert.equal(paymentMatchesEnvironment(false, 'test'), false);
  assert.equal(paymentMatchesEnvironment(true, 'live'), false);
});

test('verified email lookup uses only verified email identity for the user', async () => {
  const previousFetch = globalThis.fetch;
  const previousNetlify = globalThis.Netlify;
  let requestedUrl = '';

  globalThis.Netlify = {
    env: {
      get(name) {
        if (name === 'OTTO_SUPABASE_URL') return 'https://otto-supabase.example';
        if (name === 'OTTO_SUPABASE_ANON_KEY') return 'anon-test';
        if (name === 'OTTO_SUPABASE_TOKEN') return 'token-test';
        return '';
      },
    },
  };

  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify([
      { provider_user_id: 'Verified.User@Example.com' },
    ]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const email = await getOttoVerifiedEmail(TEST_USER_ID);
    const url = new URL(requestedUrl);

    assert.equal(email, 'verified.user@example.com');
    assert.equal(url.pathname, '/rest/v1/user_identities');
    assert.equal(url.searchParams.get('user_id'), `eq.${TEST_USER_ID}`);
    assert.equal(url.searchParams.get('provider'), 'eq.email');
    assert.equal(url.searchParams.get('verified_at'), 'not.is.null');
    assert.equal(url.searchParams.get('select'), 'provider_user_id');
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.Netlify = previousNetlify;
  }
});

test('create payment sends verified email and exact fiscal receipt', async () => {
  const { fetchCalls, requestBody } = await captureYooKassaCreate(() =>
    createPayment({
      userId: TEST_USER_ID,
      amountMinor: 150000,
      currency: 'RUB',
      environment: 'test',
      verifiedEmail: 'Verified.User@Example.com',
      paymentMode: PAYMENT_RECEIPT_PAYMENT_MODE,
      periodDays: 30,
      description: 'OTTO A1 — полный доступ на 30 дней',
      returnUrl: 'https://preview.example/?payment=return',
    }),
  );

  assert.equal(PAYMENT_RECEIPT_PAYMENT_MODE, 'full_payment');
  assert.equal(fetchCalls, 1);
  assert.equal(requestBody.amount.value, '1500.00');
  assert.equal(requestBody.amount.currency, 'RUB');
  assert.equal(requestBody.receipt.customer.email, 'verified.user@example.com');
  assert.equal(requestBody.receipt.tax_system_code, 2);

  const [item] = requestBody.receipt.items;
  assert.equal(item.description, 'Доступ к онлайн-тренажёру OTTO A1 на 30 дней');
  assert.equal(item.quantity, 1);
  assert.equal(item.amount.value, requestBody.amount.value);
  assert.equal(item.amount.currency, requestBody.amount.currency);
  assert.equal(item.vat_code, 1);
  assert.equal(item.payment_subject, 'service');
  assert.equal(item.payment_mode, 'full_payment');
  assert.equal(item.measure, 'piece');
});

test('invalid receipt payment mode blocks YooKassa API call', async () => {
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('must_not_be_called');
  };

  try {
    await assert.rejects(
      createPayment({
        userId: TEST_USER_ID,
        amountMinor: 150000,
        currency: 'RUB',
        environment: 'test',
        verifiedEmail: 'verified@example.com',
        paymentMode: 'invalid_mode',
        periodDays: 30,
        description: 'OTTO A1 — полный доступ на 30 дней',
        returnUrl: 'https://preview.example/?payment=return',
      }),
      /payment_receipt_mode_invalid/,
    );
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('browser cannot override server-side verified email', async () => {
  const previousNetlify = globalThis.Netlify;
  let providerInput = null;

  globalThis.Netlify = {
    env: {
      get() {
        return '';
      },
    },
  };

  try {
    const req = new Request('https://preview.example/api/create-payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'browser-controlled@example.com',
        verifiedEmail: 'browser-controlled@example.com',
      }),
    });

    const response = await handleCreatePayment(
      req,
      { deploy: { context: 'deploy-preview' } },
      {
        readSessionFn: () => ({ sub: TEST_USER_ID }),
        getVerifiedEmailFn: async () => 'server-verified@example.com',
        createPaymentFn: async (input) => {
          providerInput = input;
          return {
            status: 'pending',
            provider: 'yookassa',
            paymentId: 'created-test-payment',
            confirmationUrl: 'https://yookassa.test/confirm',
          };
        },
      },
    );

    assert.equal(response.status, 200);
    assert.equal(providerInput.verifiedEmail, 'server-verified@example.com');
    assert.equal(providerInput.paymentMode, 'full_payment');
  } finally {
    globalThis.Netlify = previousNetlify;
  }
});

test('missing verified email blocks payment provider call', async () => {
  const previousNetlify = globalThis.Netlify;
  let providerCalls = 0;

  globalThis.Netlify = {
    env: {
      get() {
        return '';
      },
    },
  };

  try {
    const req = new Request('https://preview.example/api/create-payment', {
      method: 'POST',
    });

    const response = await handleCreatePayment(
      req,
      { deploy: { context: 'deploy-preview' } },
      {
        readSessionFn: () => ({ sub: TEST_USER_ID }),
        getVerifiedEmailFn: async () => null,
        createPaymentFn: async () => {
          providerCalls += 1;
          throw new Error('must_not_be_called');
        },
      },
    );

    assert.equal(response.status, 422);
    assert.equal(providerCalls, 0);
    const payload = await response.json();
    assert.equal(payload.code, 'payment_email_required');
  } finally {
    globalThis.Netlify = previousNetlify;
  }
});

test('verified YooKassa TEST payment stays in TEST and uses exact minor units', async () => {
  await withMockYooKassa(successfulPayment(), async () => {
    const payment = await verifyPayment({
      paymentId: 'yookassa-payment-1',
      expectedAmountMinor: 150000,
      expectedCurrency: 'RUB',
      expectedEnvironment: 'test',
    });

    assert.equal(payment.amountMinor, 150000);
    assert.equal(payment.environment, 'test');
    assert.equal(payment.test, true);
    assert.equal(payment.paymentReference, TEST_REFERENCE);
  });
});

test('live YooKassa payment cannot verify as TEST', async () => {
  const livePayment = successfulPayment({
    test: false,
    metadata: {
      ...successfulPayment().metadata,
      otto_environment: 'live',
    },
  });

  await withMockYooKassa(livePayment, async () => {
    await assert.rejects(
      verifyPayment({
        paymentId: 'yookassa-payment-1',
        expectedAmountMinor: 150000,
        expectedCurrency: 'RUB',
        expectedEnvironment: 'test',
      }),
      /payment_environment_mismatch/,
    );
  });
});

test('TEST YooKassa payment cannot verify as LIVE', async () => {
  await withMockYooKassa(successfulPayment(), async () => {
    await assert.rejects(
      verifyPayment({
        paymentId: 'yookassa-payment-1',
        expectedAmountMinor: 150000,
        expectedCurrency: 'RUB',
        expectedEnvironment: 'live',
      }),
      /payment_environment_mismatch/,
    );
  });
});

test('duplicate webhook returns HTTP 200 with applied=false', async () => {
  const req = new Request('https://preview.example/api/payment-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'notification',
      event: 'payment.succeeded',
      object: { id: 'yookassa-payment-1' },
    }),
  });

  const response = await handlePaymentWebhook(
    req,
    { deploy: { context: 'deploy-preview' } },
    {
      verifyPaymentFn: async () => ({
        paymentId: 'yookassa-payment-1',
        userId: TEST_USER_ID,
        paymentReference: TEST_REFERENCE,
        amountMinor: 150000,
        currency: 'RUB',
        periodDays: 30,
        status: 'succeeded',
        test: true,
        environment: 'test',
      }),
      confirmPaymentFn: async () => ({
        environment: 'test',
        providerPaymentId: 'yookassa-payment-1',
        subscriptionUntil: '2026-10-24T00:00:00.000Z',
        applied: false,
      }),
    },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, 'accepted');
  assert.equal(payload.applied, false);
});

test('webhook environment mismatch never calls entitlement RPC', async () => {
  let confirmCalls = 0;

  const req = new Request('https://preview.example/api/payment-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'notification',
      event: 'payment.succeeded',
      object: { id: 'live-payment' },
    }),
  });

  const response = await handlePaymentWebhook(
    req,
    { deploy: { context: 'deploy-preview' } },
    {
      verifyPaymentFn: async () => ({
        paymentId: 'live-payment',
        userId: TEST_USER_ID,
        paymentReference: TEST_REFERENCE,
        amountMinor: 150000,
        currency: 'RUB',
        periodDays: 30,
        status: 'succeeded',
        test: false,
        environment: 'live',
      }),
      confirmPaymentFn: async () => {
        confirmCalls += 1;
        throw new Error('must_not_be_called');
      },
    },
  );

  assert.equal(response.status, 400);
  assert.equal(confirmCalls, 0);
});

test('account access reads only entitlement for the derived environment', async () => {
  const now = Date.parse('2026-09-24T00:00:00.000Z');
  const calls = [];

  const getEntitlement = async (userId, environment) => {
    calls.push([userId, environment]);
    return { subscriptionUntil: '2026-10-24T00:00:00.000Z' };
  };

  const preview = await loadPaidSubscriptionState({
    userId: TEST_USER_ID,
    context: { deploy: { context: 'deploy-preview' } },
    serverNow: now,
    getEntitlement,
  });

  const production = await loadPaidSubscriptionState({
    userId: TEST_USER_ID,
    context: { deploy: { context: 'production' } },
    serverNow: now,
    getEntitlement,
  });

  assert.equal(preview.environment, 'test');
  assert.equal(preview.subscriptionActive, true);
  assert.equal(production.environment, 'live');
  assert.equal(production.subscriptionActive, true);
  assert.deepEqual(calls, [
    [TEST_USER_ID, 'test'],
    [TEST_USER_ID, 'live'],
  ]);
});

test('branch/dev contexts do not read paid entitlement', async () => {
  let calls = 0;

  const state = await loadPaidSubscriptionState({
    userId: TEST_USER_ID,
    context: { deploy: { context: 'branch-deploy' } },
    serverNow: Date.now(),
    getEntitlement: async () => {
      calls += 1;
      return { subscriptionUntil: '2099-01-01T00:00:00.000Z' };
    },
  });

  assert.equal(calls, 0);
  assert.equal(state.environment, null);
  assert.equal(state.subscriptionActive, false);
  assert.equal(state.subscriptionUntil, null);
});

test('expired entitlement is inactive and future entitlement is active', async () => {
  const now = Date.parse('2026-09-24T00:00:00.000Z');

  const expired = await loadPaidSubscriptionState({
    userId: TEST_USER_ID,
    context: { deploy: { context: 'deploy-preview' } },
    serverNow: now,
    getEntitlement: async () => ({
      subscriptionUntil: '2026-09-23T23:59:59.000Z',
    }),
  });

  const future = await loadPaidSubscriptionState({
    userId: TEST_USER_ID,
    context: { deploy: { context: 'deploy-preview' } },
    serverNow: now,
    getEntitlement: async () => ({
      subscriptionUntil: '2026-09-24T00:00:01.000Z',
    }),
  });

  assert.equal(expired.subscriptionActive, false);
  assert.equal(future.subscriptionActive, true);
});

test('72h trial and paid subscription remain independent access sources', () => {
  assert.equal(TRIAL_MS, 3 * 24 * 60 * 60 * 1000);
  assert.equal(trainingAccessAllowed(true, false), true);
  assert.equal(trainingAccessAllowed(false, true), true);
  assert.equal(trainingAccessAllowed(true, true), true);
  assert.equal(trainingAccessAllowed(false, false), false);
});


test('developer allowlist grants access only to exact server-side user ids', () => {
  const allowlist = `00000000-0000-4000-8000-000000000001,
11111111-1111-4111-8111-111111111111;22222222-2222-4222-8222-222222222222`;

  assert.equal(
    developerAccessAllowed('00000000-0000-4000-8000-000000000001', allowlist),
    true,
  );
  assert.equal(
    developerAccessAllowed('11111111-1111-4111-8111-111111111111', allowlist),
    true,
  );
  assert.equal(
    developerAccessAllowed('22222222-2222-4222-8222-222222222222', allowlist),
    true,
  );
  assert.equal(
    developerAccessAllowed('33333333-3333-4333-8333-333333333333', allowlist),
    false,
  );
  assert.equal(developerAccessAllowed('', allowlist), false);
});


// YooKassa refund objects normally carry their payment_id, not a test flag.
async function withRefundProviderFixture(refund, payment, fn) {
 const oldFetch=globalThis.fetch, oldNetlify=globalThis.Netlify;
 const urls=[];
 globalThis.Netlify={env:{get(name){
  return name==='PAYMENT_PROVIDER_SHOP_ID'?'test-shop-fixture':
    name==='PAYMENT_PROVIDER_SECRET'?'never-real-secret':'';
 }}};
 globalThis.fetch=async url=>{
  urls.push(String(url));
  return new Response(JSON.stringify(String(url).includes('/v3/refunds/')?refund:payment),
    {status:200,headers:{'content-type':'application/json'}});
 };
 try{return await fn(urls);}
 finally{globalThis.fetch=oldFetch;globalThis.Netlify=oldNetlify;}
}
function confirmedRefundFixture(overrides={}) {
 return {id:'refund-fixture-12345',status:'succeeded',
  payment_id:'yookassa-payment-1',amount:{value:'1500.00',currency:'RUB'},...overrides};
}
test('YooKassa refund with no test field is verified using original TEST payment',async()=>{
 const refund=confirmedRefundFixture();
 assert.equal(Object.hasOwn(refund,'test'),false);
 await withRefundProviderFixture(refund,successfulPayment(),async urls=>{
  const result=await verifyRefund({refundId:refund.id,expectedEnvironment:'test'});
  assert.equal(result.paymentId,refund.payment_id);
  assert.equal(result.amountMinor,150000);
  assert.equal(result.test,true);
  assert.equal(result.environment,'test');
  assert.equal(urls.length,2);
  assert.match(urls[0],/\/v3\/refunds\//);
  assert.match(urls[1],/\/v3\/payments\//);
 });
});
test('refund without test flag verifies in LIVE only against LIVE payment',async()=>{
 const refund=confirmedRefundFixture({amount:{value:'300.00',currency:'RUB'}});
 const payment=successfulPayment({test:false,metadata:{
  ...successfulPayment().metadata,otto_environment:'live'
 }});
 await withRefundProviderFixture(refund,payment,async()=>{
  const result=await verifyRefund({refundId:refund.id,expectedEnvironment:'live'});
  assert.equal(result.test,false);
  assert.equal(result.amountMinor,30000);
  await assert.rejects(verifyRefund({refundId:refund.id,expectedEnvironment:'test'}),
   /refund_payment_not_verified/);
 });
});
test('spoofed refund environment, amount, and conflicting optional test flag are rejected',async()=>{
 await withRefundProviderFixture(confirmedRefundFixture({test:false}),
  successfulPayment(),async()=>{
   await assert.rejects(verifyRefund({refundId:'refund-fixture-12345',expectedEnvironment:'test'}),
    /refund_payment_not_verified/);
  });
 await withRefundProviderFixture(confirmedRefundFixture({
  amount:{value:'1501.00',currency:'RUB'}
 }),successfulPayment(),async()=>{
   await assert.rejects(verifyRefund({refundId:'refund-fixture-12345',expectedEnvironment:'test'}),
    /refund_exceeds_payment/);
 });
 await withRefundProviderFixture(confirmedRefundFixture(),successfulPayment({
  metadata:{...successfulPayment().metadata,otto_environment:'live'}
 }),async()=>{
  await assert.rejects(verifyRefund({refundId:'refund-fixture-12345',expectedEnvironment:'test'}),
   /refund_payment_not_verified/);
 });
});
