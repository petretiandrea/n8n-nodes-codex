export function buildCodexHeaders(token: string, accountId?: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
		'openai-beta': 'responses=experimental',
		'openai-originator': 'codex_cli_rs',
		...(accountId ? { 'openai-organization': accountId } : {}),
	};
}
