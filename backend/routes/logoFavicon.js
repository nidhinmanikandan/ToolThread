const axios = require("axios");
const express = require("express");

const router = express.Router();
const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

router.get("/", async (req, res) => {
  const domain = String(req.query.domain || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");

  if (!DOMAIN_PATTERN.test(domain)) {
    return res.status(400).json({ error: "A valid domain is required" });
  }

  try {
    const response = await axios.get("https://www.google.com/s2/favicons", {
      params: { sz: 128, domain },
      responseType: "arraybuffer",
      timeout: 5000,
      maxContentLength: 1024 * 1024,
    });

    res
      .set("Content-Type", response.headers["content-type"] || "image/png")
      .set("Cache-Control", "public, max-age=86400")
      .send(Buffer.from(response.data));
  } catch (error) {
    console.error("Favicon proxy failed:", error.message);
    res.status(502).json({ error: "Unable to fetch favicon" });
  }
});

module.exports = router;
