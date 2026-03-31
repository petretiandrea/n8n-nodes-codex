import {
	BaseChatModel,
	type ChatModelConfig,
	type GenerateResult,
	type Message,
	type StreamChunk,
} from '@n8n/ai-node-sdk';

import { ensureValidTokenBundle } from '../auth/deviceCodeAuth';
import type {
	CodexClientGenerateParams,
	CodexTokenBundle,
	FetchLike,
} from '../types/codex';
import { CodexClient } from '../transport/codexClient';

export interface CodexModelConfig extends ChatModelConfig {
	instructions?: string;
	streaming?: boolean;
	reasoningEffort?: 'low' | 'medium' | 'high';
}

interface CodexModelDependencies {
	client: CodexClient;
	fetchImpl: FetchLike;
	getTokenBundle: () => CodexTokenBundle;
	onTokenRefresh?: (bundle: CodexTokenBundle) => void;
}

function extractMessageText(message: Message): string {
	return message.content
		.filter((entry) => entry.type === 'text')
		.map((entry) => entry.text)
		.join('\n');
}

function toCodexInput(messages: Message[]): {
	input: CodexClientGenerateParams['input'];
	instructions?: string;
} {
	const instructions: string[] = [];
	const input: CodexClientGenerateParams['input'] = [];

	for (const message of messages) {
		const text = extractMessageText(message);
		if (!text) continue;

		if (message.role === 'system') {
			instructions.push(text);
			continue;
		}

		input.push({
			type: 'message',
			role: message.role === 'assistant' ? 'assistant' : 'user',
			content: [
				{
					type: message.role === 'assistant' ? 'output_text' : 'input_text',
					text,
				},
			],
		});
	}

	return {
		input,
		instructions: instructions.join('\n\n').trim() || undefined,
	};
}

export class CodexChatModel extends BaseChatModel<CodexModelConfig> {
	constructor(
		modelId: string,
		private readonly dependencies: CodexModelDependencies,
		config: CodexModelConfig,
	) {
		super('openai-codex', modelId, config);
	}

	private async resolveAuth() {
		const tokenBundle = this.dependencies.getTokenBundle();
		const resolved = await ensureValidTokenBundle(this.dependencies.fetchImpl, tokenBundle);
		if (resolved.updatedBundle && this.dependencies.onTokenRefresh) {
			this.dependencies.onTokenRefresh(resolved.updatedBundle);
		}
		return resolved;
	}

	private buildParams(messages: Message[], config?: CodexModelConfig): CodexClientGenerateParams {
		const merged = this.mergeConfig(config) as CodexModelConfig;
		const mapped = toCodexInput(messages);
		const instructions = [merged.instructions, mapped.instructions].filter(Boolean).join('\n\n').trim();

		return {
			model: this.modelId,
			input: mapped.input,
			instructions: instructions || undefined,
			reasoningEffort: merged.reasoningEffort,
			stream: merged.streaming,
		};
	}

	async generate(messages: Message[], config?: CodexModelConfig): Promise<GenerateResult> {
		const params = this.buildParams(messages, config);
		const auth = await this.resolveAuth();
		const result = await this.dependencies.client.generate(auth.token, auth.accountId, params);

		return {
			id: result.responseId,
			finishReason: 'stop',
			usage: {
				promptTokens: result.usage?.promptTokens ?? 0,
				completionTokens: result.usage?.completionTokens ?? 0,
				totalTokens: result.usage?.totalTokens ?? 0,
			},
			message: {
				role: 'assistant',
				content: [{ type: 'text', text: result.text }],
			},
		};
	}

	async *stream(messages: Message[], config?: CodexModelConfig): AsyncIterable<StreamChunk> {
		const params = this.buildParams(messages, {
			...config,
			streaming: true,
		});
		const auth = await this.resolveAuth();

		for await (const chunk of this.dependencies.client.stream(auth.token, auth.accountId, params)) {
			yield {
				type: 'text-delta',
				delta: chunk,
			};
		}

		yield {
			type: 'finish',
			finishReason: 'stop',
		};
	}
}
