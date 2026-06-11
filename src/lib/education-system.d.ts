export type SupportedCountryCode =
  | 'UGANDA'
  | 'KENYA'
  | 'TANZANIA'
  | 'RWANDA'
  | 'BURUNDI';

export type NormalizedEducationStage =
  | 'PRIMARY'
  | 'LOWER_SECONDARY'
  | 'UPPER_SECONDARY';

export type EducationLevelCode =
  | 'PLE'
  | 'UCE'
  | 'UACE'
  | 'KCPE'
  | 'KPSEA'
  | 'KJSEA'
  | 'KCSE'
  | 'PSLE'
  | 'CSEE'
  | 'ACSEE'
  | 'O_LEVEL'
  | 'A_LEVEL'
  | 'CEP'
  | 'CYCLE_FONDAMENTAL'
  | 'EXAMEN_ETAT';

export interface SupportedCountryOption {
  code: SupportedCountryCode;
  label: string;
}

export interface NormalizedCountryAndLevelResult {
  countryCode: SupportedCountryCode | null;
  countryLabel: string | null;
  levelCode: EducationLevelCode | null;
  stage: NormalizedEducationStage | null;
  valid: boolean;
  assumedLegacyUganda: boolean;
}

export const NORMALIZED_EDUCATION_STAGES: readonly NormalizedEducationStage[];
export const SUPPORTED_COUNTRIES: readonly SupportedCountryOption[];
export const COUNTRY_LABELS: Readonly<Record<SupportedCountryCode, string>>;
export const EDUCATION_LEVELS_BY_COUNTRY: Readonly<Record<SupportedCountryCode, readonly EducationLevelCode[]>>;
export const STAGE_BY_COUNTRY_AND_LEVEL: Readonly<Record<SupportedCountryCode, Readonly<Partial<Record<EducationLevelCode, NormalizedEducationStage>>>>>;
export const ALL_EDUCATION_LEVELS: readonly EducationLevelCode[];

export function normalizeCountry(country?: string | null): SupportedCountryCode | null;
export function getEducationLevelsByCountry(country?: string | null): EducationLevelCode[];
export function getStageForEducationLevel(country: string | null | undefined, level: string | null | undefined): NormalizedEducationStage | null;
export function isValidEducationLevel(country: string | null | undefined, level: string | null | undefined): boolean;
export function normalizeCountryAndLevel(record: {
  country?: string | null;
  level?: string | null;
}): NormalizedCountryAndLevelResult;
