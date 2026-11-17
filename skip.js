/** Split a POSIX or Windows path into its non-empty segments. */
export function pathSegments(value) {
  if (typeof value !== 'string' || !value) return [];
  return value.split(/[\\/]+/).filter(Boolean);
}

const DEFAULTS = {
  sessionIdPrefixes: [],
  agentPresetPrefixes: [],
  cwdSegments: [],
};

/**
 * Normalize one rule list: keep non-empty strings, drop everything else.
 * A cwd entry may be written as a bare directory name or as a path; only its
 * last segment takes part in matching, so `/tmp/qq-bridge` and `qq-bridge` agree.
 */
function list(value, fallback, segment) {
  if (!Array.isArray(value)) return fallback;
  const kept = value
    .filter(entry => typeof entry === 'string')
    .map(entry => (segment ? pathSegments(entry).at(-1) ?? '' : entry))
    .filter(entry => entry !== '');
  return kept;
}

/**
 * Resolve the skip rules from the loader entry's `config`, falling back to the
 * empty defaults. An explicitly empty array disables that rule; a missing or
 * non-array value keeps the default.
 */
export function skipRules(config) {
  const source = config && typeof config === 'object' ? config : {};
  return {
    sessionIdPrefixes: list(source.skipSessionIdPrefixes, DEFAULTS.sessionIdPrefixes, false),
    agentPresetPrefixes: list(source.skipAgentPresetPrefixes, DEFAULTS.agentPresetPrefixes, false),
    cwdSegments: list(source.skipCwdSegments, DEFAULTS.cwdSegments, true),
  };
}

/**
 * A cwd rule matches its own directory and the suffixed variants the bridge
 * creates beside it (`qq-bridge-probe-ab-compat`, `qq-bridge-state-slang-agent`),
 * but never an unrelated name that merely contains it (`not-qq-bridge`).
 */
function matchesSegment(segments, name) {
  return segments.some(segment => segment === name || segment.startsWith(`${name}-`));
}

/**
 * @param session - live Session: `id` plus the durable `header`.
 * @param rules - output of {@link skipRules}.
 * @returns the matched rule name, or undefined when the session may notify.
 */
export function skipReason(session, rules) {
  const id = typeof session?.id === 'string' ? session.id : '';
  const header = session?.header ?? {};
  const preset = typeof header.agentPreset === 'string' ? header.agentPreset : '';
  const segments = pathSegments(header.cwd);
  if (rules.sessionIdPrefixes.some(prefix => id.startsWith(prefix))) return 'session-id';
  if (rules.agentPresetPrefixes.some(prefix => preset.startsWith(prefix))) return 'agent-preset';
  if (rules.cwdSegments.some(name => matchesSegment(segments, name))) return 'cwd';
  return undefined;
}
