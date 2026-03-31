import { describe, expect, it, vi } from 'vitest';

import { CodexChatModel } from '../../lib/model/codexModel';

describe('CodexChatModel', () => {
	it('delegates non-streaming generation to the client', async () => {
		const client = {
			generate: vi.fn().mockResolvedValue({
				text: 'Hello from Codex',
				responseId: 'resp_123',
			}),
			stream: vi.fn(),
		};

		const model = new CodexChatModel(
			'gpt-5.3-codex',
			{
				client: client as any,
				fetchImpl: vi.fn() as any,
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
		] as any);

		expect(client.generate).toHaveBeenCalledOnce();
		expect(result.message.content[0].type).toBe('text');
	});
});
