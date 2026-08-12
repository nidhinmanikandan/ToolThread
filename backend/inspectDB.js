require("dotenv").config();

const connectDB = require("./config/db");
const CandidateTool = require("./models/CandidateTool");
const Tool = require("./models/Tool");

async function inspect() {
  await connectDB();

  // ─── CandidateTool counts ───────────────────────────────────────────────────
  const totalCandidates = await CandidateTool.countDocuments();
  const githubCandidates = await CandidateTool.countDocuments({ source: "github-search" });
  const hnCandidates = await CandidateTool.countDocuments({ source: "hackernews" });
  const pendingCandidates = await CandidateTool.countDocuments({ validationStatus: "pending" });
  const rejectedCandidates = await CandidateTool.countDocuments({ validationStatus: "rejected" });
  const validatedCandidates = await CandidateTool.countDocuments({ validationStatus: "validated" });
  const duplicateCandidates = await CandidateTool.countDocuments({ validationStatus: "duplicate" });

  console.log("\n===== CandidateTool Collection =====");
  console.log(`Total candidates:      ${totalCandidates}`);
  console.log(`GitHub candidates:     ${githubCandidates}`);
  console.log(`HackerNews candidates: ${hnCandidates}`);
  console.log(`Pending:               ${pendingCandidates}`);
  console.log(`Rejected:              ${rejectedCandidates}`);
  console.log(`Validated:             ${validatedCandidates}`);
  console.log(`Duplicates:            ${duplicateCandidates}`);

  // ─── Duplicate detection: same officialUrl ──────────────────────────────────
  const dupesByUrl = await CandidateTool.aggregate([
    { $group: { _id: "$officialUrl", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  console.log(`\nDuplicate officialUrl entries: ${dupesByUrl.length}`);
  if (dupesByUrl.length) {
    dupesByUrl.forEach((d) => console.log(`  ${d._id} (${d.count}x)`));
  }

  // ─── Duplicate detection: same sources.externalId ──────────────────────────
  const dupesByExternalId = await CandidateTool.aggregate([
    { $unwind: "$sources" },
    { $group: { _id: "$sources.externalId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  console.log(`Duplicate sources.externalId entries: ${dupesByExternalId.length}`);
  if (dupesByExternalId.length) {
    dupesByExternalId.forEach((d) => console.log(`  externalId=${d._id} (${d.count}x)`));
  }

  // ─── Sample GitHub CandidateTool ────────────────────────────────────────────
  const sampleGithub = await CandidateTool.findOne({ source: "github-search" }).lean();
  console.log("\n--- Sample GitHub CandidateTool ---");
  if (sampleGithub) {
    console.log(`  name:             ${sampleGithub.name}`);
    console.log(`  officialUrl:      ${sampleGithub.officialUrl}`);
    console.log(`  category:         ${sampleGithub.category}`);
    console.log(`  platforms:        ${JSON.stringify(sampleGithub.platforms)}`);
    console.log(`  source:           ${sampleGithub.source}`);
    console.log(`  validationStatus: ${sampleGithub.validationStatus}`);
    console.log(`  isTrending:       ${sampleGithub.isTrending}`);
    if (sampleGithub.sources && sampleGithub.sources.length) {
      const s = sampleGithub.sources[0];
      console.log(`  sources[0].type:       ${s.type}`);
      console.log(`  sources[0].url:        ${s.url}`);
      console.log(`  sources[0].externalId: ${s.externalId}`);
      console.log(`  sources[0].metadata:   ${JSON.stringify(s.metadata)}`);
    } else {
      console.log(`  sources: (empty)`);
    }
  } else {
    console.log("  (none found)");
  }

  // ─── Sample HackerNews CandidateTool ────────────────────────────────────────
  const sampleHN = await CandidateTool.findOne({ source: "hackernews" }).lean();
  console.log("\n--- Sample HackerNews CandidateTool ---");
  if (sampleHN) {
    console.log(`  name:             ${sampleHN.name}`);
    console.log(`  officialUrl:      ${sampleHN.officialUrl}`);
    console.log(`  category:         ${sampleHN.category}`);
    console.log(`  source:           ${sampleHN.source}`);
    console.log(`  validationStatus: ${sampleHN.validationStatus}`);
    console.log(`  isTrending:       ${sampleHN.isTrending}`);
    if (sampleHN.sources && sampleHN.sources.length) {
      const s = sampleHN.sources[0];
      console.log(`  sources[0].type:       ${s.type}`);
      console.log(`  sources[0].url:        ${s.url}`);
      console.log(`  sources[0].externalId: ${s.externalId}`);
      console.log(`  sources[0].metadata:   ${JSON.stringify(s.metadata)}`);
    } else {
      console.log(`  sources: (empty)`);
    }
  } else {
    console.log("  (none found)");
  }

  // ─── Tool collection ─────────────────────────────────────────────────────────
  const totalTools = await Tool.countDocuments();
  const resolvedTools = await Tool.countDocuments({ resolved: true });
  const enrichedTools = await Tool.countDocuments({ enriched: true });
  const validatedTools = await Tool.countDocuments({ validated: true });
  const toolsWithoutOfficialUrl = await Tool.countDocuments({
    $or: [{ officialUrl: "" }, { officialUrl: { $exists: false } }],
  });
  const toolsWithoutPlatforms = await Tool.countDocuments({ platforms: { $size: 0 } });
  const toolsWithoutCategory = await Tool.countDocuments({
    $or: [{ category: "" }, { category: { $exists: false } }],
  });

  console.log("\n===== Tool Collection =====");
  console.log(`Total tools:              ${totalTools}`);
  console.log(`Resolved (resolved=true): ${resolvedTools}`);
  console.log(`Enriched (enriched=true): ${enrichedTools}`);
  console.log(`Validated (validated=true):${validatedTools}`);
  console.log(`Tools without officialUrl: ${toolsWithoutOfficialUrl}`);
  console.log(`Tools without platforms:   ${toolsWithoutPlatforms}`);
  console.log(`Tools without category:    ${toolsWithoutCategory}`);

  // ─── Sample Tool ─────────────────────────────────────────────────────────────
  const sampleTool = await Tool.findOne({ source: { $in: ["github-search", "hackernews"] } }).lean();
  console.log("\n--- Sample Tool (pipeline-created) ---");
  if (sampleTool) {
    console.log(`  name:        ${sampleTool.name}`);
    console.log(`  source:      ${sampleTool.source}`);
    console.log(`  officialUrl: ${sampleTool.officialUrl}`);
    console.log(`  category:    ${sampleTool.category}`);
    console.log(`  platforms:   ${JSON.stringify(sampleTool.platforms)}`);
    console.log(`  githubUrl:   ${sampleTool.githubUrl}`);
    console.log(`  githubStars: ${sampleTool.githubStars}`);
    console.log(`  isTrending:  ${sampleTool.isTrending}`);
    console.log(`  validated:   ${sampleTool.validated}`);
    console.log(`  resolved:    ${sampleTool.resolved}`);
    console.log(`  enriched:    ${sampleTool.enriched}`);
    console.log(`  logoDomain:  ${sampleTool.logoDomain}`);
    console.log(`  description: ${(sampleTool.description || "").slice(0, 80)}`);
  } else {
    console.log("  (none found)");
  }

  process.exit(0);
}

inspect().catch((err) => {
  console.error("Inspection failed:", err.message);
  process.exit(1);
});
