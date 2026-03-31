import { CodexAuthRefreshError, CodexAuthSetupError } from '../errors';
import {
	type CodexResolvedAuth,
	type CodexTokenBundle,
	type DeviceCodePollSuccess,
	type DeviceCodeStartResponse,
	type FetchLike,
} from '../types/codex';
import { isTokenExpired, mergeTokenRefresh } from './tokenStore';

export const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
export const CODEX_ISSUER = 'https://auth.openai.com';
export const CODEX_DEVICE_USERCODE_URL = `${CODEX_ISSUER}/api/accounts/deviceauth/usercode`;
export const CODEX_DEVICE_POLL_URL = `${CODEX_ISSUER}/api/accounts/deviceauth/token`;
export const CODEX_TOKEN_URL = `${CODEX_ISSUER}/oauth/token`;
export const CODEX_VERIFICATION_URL = `${CODEX_ISSUER}/codex/device`;

export async function requestDeviceCode(fetchImpl: FetchLike): Promise<DeviceCodeStartResponse> {
	const response = await fetchImpl(CODEX_DEVICE_USERCODE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ client_id: CODEX_CLIENT_ID }),
	});

	if (!response.ok) {
		throw new CodexAuthSetupError(`Device code start failed (${response.status})`);
	}

	const data = (await response.json()) as Record<string, unknown>;
	return {
		deviceAuthId: String(data.device_auth_id ?? ''),
		userCode: String(data.user_code ?? data.usercode ?? ''),
		interval: Number(data.interval ?? 5),
		verificationUrl: CODEX_VERIFICATION_URL,
	};
}

export async function pollDeviceCodeOnce(
	fetchImpl: FetchLike,
	deviceAuthId: string,
	userCode: string,
): Promise<DeviceCodePollSuccess | null> {
	const response = await fetchImpl(CODEX_DEVICE_POLL_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			device_auth_id: deviceAuthId,
			user_code: userCode,
		}),
	});

	if (response.status === 403 || response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new CodexAuthSetupError(`Device code polling failed (${response.status})`);
	}

	const data = (await response.json()) as Record<string, unknown>;
	return {
		authorizationCode: String(data.authorization_code ?? ''),
		codeVerifier: String(data.code_verifier ?? ''),
	};
}

export async function refreshAccessToken(
	fetchImpl: FetchLike,
	tokenBundle: CodexTokenBundle,
): Promise<CodexTokenBundle> {
	const response = await fetchImpl(CODEX_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: CODEX_CLIENT_ID,
			refresh_token: tokenBundle.refreshToken,
		}),
	});

	if (!response.ok) {
		throw new CodexAuthRefreshError(`Refresh token request failed (${response.status})`);
	}

	const data = (await response.json()) as Record<string, unknown>;
	return mergeTokenRefresh(tokenBundle, {
		access_token: String(data.access_token ?? ''),
		refresh_token:
			typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
		account_id: typeof data.account_id === 'string' ? data.account_id : undefined,
		expires_in: typeof data.expires_in === 'number' ? data.expires_in : undefined,
		expires_at:
			typeof data.expires_at === 'number' || typeof data.expires_at === 'string'
				? data.expires_at
				: undefined,
	});
}

export async function ensureValidTokenBundle(
	fetchImpl: FetchLike,
	tokenBundle: CodexTokenBundle,
): Promise<CodexResolvedAuth> {
	if (!isTokenExpired(tokenBundle)) {
		return {
			token: tokenBundle.accessToken,
			accountId: tokenBundle.accountId,
		};
	}

	if (!tokenBundle.refreshToken) {
		throw new CodexAuthRefreshError('Access token is expired and no refresh token is available');
	}

	const updatedBundle = await refreshAccessToken(fetchImpl, tokenBundle);
	return {
		token: updatedBundle.accessToken,
		accountId: updatedBundle.accountId,
		updatedBundle,
	};
}
