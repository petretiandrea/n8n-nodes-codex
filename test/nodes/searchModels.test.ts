import { describe, expect, it, vi } from 'vitest';

import {
	buildCodexModelsUrl,
	CODEX_MODELS_CLIENT_VERSION,
	tryFetchModels,
} from '../../nodes/CodexChatModel/methods/searchModels';

describe('searchModels', () => {
	it('builds the official Codex models endpoint URL', () => {
		expect(buildCodexModelsUrl()).toBe(
			`https://chatgpt.com/backend-api/codex/models?client_version=${CODEX_MODELS_CLIENT_VERSION}`,
		);
	});

	it('requests models from the official endpoint and extracts ids', async () => {
		const fetchSpy = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				data: [{ id: 'gpt-5.4' }, { id: 'gpt-5.3-codex' }],
			}),
		});

		vi.stubGlobal('fetch', fetchSpy);

		await expect(tryFetchModels('token', 'acct_123')).resolves.toEqual([
			'gpt-5.4',
			'gpt-5.3-codex',
		]);

		expect(fetchSpy).toHaveBeenCalledWith(
			`https://chatgpt.com/backend-api/codex/models?client_version=${CODEX_MODELS_CLIENT_VERSION}`,
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer token',
					'openai-originator': 'codex_cli_rs',
					'openai-organization': 'acct_123',
				}),
			}),
		);

		vi.unstubAllGlobals();
	});
});
