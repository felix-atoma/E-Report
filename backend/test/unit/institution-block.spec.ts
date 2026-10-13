import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { computeAccess } from '../../src/modules/superadmin/superadmin.service';

/** École bloquée par le super-admin : plus d'accès, tout de suite ; plus aucune expiration d'abonnement. */
describe('school blocked by the super-admin', () => {
  const config = { getOrThrow: () => 'secret' } as any;
  const strategy = (status: string | null, role = 'TEACHER') => new JwtStrategy(config, {
    user: {
      findUnique: async () => ({
        id: 'u1', email: 'a@b.c', name: 'A', role, institutionId: 'i1', isActive: true, language: 'FR',
        institution: status ? { status } : null,
      }),
    },
  } as any);
  const payload = (sub: string) => ({ sub, email: 'a@b.c', role: 'TEACHER', institutionId: 'i1' });

  it('refuses every request of a blocked school, with the reason', async () => {
    await expect(strategy('SUSPENDED').validate(payload('blocked-1'))).rejects.toThrow(UnauthorizedException);
    await expect(strategy('SUSPENDED').validate(payload('blocked-2'))).rejects.toThrow(/bloqué/);
  });

  it('lets an active school through (whatever its subscription), without leaking the institution field', async () => {
    const user = await strategy('ACTIVE').validate(payload('open-1'));
    expect(user.id).toBe('u1');
    expect((user as any).institution).toBeUndefined();
  });

  it('access is OPEN unless the super-admin blocked (or rejected) the school — no expiry any more', () => {
    expect(computeAccess({ status: 'ACTIVE', subscriptionStatus: 'EXPIRED' })).toBe('OPEN');
    expect(computeAccess({ status: 'ACTIVE', subscriptionStatus: 'TRIAL', trialEndsAt: new Date('2020-01-01') })).toBe('OPEN');
    expect(computeAccess({ status: 'SUSPENDED' })).toBe('SUSPENDED');
    expect(computeAccess({ status: 'REJECTED' })).toBe('SUSPENDED');
  });
});
