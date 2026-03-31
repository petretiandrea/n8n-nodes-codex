import { describe, expect, it } from 'vitest';

import { CodexChatModel } from '../../nodes/CodexChatModel/CodexChatModel.node';

describe('CodexChatModel node', () => {
	it('exposes an AI language model output', () => {
		const node = new CodexChatModel();

		expect(node.description.displayName).toBe('Codex Chat Model');
		expect(node.description.credentials?.[0]?.name).toBe('codexDeviceAuthApi');
		expect(node.description.outputNames).toEqual(['Model']);
	});
});
