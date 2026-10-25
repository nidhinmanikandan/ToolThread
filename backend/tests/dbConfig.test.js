const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const connectDB = require("../config/db");

test("database connector rejects missing MONGO_URI before connecting", async () => {
  const previousUri = process.env.MONGO_URI;
  const originalConnect = mongoose.connect;
  let connectCalled = false;

  delete process.env.MONGO_URI;
  mongoose.connect = async () => {
    connectCalled = true;
  };

  try {
    await assert.rejects(connectDB(), /MONGO_URI is not configured/);
    assert.equal(connectCalled, false);
  } finally {
    mongoose.connect = originalConnect;
    if (previousUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousUri;
  }
});

test("database connector propagates MongoDB connection errors to its caller", async () => {
  const previousUri = process.env.MONGO_URI;
  const originalConnect = mongoose.connect;
  const connectionError = new Error("mock connection failure");
  let receivedUri;

  process.env.MONGO_URI = "mongodb://example.invalid/test";
  mongoose.connect = async (uri) => {
    receivedUri = uri;
    throw connectionError;
  };

  try {
    await assert.rejects(connectDB(), (error) => error === connectionError);
    assert.equal(receivedUri, process.env.MONGO_URI);
  } finally {
    mongoose.connect = originalConnect;
    if (previousUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousUri;
  }
});
