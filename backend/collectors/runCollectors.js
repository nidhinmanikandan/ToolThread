const githubSearchCollector = require("./githubSearchCollector");
const hackerNewsCollector = require("./hackerNewsCollector");
const npmCollector = require("./npmCollector");

async function runCollectors() {
  console.log("Running collectors...");

  await githubSearchCollector();
  await hackerNewsCollector();
  await npmCollector();

  console.log("Collectors finished.");
}

module.exports = runCollectors;
