const { Octokit } = require("@octokit/rest");
const Tool = require("../models/Tool");
const CandidateTool = require("../models/CandidateTool");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

module.exports = async function githubSearchCollector() {
  console.log("Collecting GitHub repositories...");

  const result = await octokit.search.repos({
    q: "AI tool stars:>500",
    sort: "stars",
    order: "desc",
    per_page: 30,
  });

  for (const repo of result.data.items) {
    await CandidateTool.updateOne(
      { githubUrl: repo.html_url },
      {
        name: repo.name,
        category: "GitHub Project",
        description: repo.description || "",

        // Official website (preferred)
        officialUrl: repo.homepage || repo.html_url,

        // GitHub metadata
        githubUrl: repo.html_url,
        githubStars: repo.stargazers_count,
        githubForks: repo.forks_count,

        logoDomain: "github.com",

        tags: repo.topics || [],

        platform: repo.language || "",
        platforms: repo.language ? [repo.language] : [],

        isTrending: true,

        source: "github-search",

        sources: [
          {
            type: "github-search",
            url: repo.html_url,
            externalId: String(repo.id),
            metadata: {
              stars: repo.stargazers_count,
              forks: repo.forks_count,
            },
          },
        ],

        lastDiscoveredAt: new Date(),
      },
      { upsert: true },
    );
  }

  console.log(`Saved ${result.data.items.length} GitHub tools.`);
};
