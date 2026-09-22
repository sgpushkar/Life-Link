import { describe, it, expect } from 'vitest';
import {
  isBloodCompatible,
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isUnitViableForTransit,
} from '@lifelink/shared';

describe('Clinical Blood Transfusion Compatibility Engine (§5.2 & §14)', () => {
  it('correctly treats O- as universal donor for Red Blood Cells (PRBC/WHOLE)', () => {
    const recipients = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
    for (const r of recipients) {
      expect(isBloodCompatible('O-', r, 'PRBC')).toBe(true);
      expect(isBloodCompatible('O-', r, 'WHOLE')).toBe(true);
    }
  });

  it('correctly treats AB+ as universal recipient for Red Blood Cells (PRBC)', () => {
    const donors = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
    for (const d of donors) {
      expect(isBloodCompatible(d, 'AB+', 'PRBC')).toBe(true);
    }
  });

  it('strictly rejects Rh+ blood to Rh- recipients for red blood cells', () => {
    expect(isBloodCompatible('O+', 'O-', 'PRBC')).toBe(false);
    expect(isBloodCompatible('A+', 'A-', 'PRBC')).toBe(false);
    expect(isBloodCompatible('B+', 'B-', 'PRBC')).toBe(false);
    expect(isBloodCompatible('AB+', 'AB-', 'PRBC')).toBe(false);
  });

  it('correctly implements inverse plasma compatibility (AB is universal plasma donor)', () => {
    const recipients = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
    for (const r of recipients) {
      // AB plasma contains NO anti-A or anti-B antibodies, safe for all
      expect(isBloodCompatible('AB+', r, 'PLASMA')).toBe(true);
    }
    // O plasma contains BOTH anti-A and anti-B antibodies; can ONLY be given to O recipients
    expect(isBloodCompatible('O+', 'A+', 'PLASMA')).toBe(false);
    expect(isBloodCompatible('O+', 'B+', 'PLASMA')).toBe(false);
    expect(isBloodCompatible('O+', 'AB+', 'PLASMA')).toBe(false);
    expect(isBloodCompatible('O+', 'O+', 'PLASMA')).toBe(true);
  });

  it('validates FEFO transit shelf-life with transport + transfusion margin', () => {
    const now = Date.now();
    // Expires in 8 hours (eta = 60 min (1h) + buffer 6h = 7h required) -> viable!
    const viableExpiry = new Date(now + 8 * 60 * 60 * 1000);
    expect(isUnitViableForTransit(viableExpiry, 60, 6)).toBe(true);

    // Expires in 5 hours (eta = 60 min + buffer 6h = 7h required) -> not viable for loan!
    const nonViableExpiry = new Date(now + 5 * 60 * 60 * 1000);
    expect(isUnitViableForTransit(nonViableExpiry, 60, 6)).toBe(false);
  });
});
