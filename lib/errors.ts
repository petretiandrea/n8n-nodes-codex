export class CodexAuthSetupError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CodexAuthSetupError';
	}
}

export class CodexAuthRefreshError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CodexAuthRefreshError';
	}
}

export class CodexRequestError extends Error {
	status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = 'CodexRequestError';
		this.status = status;
	}
}

export class CodexStreamParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CodexStreamParseError';
	}
}
