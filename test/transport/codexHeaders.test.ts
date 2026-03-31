import { describe, expect, it } from 'vitest';

import { buildCodexHeaders } from '../../lib/transport/codexHeaders';

describe('codexHeaders', () => {
	it('builds required headers', () => {
		const headers = buildCodexHeaders('secret-token', 'acct_123');

		expect(headers.Authorization).toBe('Bearer secret-token');
		expect(headers['openai-beta']).toBe('responses=experimental');
		expect(headers['openai-originator']).toBe('codex_cli_rs');
		expect(headers['openai-organization']).toBe('acct_123');
	});
});
