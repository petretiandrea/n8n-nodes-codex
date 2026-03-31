import { supplyModel } from '@n8n/ai-node-sdk';
import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { normalizeTokenBundle } from '../../lib/auth/tokenStore';
import { CodexChatModel as CodexRuntimeChatModel } from '../../lib/model/codexModel';
import { CodexClient } from '../../lib/transport/codexClient';
import type { CodexTokenBundle, FetchLike } from '../../lib/types/codex';
import { searchModels } from './methods/searchModels';

type ModelOptions = {
	streaming?: boolean;
	prompt?: string;
	reasoningEffort?: 'low' | 'medium' | 'high';
};

export class CodexChatModel implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Codex Chat Model',
		name: 'codexChatModel',
		icon: { light: 'file:codex.svg', dark: 'file:codex.svg' },
		group: ['transform'],
		version: [1],
		description: 'Use OpenAI Codex through ChatGPT device-code credentials',
		defaults: {
			name: 'Codex Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/petretiandrea/n8n-nodes-codex',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'codexDeviceAuthApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				typeOptions: {
					searchListMethod: 'searchModels',
					searchable: true,
				},
				default: '',
				description: 'Codex model ID to call. The list is loaded dynamically when possible.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Prompt',
						name: 'prompt',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
						description: 'Optional top-level prompt/instructions sent to Codex before the user message',
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						type: 'options',
						default: 'medium',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' }
						]
					},
					{
						displayName: 'Streaming',
						name: 'streaming',
						type: 'boolean',
						default: true
					}
				]
			}
		]
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials('codexDeviceAuthApi');
		const selectedModel = this.getNodeParameter('model', itemIndex) as string;
		const modelName = selectedModel || 'gpt-5.3-codex';
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;
		let tokenBundle = normalizeTokenBundle({
			accessToken: credentials.accessToken as string,
			refreshToken: credentials.refreshToken as string,
			accountId: credentials.accountId as string | undefined,
			expiresAt: credentials.expiresAt as string,
		});

		const runtimeFetch: FetchLike = (url: string, init?: RequestInit) => fetch(url, init);
		const model = new CodexRuntimeChatModel(
			modelName,
			{
				client: new CodexClient(runtimeFetch),
				fetchImpl: runtimeFetch,
				getTokenBundle: (): CodexTokenBundle => tokenBundle,
				onTokenRefresh: (updatedBundle: CodexTokenBundle) => {
					tokenBundle = updatedBundle;
				},
			},
			{
				instructions: options.prompt,
				streaming: options.streaming,
				reasoningEffort: options.reasoningEffort,
			},
		);

		return supplyModel(this, model);
	}
}
