/**
 * backfillTools.js
 *
 * One-time backfill script to fix Tool documents created before the
 * Phase 1 schema/field mapping fixes. Those documents are missing:
 *   - platforms (empty array)
 *   - category  (empty string)
 *   - githubUrl (empty string)
 *   - githubStars / githubForks (0, even though CandidateTool has real values)
 *   - validated: true
 *
 * Matching strategy (safest available):
 *   Primary:   CandidateTool.officialUrl === Tool.officialUrl
 *   Fallback:  CandidateTool.name        === Tool.name
 *
 * Both fields exist and are reliably populated on all documents.
 * We prefer officialUrl because it is a more stable external identifier
 * than a scraped repo name.
 *
 * Safety rules:
 *   - Never overwrite a non-empty value with an empty/null value.
 *   - Never create new Tool documents.
 *   - Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node backend/scripts/backfillTools.js
 *   (from the project-final directory)
 *
 *   OR from inside backend/:
 *   node scripts/backfillTools.js
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const connectDB = require("../config/db");
const CandidateTool = require("../models/CandidateTool");
const Tool = require("../models/Tool");

async function backfill() {
  await connectDB();

  const candidates = await CandidateTool.find({ validationStatus: "validated" }).lean();

  console.log(`\nFound ${candidates.length} validated CandidateTool documents.`);
  console.log("Starting backfill...\n");

  let found = 0;
  let updated = 0;
  let skipped = 0;
  let notMatched = 0;

  for (const candidate of candidates) {
    // ── Step 1: find the corresponding Tool ───────────────────────────────────
    let tool = null;

    // Primary match: officialUrl (most reliable external identifier)
    if (candidate.officialUrl) {
      tool = await Tool.findOne({ officialUrl: candidate.officialUrl });
    }

    // Fallback: name (unique in Tool schema)
    if (!tool && candidate.name) {
      tool = await Tool.findOne({ name: candidate.name });
    }

    if (!tool) {
      console.log(`  [NOT MATCHED] No Tool found for: "${candidate.name}"`);
      notMatched++;
      continue;
    }

    found++;

    // ── Step 2: build update object (only fill missing/empty values) ──────────
    const update = {};

    // platforms — fill if currently empty
    if (
      (!tool.platforms || tool.platforms.length === 0) &&
      candidate.platforms &&
      candidate.platforms.length > 0
    ) {
      update.platforms = candidate.platforms;
    }

    // category — fill if currently empty string
    if (
      (!tool.category || tool.category.trim() === "") &&
      candidate.category &&
      candidate.category.trim() !== ""
    ) {
      update.category = candidate.category;
    }

    // githubUrl — fill if currently empty
    if (
      (!tool.githubUrl || tool.githubUrl.trim() === "") &&
      candidate.githubUrl &&
      candidate.githubUrl.trim() !== ""
    ) {
      update.githubUrl = candidate.githubUrl;
    }

    // githubStars — fill if currently 0 and candidate has real value
    if (tool.githubStars === 0 && candidate.githubStars > 0) {
      update.githubStars = candidate.githubStars;
    }

    // githubForks — fill if currently 0 and candidate has real value
    if (tool.githubForks === 0 && candidate.githubForks > 0) {
      update.githubForks = candidate.githubForks;
    }

    // logoDomain — fill if currently empty
    if (
      (!tool.logoDomain || tool.logoDomain.trim() === "") &&
      candidate.logoDomain &&
      candidate.logoDomain.trim() !== ""
    ) {
      update.logoDomain = candidate.logoDomain;
    }

    // tags — fill if currently empty
    if (
      (!tool.tags || tool.tags.length === 0) &&
      candidate.tags &&
      candidate.tags.length > 0
    ) {
      update.tags = candidate.tags;
    }

    // isTrending — only set to true if candidate says so and tool currently false
    if (!tool.isTrending && candidate.isTrending === true) {
      update.isTrending = true;
    }

    // validated — always mark true for validated candidates
    if (!tool.validated) {
      update.validated = true;
    }

    // ── Step 3: skip if nothing to update ────────────────────────────────────
    if (Object.keys(update).length === 0) {
      console.log(`  [SKIPPED]     Already up to date: "${tool.name}"`);
      skipped++;
      continue;
    }

    // ── Step 4: apply the update ──────────────────────────────────────────────
    await Tool.updateOne({ _id: tool._id }, { $set: update });

    const updatedFields = Object.keys(update).join(", ");
    console.log(`  [UPDATED]     "${tool.name}" → set: ${updatedFields}`);
    updated++;
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n========== Backfill Summary ==========");
  console.log(`Candidates processed: ${candidates.length}`);
  console.log(`Tools found:          ${found}`);
  console.log(`Tools updated:        ${updated}`);
  console.log(`Tools skipped:        ${skipped}  (already correct)`);
  console.log(`Not matched:          ${notMatched}  (no Tool found for candidate)`);
  console.log("======================================\n");

  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
