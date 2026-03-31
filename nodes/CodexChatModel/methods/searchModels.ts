import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { ensureValidTokenBundle } from '../../../lib/auth/deviceCodeAuth';
import { normalizeTokenBundle } from '../../../lib/auth/tokenStore';
import { buildCodexHeaders } from '../../../lib/transport/codexHeaders';

export const CODEX_MODELS_ENDPOINT = 'https://chatgpt.com/backend-api/codex/models';
export const CODEX_MODELS_CLIENT_VERSION = '99.99.99';

const FALLBACK_MODELS = [
	'gpt-5.4',
	'gpt-5.3-codex',
	'gpt-5.3-codex-mini',
	'gpt-5.2-codex',
	'gpt-5.2-codex-mini',
	'gpt-5.1-codex',
	'gpt-5.1-codex-mini',
];

function toResults(models: string[], filter?: string): INodeListSearchItems[] {
	const normalizedFilter = filter?.toLowerCase();
	return models
		.filter((model) => !normalizedFilter || model.toLowerCase().includes(normalizedFilter))
		.sort((a, b) => a.localeCompare(b))
		.map((model) => ({
			name: model,
			value: model,
		}));
}

function extractModelIds(payload: unknown): string[] {
	if (!payload || typeof payload !== 'object') return [];
	const root = payload as Record<string, unknown>;
	const collections = [root.data, root.models, root.items];

	for (const collection of collections) {
		if (!Array.isArray(collection)) continue;
		const ids = collection
			.map((item) => {
				if (!item || typeof item !== 'object') return null;
				const typed = item as Record<string, unknown>;
				return typeof typed.id === 'string' ? typed.id : null;
			})
			.filter((value): value is string => Boolean(value));
		if (ids.length) return ids;
	}

	return [];
}

export function buildCodexModelsUrl(clientVersion = CODEX_MODELS_CLIENT_VERSION): string {
	const url = new URL(CODEX_MODELS_ENDPOINT);
	url.searchParams.set('client_version', clientVersion);
	return url.toString();
}

export async function tryFetchModels(token: string, accountId?: string): Promise<string[]> {
	try {
		const response = await fetch(buildCodexModelsUrl(), {
			headers: buildCodexHeaders(token, accountId),
		});
		if (!response.ok) return [];
		const payload = await response.json();
		return extractModelIds(payload);
	} catch {
		return [];
	}
}

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const credentials = await this.getCredentials<{
			accessToken: string;
			refreshToken: string;
			accountId?: string;
			expiresAt: string;
		}>('codexDeviceAuth');

		const tokenBundle = normalizeTokenBundle({
			accessToken: credentials.accessToken,
			refreshToken: credentials.refreshToken,
			accountId: credentials.accountId,
			expiresAt: credentials.expiresAt,
		});

		const resolved = await ensureValidTokenBundle((url, init) => fetch(url, init), tokenBundle);
		const dynamicModels = await tryFetchModels(resolved.token, resolved.accountId);
		if (dynamicModels.length) {
			return {
				results: toResults(dynamicModels, filter),
			};
		}
	} catch {
		// Fall back to a curated static list when dynamic model discovery fails.
	}

	return {
		results: toResults(FALLBACK_MODELS, filter),
	};
}
