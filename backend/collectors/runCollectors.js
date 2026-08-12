const githubSearchCollector = require("./githubSearchCollector");
const hackerNewsCollector = require("./hackerNewsCollector");

async function runCollectors() {
  console.log("Running collectors...");

  await githubSearchCollector();
  await hackerNewsCollector();

  console.log("Collectors finished.");
}

module.exports = runCollectors;
