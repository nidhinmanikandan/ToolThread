const MIN_OBSERVATIONS = 3;
const MIN_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const GROWTH_THRESHOLD_PERCENT = 10;

function calculateTrend(observations, now = new Date()) {
  const nowMs = new Date(now).getTime();
  if (!Array.isArray(observations) || !Number.isFinite(nowMs)) {
    return { status: "insufficient", reason: "invalid_input" };
  }

  if (observations.length === 0) {
    return { status: "insufficient", reason: "no_observations" };
  }

  const first = observations[0];
  if (
    observations.some(
      (observation) =>
        observation.toolId?.toString() !== first.toolId?.toString() ||
        observation.source !== first.source ||
        observation.signalType !== first.signalType ||
        observation.sourceEventId !== first.sourceEventId,
    )
  ) {
    return { status: "insufficient", reason: "incompatible_observations" };
  }

  const cutoff = nowMs - LOOKBACK_MS;
  const unique = new Map();
  for (const observation of observations) {
    const observedAt = new Date(observation.observedAt).getTime();
    const measurement = observation.measurement;
    if (
      !Number.isFinite(observedAt) ||
      observedAt > nowMs ||
      !Number.isFinite(measurement) ||
      measurement < 0
    ) {
      return { status: "insufficient", reason: "invalid_measurement" };
    }
    if (observedAt < cutoff) continue;

    const key = `${observation.sourceEventId}:${observedAt}`;
    const existing = unique.get(key);
    if (existing && existing.measurement !== measurement) {
      return { status: "insufficient", reason: "inconsistent_duplicate" };
    }
    if (!existing) {
      unique.set(key, { observedAt, measurement });
    }
  }

  const samples = Array.from(unique.values()).sort((left, right) => left.observedAt - right.observedAt);
  if (samples.length === 0) {
    return { status: "insufficient", reason: "no_observations_in_window" };
  }

  const latest = samples[samples.length - 1];
  if (nowMs - latest.observedAt > MAX_AGE_MS) {
    return { status: "insufficient", reason: "stale_observations" };
  }
  if (samples.length < MIN_OBSERVATIONS) {
    return { status: "insufficient", reason: "insufficient_observations" };
  }

  const earliest = samples[0];
  if (latest.observedAt - earliest.observedAt < MIN_WINDOW_MS) {
    return { status: "insufficient", reason: "observation_window_too_short" };
  }
  if (earliest.measurement <= 0) {
    return { status: "insufficient", reason: "non_positive_baseline" };
  }

  const growthPercent =
    ((latest.measurement - earliest.measurement) / earliest.measurement) * 100;
  if (growthPercent >= GROWTH_THRESHOLD_PERCENT) {
    return { status: "increasing", growthPercent };
  }
  if (growthPercent <= -GROWTH_THRESHOLD_PERCENT) {
    return { status: "decreasing", growthPercent };
  }
  return { status: "stable", growthPercent };
}

module.exports = {
  calculateTrend,
  GROWTH_THRESHOLD_PERCENT,
  LOOKBACK_MS,
  MAX_AGE_MS,
  MIN_OBSERVATIONS,
  MIN_WINDOW_MS,
};
