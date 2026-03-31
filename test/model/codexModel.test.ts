import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@n8n/ai-node-sdk';

import { CodexChatModel } from '../../lib/model/codexModel';
import { CodexClient } from '../../lib/transport/codexClient';
import type { FetchLike } from '../../lib/types/codex';

describe('CodexChatModel', () => {
	it('delegates non-streaming generation to the client', async () => {
		const fetchImpl: FetchLike = vi.fn();
		const client = new CodexClient(fetchImpl);
		vi.spyOn(client, 'generate').mockResolvedValue({
			text: 'Hello from Codex',
			responseId: 'resp_123',
		});

		const model = new CodexChatModel(
			'gpt-5.3-codex',
			{
				client,
				fetchImpl,
				getTokenBundle: () => ({
					accessToken: 'token',
					refreshToken: 'refresh',
					accountId: 'acct_123',
					expiresAt: '2999-01-01T00:00:00.000Z',
				}),
			},
			{},
		);

		const result = await model.generate([
			{
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
		] as Message[]);

		expect(client.generate).toHaveBeenCalledOnce();
		expect(result.message.content[0].type).toBe('text');
	});
});
