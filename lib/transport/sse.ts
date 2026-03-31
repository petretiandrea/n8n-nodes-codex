import { CodexStreamParseError } from '../errors';

export interface SseEvent {
	type: string;
	data: Record<string, unknown>;
}

export function parseSseChunk(rawEvent: string): SseEvent | null {
	const trimmed = rawEvent.trim();
	if (!trimmed) return null;

	const lines = trimmed.split(/\r?\n/);
	const dataLines = lines.filter((line) => line.startsWith('data:'));
	if (!dataLines.length) return null;

	const payload = dataLines.map((line) => line.slice(5).trim()).join('\n');
	if (!payload || payload === '[DONE]') return null;

	try {
		const parsed = JSON.parse(payload) as Record<string, unknown>;
		const type = typeof parsed.type === 'string' ? parsed.type : '';
		if (!type) return null;
		return { type, data: parsed };
	} catch {
		throw new CodexStreamParseError('Unable to parse SSE event payload');
	}
}

export async function* iterSseEvents(stream: ReadableStream<Uint8Array>): AsyncIterable<SseEvent> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		const parts = buffer.split(/\r?\n\r?\n/);
		buffer = parts.pop() ?? '';

		for (const part of parts) {
			const event = parseSseChunk(part);
			if (event) {
				yield event;
			}
		}
	}

	if (buffer.trim()) {
		const event = parseSseChunk(buffer);
		if (event) {
			yield event;
		}
	}
}
