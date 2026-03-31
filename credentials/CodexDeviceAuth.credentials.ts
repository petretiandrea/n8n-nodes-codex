import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class CodexDeviceAuth implements ICredentialType {
	name = 'codexDeviceAuth';

	displayName = 'Codex Device Auth';

	documentationUrl = 'https://github.com/petretiandrea/n8n-nodes-codex#authentication';

	icon: Icon = { light: 'file:../nodes/CodexChatModel/codex.svg', dark: 'file:../nodes/CodexChatModel/codex.svg' };

	properties: INodeProperties[] = [
		{
			displayName:
				'Run `npx codex-device-login` in a shell, complete the browser login, then paste the returned values below.',
			name: 'bootstrapNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Refresh Token',
			name: 'refreshToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Account ID',
			name: 'accountId',
			type: 'string',
			default: '',
			description: 'Optional if omitted from the bootstrap output, but recommended when present',
		},
		{
			displayName: 'Expires At',
			name: 'expiresAt',
			type: 'string',
			required: true,
			default: '',
			description: 'ISO timestamp returned by the bootstrap helper',
		},
	];
}
