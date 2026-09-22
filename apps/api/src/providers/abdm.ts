export interface AbhaProfile {
  abhaId: string;
  name: string;
  gender: string;
  yearOfBirth: number;
  mobile: string;
  state: string;
  district: string;
}

export interface AbdmAdapter {
  verifyAbhaId(abhaId: string): Promise<{ valid: boolean; profile?: AbhaProfile; error?: string }>;
}

export class MockAbdmAdapter implements AbdmAdapter {
  async verifyAbhaId(abhaId: string): Promise<{ valid: boolean; profile?: AbhaProfile; error?: string }> {
    const cleanId = abhaId.replace(/[\s-]/g, '');

    // ABHA number is standard 14 digits
    if (!/^\d{14}$/.test(cleanId)) {
      return {
        valid: false,
        error: 'Invalid ABHA ID. Must be exactly 14 digits (e.g. 14-1234-5678-9012)',
      };
    }

    return {
      valid: true,
      profile: {
        abhaId: cleanId,
        name: 'Verified Citizen Profile',
        gender: 'M',
        yearOfBirth: 1988,
        mobile: 'XXXXXX9012',
        state: 'Maharashtra',
        district: 'Navi Mumbai & Mumbai',
      },
    };
  }
}

export function getAbdmAdapter(): AbdmAdapter {
  return new MockAbdmAdapter();
}
