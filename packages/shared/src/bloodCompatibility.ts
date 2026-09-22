import { BloodGroup, BloodComponent, BLOOD_GROUPS } from './constants.js';

/**
 * CLINICAL TRANSFUSION COMPATIBILITY ENGINE
 *
 * NOTE: These blood handling and compatibility rules reflect standard clinical transfusion
 * protocols (DGHS / NACO India Guidelines & AABB Technical Manual).
 * All automated matching rules must be validated by the Blood Bank Medical Officer (BMO)
 * before production deployment.
 */

// Red Blood Cell (PRBC & WHOLE) compatibility:
// Evaluates donor antigens against recipient antibodies.
// O- has neither A, B nor Rh antigen -> universal donor.
// AB+ has both A, B and Rh antigen (no anti-A, anti-B, or anti-D antibodies) -> universal recipient.
const RBC_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal Recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Can only receive O-
};

// Fresh Frozen Plasma (FFP / PLASMA) compatibility:
// INVERSE OF RED CELL COMPATIBILITY!
// Plasma contains antibodies.
// Donor plasma must NOT contain antibodies against recipient antigens.
// AB plasma has neither anti-A nor anti-B -> universal plasma donor!
// O plasma has both anti-A and anti-B -> can ONLY be given to O recipients.
const PLASMA_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'O+': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], // O recipients can receive any plasma (they have no A/B antigens)
  'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'A+': ['A+', 'A-', 'AB+', 'AB-'],
  'A-': ['A+', 'A-', 'AB+', 'AB-'],
  'B+': ['B+', 'B-', 'AB+', 'AB-'],
  'B-': ['B+', 'B-', 'AB+', 'AB-'],
  'AB+': ['AB+', 'AB-'], // AB recipients can ONLY receive AB plasma (no antibodies to react with their A and B antigens)
  'AB-': ['AB+', 'AB-'],
};

// Platelets compatibility:
// ABO-identical is first choice. If unavailable, ABO-compatible plasma/platelets are accepted.
// Rh-negative female of childbearing age must receive Rh-negative platelets to prevent alloimmunization.
const PLATELETS_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'A+': ['A+', 'A-', 'AB+', 'AB-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

/**
 * Checks if a specific donor blood group is compatible with a recipient blood group
 * for a given component type.
 */
export function isBloodCompatible(
  donorGroup: BloodGroup,
  recipientGroup: BloodGroup,
  component: BloodComponent = 'WHOLE'
): boolean {
  const allowed = getCompatibleDonorGroups(recipientGroup, component);
  return allowed.includes(donorGroup);
}

/**
 * Returns all compatible donor groups for a given recipient and component.
 * Exact match is always sorted first.
 */
export function getCompatibleDonorGroups(
  recipientGroup: BloodGroup,
  component: BloodComponent = 'WHOLE'
): BloodGroup[] {
  let list: BloodGroup[];
  if (component === 'PLASMA') {
    list = PLASMA_COMPATIBILITY[recipientGroup] || [];
  } else if (component === 'PLATELETS') {
    list = PLATELETS_COMPATIBILITY[recipientGroup] || [];
  } else {
    list = RBC_COMPATIBILITY[recipientGroup] || [];
  }

  // Ensure recipient's exact group is first if present
  return [...list].sort((a, b) => {
    if (a === recipientGroup) return -1;
    if (b === recipientGroup) return 1;
    return 0;
  });
}

/**
 * Returns all compatible recipient groups that a given donor blood group can donate to.
 */
export function getCompatibleRecipientGroups(
  donorGroup: BloodGroup,
  component: BloodComponent = 'WHOLE'
): BloodGroup[] {
  return BLOOD_GROUPS.filter((recipient) =>
    isBloodCompatible(donorGroup, recipient, component)
  );
}

/**
 * FEFO (First-Expired, First-Out) shelf-life validation.
 * Ensures the unit has enough remaining life for transit + transfusion.
 */
export function isUnitViableForTransit(
  expiresAt: Date | string,
  etaMins: number,
  bufferHours = 6
): boolean {
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  const minRequiredMs = (etaMins + bufferHours * 60) * 60 * 1000;
  return expiry - now > minRequiredMs;
}
