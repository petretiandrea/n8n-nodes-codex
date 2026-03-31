#!/usr/bin/env node

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const ISSUER = 'https://auth.openai.com';
const USERCODE_URL = `${ISSUER}/api/accounts/deviceauth/usercode`;
const POLL_URL = `${ISSUER}/api/accounts/deviceauth/token`;
const TOKEN_URL = `${ISSUER}/oauth/token`;
const REDIRECT_URI = `${ISSUER}/deviceauth/callback`;
const VERIFICATION_URL = `${ISSUER}/codex/device`;

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const payload = Buffer.from(normalized + padding, 'base64').toString('utf8');
  return JSON.parse(payload);
}

function extractAccountId(accessToken) {
  try {
    const payload = decodeJwtPayload(accessToken);
    const auth = payload && payload['https://api.openai.com/auth'];
    if (auth && typeof auth === 'object' && auth.chatgpt_account_id) {
      return auth.chatgpt_account_id;
    }
    return (payload && payload.sub) || '';
  } catch {
    return '';
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const userCodeResponse = await fetch(USERCODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID }),
  });

  if (!userCodeResponse.ok) {
    throw new Error(`Failed to start device flow: ${userCodeResponse.status} ${await userCodeResponse.text()}`);
  }

  const userCodeData = await userCodeResponse.json();
  const userCode = userCodeData.user_code || userCodeData.usercode;
  const deviceAuthId = userCodeData.device_auth_id;
  const intervalSeconds = Number(userCodeData.interval || 5);

  process.stdout.write(`Open ${VERIFICATION_URL}\n`);
  process.stdout.write(`Enter code: ${userCode}\n`);
  process.stdout.write('Waiting for authorization...\n');

  while (true) {
    await sleep(intervalSeconds * 1000);

    const pollResponse = await fetch(POLL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_auth_id: deviceAuthId,
        user_code: userCode,
      }),
    });

    if (pollResponse.status === 403 || pollResponse.status === 404) {
      continue;
    }

    if (!pollResponse.ok) {
      throw new Error(`Polling failed: ${pollResponse.status} ${await pollResponse.text()}`);
    }

    const pollData = await pollResponse.json();

    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: pollData.authorization_code,
        code_verifier: pollData.code_verifier,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();
    const expiresIn = Number(tokenData.expires_in || 3600);
    const result = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      account_id: tokenData.account_id || extractAccountId(tokenData.access_token),
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      expires_in: expiresIn,
    };

    process.stdout.write('\nPaste these values into the n8n credential:\n\n');
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write('\n');
    break;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
