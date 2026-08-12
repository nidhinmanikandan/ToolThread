const githubSearchCollector = require("./githubSearchCollector");



async function runCollectors() {
  console.log("Running collectors...");

  await githubSearchCollector();
  

  console.log("Collectors finished.");
}

module.exports = runCollectors;
