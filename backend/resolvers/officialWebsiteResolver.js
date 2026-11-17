const Tool = require("../models/Tool");
const { syncToolToSearch } = require("../services/toolSearchSync");

async function officialWebsiteResolver(tool) {
  if (tool.officialUrl && tool.officialUrl.trim() !== "") {
    await Tool.updateOne(
      { _id: tool._id },
      {
        officialUrl: tool.officialUrl,
        resolved: true,
        lastChecked: new Date(),
      }
    );

    try {
      await syncToolToSearch(tool._id);
    } catch (error) {
      console.error(`Meilisearch sync failed for Tool "${tool.name}":`, error.message);
    }

    console.log(`Resolved: ${tool.name}`);
    return;
  }

  // Unresolvable: mark resolved to prevent infinite retries
  await Tool.updateOne(
    { _id: tool._id },
    {
      resolved: true,
      lastChecked: new Date(),
    }
  );

  try {
    await syncToolToSearch(tool._id);
  } catch (error) {
    console.error(`Meilisearch sync failed for Tool "${tool.name}":`, error.message);
  }

  console.log(`Marked unresolvable: ${tool.name}`);
}

module.exports = officialWebsiteResolver;