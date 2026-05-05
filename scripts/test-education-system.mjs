import {
  ALL_EDUCATION_LEVELS,
  getEducationLevelsByCountry,
  getStageForEducationLevel,
  isValidEducationLevel,
  normalizeCountryAndLevel,
} from '../src/lib/education-system.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const results = [];

function test(name, fn) {
  fn();
  results.push(name);
}

test('country to levels mapping', () => {
  assert(
    JSON.stringify(getEducationLevelsByCountry('UGANDA')) === JSON.stringify(['PLE', 'UCE', 'UACE']),
    'UGANDA levels mismatch',
  );
  assert(
    JSON.stringify(getEducationLevelsByCountry('KENYA')) === JSON.stringify(['KCPE', 'KPSEA', 'KJSEA', 'KCSE']),
    'KENYA levels mismatch',
  );
});

test('country and level to normalized stage mapping', () => {
  assert(getStageForEducationLevel('UGANDA', 'PLE') === 'PRIMARY', 'UGANDA PLE stage mismatch');
  assert(getStageForEducationLevel('KENYA', 'KJSEA') === 'LOWER_SECONDARY', 'KENYA KJSEA stage mismatch');
  assert(getStageForEducationLevel('BURUNDI', 'EXAMEN_ETAT') === 'UPPER_SECONDARY', 'BURUNDI EXAMEN_ETAT stage mismatch');
});

test('invalid country and level combinations fail', () => {
  assert(isValidEducationLevel('UGANDA', 'KCSE') === false, 'UGANDA + KCSE should fail');
  assert(isValidEducationLevel('KENYA', 'UACE') === false, 'KENYA + UACE should fail');
});

test('legacy Uganda-only records normalize safely', () => {
  const normalized = normalizeCountryAndLevel({ level: 'UCE' });
  assert(normalized.countryCode === 'UGANDA', 'Legacy record should default to UGANDA');
  assert(normalized.stage === 'LOWER_SECONDARY', 'Legacy UCE should map to LOWER_SECONDARY');
  assert(normalized.assumedLegacyUganda === true, 'Legacy Uganda assumption should be tracked');
});

test('legacy record with non-Uganda level fails safely', () => {
  const normalized = normalizeCountryAndLevel({ level: 'KCSE' });
  assert(normalized.countryCode === 'UGANDA', 'Legacy invalid record should still note UGANDA fallback');
  assert(normalized.valid === false, 'Legacy invalid record should fail validation');
  assert(normalized.stage === null, 'Legacy invalid record should not derive a stage');
});

test('all expected level codes are present', () => {
  assert(ALL_EDUCATION_LEVELS.includes('UACE'), 'UACE missing from combined level list');
  assert(ALL_EDUCATION_LEVELS.includes('KCSE'), 'KCSE missing from combined level list');
  assert(ALL_EDUCATION_LEVELS.includes('EXAMEN_ETAT'), 'EXAMEN_ETAT missing from combined level list');
});

console.log(`education-system tests passed: ${results.length}`);
for (const result of results) {
  console.log(`- ${result}`);
}
