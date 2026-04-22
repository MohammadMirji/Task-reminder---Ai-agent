function cleanEnvValue(value) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function normalizeOrigin(value) {
  const cleaned = cleanEnvValue(value);
  if (!cleaned) return '';

  try {
    return new URL(cleaned).origin;
  } catch (error) {
    return cleaned.replace(/\/+$/, '');
  }
}

function parseOriginList(...values) {
  return [...new Set(
    values
      .flatMap((value) => cleanEnvValue(value).split(','))
      .map((value) => normalizeOrigin(value))
      .filter(Boolean)
  )];
}

module.exports = {
  cleanEnvValue,
  normalizeOrigin,
  parseOriginList,
};
