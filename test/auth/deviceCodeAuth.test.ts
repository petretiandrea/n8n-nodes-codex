import { describe, expect, it, vi } from 'vitest';

import { ensureValidTokenBundle, refreshAccessToken, requestDeviceCode } from '../../lib/auth/deviceCodeAuth';
import { normalizeTokenBundle } from '../../lib/auth/tokenStore';

describe('deviceCodeAuth', () => {
	it('requests a device code', async () => {
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				device_auth_id: 'dev_123',
				user_code: 'ABCD-EFGH',
				interval: 7,
			}),
		});

		const result = await requestDeviceCode(fetchImpl as any);

		expect(result.deviceAuthId).toBe('dev_123');
		expect(result.userCode).toBe('ABCD-EFGH');
		expect(result.interval).toBe(7);
	});

	it('refreshes when the token is expired', async () => {
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				access_token: 'new-token',
				refresh_token: 'new-refresh',
				expires_in: 3600,
			}),
		});

		const bundle = normalizeTokenBundle({
			accessToken: 'old-token',
			refreshToken: 'refresh-token',
			accountId: 'acct_123',
			expiresAt: '2024-01-01T00:00:00.000Z',
		});

		const refreshed = await refreshAccessToken(fetchImpl as any, bundle);

		expect(refreshed.accessToken).toBe('new-token');
		expect(refreshed.refreshToken).toBe('new-refresh');
	});

	it('keeps the current token when it is still valid', async () => {
		const fetchImpl = vi.fn();
		const result = await ensureValidTokenBundle(
			fetchImpl as any,
			normalizeTokenBundle({
				accessToken: 'still-valid',
				refreshToken: 'refresh-token',
				accountId: 'acct_123',
				expiresAt: '2999-01-01T00:00:00.000Z',
			}),
		);

		expect(result.token).toBe('still-valid');
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});
