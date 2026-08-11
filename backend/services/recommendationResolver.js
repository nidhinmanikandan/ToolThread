const Recommendation = require("../models/Recommendation");
const recommendTools = require("./aiRecommendation");

async function resolveRecommendations(profile) {
  const role = profile.role?.trim();
  const interest = profile.interest?.trim();
  const level = profile.level?.trim();

  if (!role || !interest || !level) {
    throw new Error("Incomplete profile data for recommendation resolution");
  }

  const cachedRecommendation = await Recommendation.findOne({
    role,
    interest,
    level,
  });

  if (
    cachedRecommendation &&
    Array.isArray(cachedRecommendation.tools) &&
    cachedRecommendation.tools.length === 12
  ) {
    return cachedRecommendation.tools;
  }

  const tools = await recommendTools(profile);

  await Recommendation.findOneAndUpdate(
    { role, interest, level },
    {
      role,
      interest,
      level,
      tools,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return tools;
}

module.exports = resolveRecommendations;
