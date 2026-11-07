export function getPaymentEnvironment(context) {
  const deployContext = context?.deploy?.context;

  if (deployContext === 'deploy-preview') return 'test';
  if (deployContext === 'production') return 'live';

  return null;
}

export function paymentMatchesEnvironment(isTest, environment) {
  if (environment === 'test') return isTest === true;
  if (environment === 'live') return isTest === false;
  return false;
}
