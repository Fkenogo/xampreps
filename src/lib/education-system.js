export const NORMALIZED_EDUCATION_STAGES = [
  'PRIMARY',
  'LOWER_SECONDARY',
  'UPPER_SECONDARY',
];

export const SUPPORTED_COUNTRIES = [
  { code: 'UGANDA', label: 'Uganda' },
  { code: 'KENYA', label: 'Kenya' },
  { code: 'TANZANIA', label: 'Tanzania' },
  { code: 'RWANDA', label: 'Rwanda' },
  { code: 'BURUNDI', label: 'Burundi' },
];

export const COUNTRY_LABELS = Object.freeze(
  SUPPORTED_COUNTRIES.reduce((labels, country) => {
    labels[country.code] = country.label;
    return labels;
  }, {}),
);

export const EDUCATION_LEVELS_BY_COUNTRY = Object.freeze({
  UGANDA: ['PLE', 'UCE', 'UACE'],
  KENYA: ['KCPE', 'KPSEA', 'KJSEA', 'KCSE'],
  TANZANIA: ['PSLE', 'CSEE', 'ACSEE'],
  RWANDA: ['PLE', 'O_LEVEL', 'A_LEVEL'],
  BURUNDI: ['CEP', 'CYCLE_FONDAMENTAL', 'EXAMEN_ETAT'],
});

export const STAGE_BY_COUNTRY_AND_LEVEL = Object.freeze({
  UGANDA: {
    PLE: 'PRIMARY',
    UCE: 'LOWER_SECONDARY',
    UACE: 'UPPER_SECONDARY',
  },
  KENYA: {
    KCPE: 'PRIMARY',
    KPSEA: 'PRIMARY',
    KJSEA: 'LOWER_SECONDARY',
    KCSE: 'UPPER_SECONDARY',
  },
  TANZANIA: {
    PSLE: 'PRIMARY',
    CSEE: 'LOWER_SECONDARY',
    ACSEE: 'UPPER_SECONDARY',
  },
  RWANDA: {
    PLE: 'PRIMARY',
    O_LEVEL: 'LOWER_SECONDARY',
    A_LEVEL: 'UPPER_SECONDARY',
  },
  BURUNDI: {
    CEP: 'PRIMARY',
    CYCLE_FONDAMENTAL: 'LOWER_SECONDARY',
    EXAMEN_ETAT: 'UPPER_SECONDARY',
  },
});

export const ALL_EDUCATION_LEVELS = Object.freeze(
  Array.from(
    new Set(
      Object.values(EDUCATION_LEVELS_BY_COUNTRY).flat(),
    ),
  ),
);

const COUNTRY_ALIASES = Object.freeze({
  UGANDA: 'UGANDA',
  Uganda: 'UGANDA',
  KENYA: 'KENYA',
  Kenya: 'KENYA',
  TANZANIA: 'TANZANIA',
  Tanzania: 'TANZANIA',
  RWANDA: 'RWANDA',
  Rwanda: 'RWANDA',
  BURUNDI: 'BURUNDI',
  Burundi: 'BURUNDI',
});

function normalizeEducationLevelValue(level) {
  if (typeof level !== 'string') return null;
  const normalized = level.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return normalized.length > 0 ? normalized : null;
}

export function normalizeCountry(country) {
  if (typeof country !== 'string') return null;
  return COUNTRY_ALIASES[country.trim()] ?? COUNTRY_ALIASES[country.trim().toUpperCase()] ?? null;
}

export function getEducationLevelsByCountry(country) {
  const countryCode = normalizeCountry(country) ?? 'UGANDA';
  return [...(EDUCATION_LEVELS_BY_COUNTRY[countryCode] ?? [])];
}

export function getStageForEducationLevel(country, level) {
  const normalized = normalizeCountryAndLevel({ country, level });
  return normalized.valid ? normalized.stage : null;
}

export function isValidEducationLevel(country, level) {
  return Boolean(getStageForEducationLevel(country, level));
}

export function normalizeCountryAndLevel(record) {
  const hasExplicitCountry = typeof record?.country === 'string' && record.country.trim().length > 0;
  const countryCode = hasExplicitCountry ? normalizeCountry(record.country) : 'UGANDA';
  const levelCode = normalizeEducationLevelValue(record?.level);
  const assumedLegacyUganda = !hasExplicitCountry && Boolean(levelCode);

  if (!countryCode) {
    return {
      countryCode: null,
      countryLabel: null,
      levelCode,
      stage: null,
      valid: false,
      assumedLegacyUganda,
    };
  }

  if (!levelCode) {
    return {
      countryCode,
      countryLabel: COUNTRY_LABELS[countryCode] ?? countryCode,
      levelCode: null,
      stage: null,
      valid: true,
      assumedLegacyUganda: false,
    };
  }

  const stage = STAGE_BY_COUNTRY_AND_LEVEL[countryCode]?.[levelCode] ?? null;

  return {
    countryCode,
    countryLabel: COUNTRY_LABELS[countryCode] ?? countryCode,
    levelCode,
    stage,
    valid: Boolean(stage),
    assumedLegacyUganda,
  };
}
