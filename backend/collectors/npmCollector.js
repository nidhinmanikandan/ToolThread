const axios = require("axios");
const CandidateTool = require("../models/CandidateTool");

const SEARCH_TERMS = ["ai tool", "ai sdk", "llm", "machine learning"];
const RESULTS_PER_TERM = 20;

function getPackageUrl(packageData) {
  return (
    packageData.links?.homepage ||
    packageData.links?.repository ||
    `https://www.npmjs.com/package/${packageData.package.name}`
  );
}

function isRelevantPackage(packageData) {
  const packageInfo = packageData.package || {};
  const text = [
    packageInfo.name,
    packageInfo.description,
    ...(packageInfo.keywords || []),
  ]
    .join(" ")
    .toLowerCase();

  return /\b(ai|artificial intelligence|llm|machine learning|deep learning|openai|generative)\b/.test(
    text,
  );
}

async function collectNpmTools() {
  const packages = new Map();

  for (const term of SEARCH_TERMS) {
    try {
      const response = await axios.get(
        "https://registry.npmjs.org/-/v1/search",
        {
          params: {
            text: term,
            size: RESULTS_PER_TERM,
          },
          timeout: 10000,
        },
      );

      for (const result of response.data.objects || []) {
        if (result.package?.name && isRelevantPackage(result)) {
          packages.set(result.package.name, result);
        }
      }
    } catch (error) {
      console.error(`npm search failed for "${term}":`, error.message);
    }
  }

  let savedCount = 0;

  for (const result of packages.values()) {
    const packageInfo = result.package;
    const officialUrl = getPackageUrl(result);

    await CandidateTool.updateOne(
      { "sources.type": "npm", "sources.externalId": packageInfo.name },
      {
        name: packageInfo.name,
        category: "npm Package",
        description: packageInfo.description || "",
        officialUrl,
        logoDomain: "npmjs.com",
        tags: packageInfo.keywords || [],
        platforms: ["JavaScript", "Node.js"],
        source: "npm-search",
        discoveryScore: result.score?.final || 0,
        sources: [
          {
            type: "npm",
            url: `https://www.npmjs.com/package/${packageInfo.name}`,
            externalId: packageInfo.name,
            metadata: {
              version: packageInfo.version || "",
              weeklyDownloads: result.downloads?.weekly || 0,
              publisher: packageInfo.publisher?.username || "",
            },
          },
        ],
        lastDiscoveredAt: new Date(),
      },
      { upsert: true },
    );

    savedCount++;
    console.log(packageInfo.name);
  }

  console.log(`Saved ${savedCount} npm package candidates.`);
  return Array.from(packages.values());
}

module.exports = collectNpmTools;
