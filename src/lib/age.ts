export type Visibility = 'public' | 'amis' | 'prive';

export const MIN_REGISTRATION_AGE = 15;
export const MAJORITY_AGE = 18;

/** Âge en années révolues à une date donnée (dates locales). */
export function ageOn(birthDate: Date, today: Date): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function canRegister(birthDate: Date, today: Date = new Date()): boolean {
  if (birthDate.getTime() > today.getTime()) return false;
  return ageOn(birthDate, today) >= MIN_REGISTRATION_AGE;
}

export function isMinor(birthDate: Date, today: Date = new Date()): boolean {
  return ageOn(birthDate, today) < MAJORITY_AGE;
}

export function effectiveVisibility(
  chosen: Visibility,
  birthDate: Date,
  today: Date = new Date(),
): Visibility {
  return isMinor(birthDate, today) ? 'prive' : chosen;
}
