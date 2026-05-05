import {
  COUNTRY_LABELS,
  getEducationLevelsByCountry,
  isValidEducationLevel,
  normalizeCountry,
  normalizeCountryAndLevel,
  SUPPORTED_COUNTRIES,
} from '@/lib/education-system';

export const COUNTRY_OPTIONS = SUPPORTED_COUNTRIES.map((country) => country.label) as readonly string[];
export const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'] as const;
export const LEARNING_MODE_OPTIONS = ['self', 'parent_managed', 'school_managed', 'teacher_managed', 'hybrid'] as const;
export const LOGIN_MODE_OPTIONS = ['access_code', 'email_password', 'both'] as const;

export type CountryOption = (typeof COUNTRY_OPTIONS)[number];
export type GenderOption = (typeof GENDER_OPTIONS)[number];
export type LearningModeOption = (typeof LEARNING_MODE_OPTIONS)[number];
export type LoginModeOption = (typeof LOGIN_MODE_OPTIONS)[number];

export function getCountryOptions() {
  return [...COUNTRY_OPTIONS];
}

export function getEducationLevelOptionsForCountry(country: string) {
  return getEducationLevelsByCountry(country);
}

export function getDefaultCountryOption(): CountryOption {
  return COUNTRY_LABELS.UGANDA as CountryOption;
}

export function getNormalizedCountryLabel(country: string) {
  const normalized = normalizeCountry(country);
  return normalized ? COUNTRY_LABELS[normalized] : null;
}

export function validateCountrySelection(country: string) {
  return Boolean(normalizeCountry(country));
}

export function validateCountryLevelSelection(country: string, educationLevel: string) {
  return isValidEducationLevel(country, educationLevel);
}

export function normalizeCountryLevelSelection(record: { country?: string | null; educationLevel?: string | null }) {
  return normalizeCountryAndLevel({
    country: record.country,
    level: record.educationLevel,
  });
}
