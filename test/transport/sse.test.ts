import { describe, expect, it } from 'vitest';

import { parseSseChunk } from '../../lib/transport/sse';

describe('sse parser', () => {
	it('parses text delta events', () => {
		const event = parseSseChunk('data: {"type":"response.output_text.delta","delta":"Hello"}\n\n');

		expect(event?.type).toBe('response.output_text.delta');
		expect(event?.data.delta).toBe('Hello');
	});
});
