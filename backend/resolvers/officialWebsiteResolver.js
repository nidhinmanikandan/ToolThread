const Tool = require("../models/Tool");

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

  console.log(`Marked unresolvable: ${tool.name}`);
}

module.exports = officialWebsiteResolver;