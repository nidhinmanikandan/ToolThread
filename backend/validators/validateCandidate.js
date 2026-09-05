const CandidateTool = require("../models/CandidateTool");
const Tool = require("../models/Tool");

async function validateCandidate(candidate) {
  // Ignore invalid candidates
  if (!candidate.name || !candidate.officialUrl) {
    console.log(`Rejected: ${candidate.name || candidate._id}`);
    await CandidateTool.updateOne(
      { _id: candidate._id },
      {
        validationStatus: "rejected",
      },
    );
    return;
  }

  // Already exists?
  const exists = await Tool.findOne({
    name: candidate.name,
  });

  if (exists) {
    console.log(`Already exists: ${candidate.name}`);

    await CandidateTool.updateOne(
      { _id: candidate._id },
      {
        validationStatus: "duplicate",
      },
    );

    return;
  }

  const platforms = candidate.platforms?.length
    ? candidate.platforms
    : candidate.platform
      ? [candidate.platform]
      : [];

  const source = candidate.source || candidate.sources?.[0]?.type || "unknown";

  // Save into Tool database
  await Tool.create({
    name: candidate.name,
    category: candidate.category || "General",
    description: candidate.description || "",
    officialUrl: candidate.officialUrl,
    logoDomain: candidate.logoDomain || "",
    tags: candidate.tags || [],
    platforms: platforms,
    isTrending: Boolean(candidate.isTrending),
    source: source,
    githubUrl: candidate.githubUrl || "",
    githubStars: candidate.githubStars || 0,
    githubForks: candidate.githubForks || 0,
    validated: true,
  });

  await CandidateTool.updateOne(
    { _id: candidate._id },
    {
      validationStatus: "validated",
    },
  );

  console.log(candidate.name);
}

module.exports = validateCandidate;
