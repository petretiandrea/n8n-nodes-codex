import { describe, expect, it, vi } from 'vitest';

import { buildCodexRequestBody, CodexClient } from '../../lib/transport/codexClient';

describe('codexClient', () => {
	it('builds a text generation request body', () => {
		const body = buildCodexRequestBody({
			model: 'gpt-5.3-codex',
			input: [
				{
					type: 'message',
					role: 'user',
					content: [{ type: 'input_text', text: 'Hello' }],
				},
			],
			instructions: 'Be concise',
			stream: false,
		});

		expect(body.model).toBe('gpt-5.3-codex');
		expect(body.instructions).toBe('Be concise');
		expect(body.stream).toBe(false);
	});

	it('aggregates text from a streaming response for generate()', async () => {
		const encoder = new TextEncoder();
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(
						encoder.encode(
							[
								'data: {"type":"response.created","response":{"id":"resp_123"}}\n\n',
								'data: {"type":"response.output_text.delta","delta":"Hello "}\n\n',
								'data: {"type":"response.output_text.delta","delta":"world"}\n\n',
								'data: [DONE]\n\n',
							].join(''),
						),
					);
					controller.close();
				},
			}),
		});

		const client = new CodexClient(fetchImpl as any);
		const result = await client.generate('token', 'acct_123', {
			model: 'gpt-5.3-codex',
			input: [
				{
					type: 'message',
					role: 'user',
					content: [{ type: 'input_text', text: 'Hello' }],
				},
			],
		});

		expect(fetchImpl).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({
					Accept: 'text/event-stream',
				}),
			}),
		);
		expect(result.text).toBe('Hello world');
		expect(result.responseId).toBe('resp_123');
	});
});
