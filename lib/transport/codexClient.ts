import { CodexRequestError } from '../errors';
import type {
	CodexClientGenerateParams,
	CodexRequestBody,
	CodexTextResult,
	FetchLike,
} from '../types/codex';
import { buildCodexHeaders } from './codexHeaders';
import { iterSseEvents } from './sse';

export const CODEX_RESPONSES_ENDPOINT = 'https://chatgpt.com/backend-api/codex/responses';

function isReasoningModel(model: string): boolean {
	return model.startsWith('gpt-5') || model.startsWith('o');
}

export function buildCodexRequestBody(params: CodexClientGenerateParams): CodexRequestBody {
	const body: CodexRequestBody = {
		model: params.model,
		stream: params.stream ?? false,
		store: false,
		input: params.input,
	};

	if (params.instructions) {
		body.instructions = params.instructions;
	}

	if (isReasoningModel(params.model)) {
		body.reasoning = {
			effort: params.reasoningEffort ?? 'medium',
			summary: 'auto',
		};
		body.text = { verbosity: 'medium' };
		body.include = ['reasoning.encrypted_content'];
	}

	return body;
}

export function extractOutputText(payload: Record<string, unknown>): string {
	const directOutput = payload.output;
	if (Array.isArray(directOutput)) {
		const parts: string[] = [];
		for (const item of directOutput) {
			if (!item || typeof item !== 'object') continue;
			const content = (item as Record<string, unknown>).content;
			if (!Array.isArray(content)) continue;
			for (const contentItem of content) {
				if (!contentItem || typeof contentItem !== 'object') continue;
				const typed = contentItem as Record<string, unknown>;
				if (typed.type === 'output_text' && typeof typed.text === 'string') {
					parts.push(typed.text);
				}
			}
		}
		if (parts.length) return parts.join('');
	}

	if (typeof payload.output_text === 'string') {
		return payload.output_text;
	}

	return '';
}

export class CodexClient {
	constructor(
		private readonly fetchImpl: FetchLike,
		private readonly endpoint = CODEX_RESPONSES_ENDPOINT,
	) {}

	async generate(
		token: string,
		accountId: string | undefined,
		params: CodexClientGenerateParams,
	): Promise<CodexTextResult> {
		const response = await this.fetchImpl(this.endpoint, {
			method: 'POST',
			headers: {
				...buildCodexHeaders(token, accountId),
				Accept: 'text/event-stream',
			},
			body: JSON.stringify(buildCodexRequestBody({ ...params, stream: true })),
		});

		if (!response.ok) {
			throw new CodexRequestError(await response.text(), response.status);
		}

		if (!response.body) {
			throw new CodexRequestError('Streaming response body was empty');
		}

		let text = '';
		let responseId: string | undefined;

		for await (const event of iterSseEvents(response.body)) {
			if (event.type === 'response.created') {
				const created = event.data.response;
				if (created && typeof created === 'object') {
					const id = (created as Record<string, unknown>).id;
					if (typeof id === 'string') {
						responseId = id;
					}
				}
			}

			if (event.type === 'response.output_text.delta') {
				const delta = event.data.delta;
				if (typeof delta === 'string' && delta.length) {
					text += delta;
				}
			}
		}

		return {
			text,
			responseId,
		};
	}

	async *stream(
		token: string,
		accountId: string | undefined,
		params: CodexClientGenerateParams,
	): AsyncIterable<string> {
		const response = await this.fetchImpl(this.endpoint, {
			method: 'POST',
			headers: {
				...buildCodexHeaders(token, accountId),
				Accept: 'text/event-stream',
			},
			body: JSON.stringify(buildCodexRequestBody({ ...params, stream: true })),
		});

		if (!response.ok) {
			throw new CodexRequestError(await response.text(), response.status);
		}

		if (!response.body) {
			throw new CodexRequestError('Streaming response body was empty');
		}

		for await (const event of iterSseEvents(response.body)) {
			if (event.type === 'response.output_text.delta') {
				const delta = event.data.delta;
				if (typeof delta === 'string' && delta.length) {
					yield delta;
				}
			}
		}
	}
}
