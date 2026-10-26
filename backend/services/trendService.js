const MIN_OBSERVATIONS = 3;
const MIN_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const GROWTH_THRESHOLD_PERCENT = 10;

function calculateTrendSummary(summary, now = new Date()) {
  const nowMs = new Date(now).getTime();
  if (!summary || typeof summary !== "object" || !Number.isFinite(nowMs)) {
    return { status: "insufficient", reason: "invalid_input" };
  }

  if (!Number.isInteger(summary.observationCount) || summary.observationCount <= 0) {
    return { status: "insufficient", reason: "no_observations" };
  }
  if (
    !summary.toolId ||
    typeof summary.sourceEventId !== "string" ||
    !summary.sourceEventId.trim() ||
    !(
      (summary.source === "github" && summary.signalType === "stars_total") ||
      (summary.source === "npm" && summary.signalType === "weekly_downloads")
    )
  ) {
    return { status: "insufficient", reason: "incompatible_observations" };
  }
  if (summary.conflictingObservationCount > 0) {
    return { status: "insufficient", reason: "inconsistent_duplicate" };
  }

  const firstObservedAt = new Date(summary.firstObservedAt).getTime();
  const lastObservedAt = new Date(summary.lastObservedAt).getTime();
  if (
    !Number.isFinite(firstObservedAt) ||
    !Number.isFinite(lastObservedAt) ||
    !Number.isFinite(summary.firstMeasurement) ||
    !Number.isFinite(summary.lastMeasurement) ||
    summary.firstMeasurement < 0 ||
    summary.lastMeasurement < 0 ||
    firstObservedAt > lastObservedAt ||
    lastObservedAt > nowMs
  ) {
    return { status: "insufficient", reason: "invalid_measurement" };
  }
  if (firstObservedAt < nowMs - LOOKBACK_MS) {
    return { status: "insufficient", reason: "no_observations_in_window" };
  }
  if (nowMs - lastObservedAt > MAX_AGE_MS) {
    return { status: "insufficient", reason: "stale_observations" };
  }
  if (summary.observationCount < MIN_OBSERVATIONS) {
    return { status: "insufficient", reason: "insufficient_observations" };
  }
  if (lastObservedAt - firstObservedAt < MIN_WINDOW_MS) {
    return { status: "insufficient", reason: "observation_window_too_short" };
  }
  if (summary.firstMeasurement <= 0) {
    return { status: "insufficient", reason: "non_positive_baseline" };
  }

  const growthPercent =
    ((summary.lastMeasurement - summary.firstMeasurement) / summary.firstMeasurement) * 100;
  if (growthPercent >= GROWTH_THRESHOLD_PERCENT) {
    return { status: "increasing", growthPercent };
  }
  if (growthPercent <= -GROWTH_THRESHOLD_PERCENT) {
    return { status: "decreasing", growthPercent };
  }
  return { status: "stable", growthPercent };
}

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
    !first ||
    observations.some(
      (observation) =>
        !observation ||
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

  return calculateTrendSummary(
    {
      ...first,
      observationCount: samples.length,
      firstObservedAt: samples[0].observedAt,
      firstMeasurement: samples[0].measurement,
      lastObservedAt: samples[samples.length - 1].observedAt,
      lastMeasurement: samples[samples.length - 1].measurement,
      conflictingObservationCount: 0,
    },
    now,
  );
}

module.exports = {
  calculateTrend,
  calculateTrendSummary,
  GROWTH_THRESHOLD_PERCENT,
  LOOKBACK_MS,
  MAX_AGE_MS,
  MIN_OBSERVATIONS,
  MIN_WINDOW_MS,
};
