export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CodexTokenBundle {
	accessToken: string;
	refreshToken: string;
	accountId: string;
	expiresAt: string;
	expiresIn?: number;
}

export interface CodexCredentialValues {
	accessToken: string;
	refreshToken: string;
	accountId?: string;
	expiresAt: string;
}

export interface DeviceCodeStartResponse {
	deviceAuthId: string;
	userCode: string;
	interval: number;
	verificationUrl: string;
}

export interface DeviceCodePollSuccess {
	authorizationCode: string;
	codeVerifier: string;
}

export interface CodexRequestMessage {
	type: 'message';
	role: 'user' | 'assistant' | 'system' | 'developer';
	content: Array<
		| {
				type: 'input_text';
				text: string;
		  }
		| {
				type: 'output_text';
				text: string;
		  }
	>;
}

export interface CodexRequestBody {
	model: string;
	stream: boolean;
	store: boolean;
	input: CodexRequestMessage[];
	instructions?: string;
	reasoning?: {
		effort: 'low' | 'medium' | 'high';
		summary: 'auto';
	};
	text?: {
		verbosity: 'low' | 'medium' | 'high';
	};
	include?: string[];
}

export interface CodexClientGenerateParams {
	model: string;
	input: CodexRequestMessage[];
	instructions?: string;
	reasoningEffort?: 'low' | 'medium' | 'high';
	stream?: boolean;
}

export interface CodexTextResult {
	text: string;
	responseId?: string;
	usage?: {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
	};
}

export interface CodexResolvedAuth {
	token: string;
	accountId?: string;
	updatedBundle?: CodexTokenBundle;
}
