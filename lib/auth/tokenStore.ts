import type { CodexCredentialValues, CodexTokenBundle } from '../types/codex';

function decodeJwtPayload(token: string): Record<string, unknown> {
	const parts = token.split('.');
	if (parts.length !== 3) return {};

	try {
		const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
		const payload = Buffer.from(normalized + padding, 'base64').toString('utf8');
		return JSON.parse(payload) as Record<string, unknown>;
	} catch {
		return {};
	}
}

export function extractAccountId(accessToken: string): string {
	const payload = decodeJwtPayload(accessToken);
	const auth = payload['https://api.openai.com/auth'];
	if (auth && typeof auth === 'object' && 'chatgpt_account_id' in auth) {
		const accountId = auth.chatgpt_account_id;
		return typeof accountId === 'string' ? accountId : '';
	}

	return typeof payload.sub === 'string' ? payload.sub : '';
}

export function decodeJwtExpiry(accessToken: string): number | undefined {
	const payload = decodeJwtPayload(accessToken);
	return typeof payload.exp === 'number' ? payload.exp : undefined;
}

export function normalizeTokenBundle(values: CodexCredentialValues): CodexTokenBundle {
	const accountId = values.accountId?.trim() || extractAccountId(values.accessToken);
	const expiresAt =
		values.expiresAt?.trim() ||
		new Date(((decodeJwtExpiry(values.accessToken) ?? Math.floor(Date.now() / 1000) + 3600) * 1000)).toISOString();

	return {
		accessToken: values.accessToken,
		refreshToken: values.refreshToken,
		accountId,
		expiresAt,
	};
}

export function isTokenExpired(bundle: CodexTokenBundle, now = new Date(), skewSeconds = 30): boolean {
	const expiresAtMs = Date.parse(bundle.expiresAt);
	if (Number.isNaN(expiresAtMs)) return true;

	return expiresAtMs - skewSeconds * 1000 <= now.getTime();
}

export function mergeTokenRefresh(
	previous: CodexTokenBundle,
	incoming: {
		access_token: string;
		refresh_token?: string;
		account_id?: string;
		expires_in?: number;
		expires_at?: number | string;
	},
): CodexTokenBundle {
	const expiresAt = incoming.expires_at
		? new Date(typeof incoming.expires_at === 'number' ? incoming.expires_at * 1000 : incoming.expires_at).toISOString()
		: new Date(Date.now() + (incoming.expires_in ?? 3600) * 1000).toISOString();

	return {
		accessToken: incoming.access_token,
		refreshToken: incoming.refresh_token || previous.refreshToken,
		accountId: incoming.account_id || extractAccountId(incoming.access_token) || previous.accountId,
		expiresAt,
		expiresIn: incoming.expires_in,
	};
}
