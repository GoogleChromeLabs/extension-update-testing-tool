// Copyright 2023 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const { readFile, writeFile, rm, mkdir } = require("fs/promises");

const crx = require("./crx");
const state = require("./state");

/**
 * Express middleware function that clears the tmp directory ready to handle
 * a new upload. This should be used before any request handling that involves
 * uploading a new extension version.
 */
module.exports.setupTmpDirectory = async function (req, res, next) {
  await rm("tmp", { recursive: true, force: true });
  await mkdir("tmp/unpacked", { recursive: true });
  next();
};

/**
 * Creates a request handler which processes the extension in tmp/unpacked and
 * generates a new crx file based on it. The unpack parameter can be used to
 * run steps beforehand, such as saving file data from the request to disk or
 * extracting a zip file.
 *
 * @param unpack Function to run to upload and unpack request data.
 * @returns An express request handler.
 */
module.exports.makeUploadHandler = function (unpack) {
  return async (req, res) => {
    // Handle any custom unpacking steps first (e.g zip extraction)
    if (unpack) {
      await unpack(req, res);
    }

    let manifestBuffer;

    try {
      // Read manifest.json from disk
      manifestBuffer = await readFile("tmp/unpacked/manifest.json");
    } catch (e) {
      return respondWithError(res, e, "Unable to open manifest.json");
    }

    let manifest;

    try {
      manifest = JSON.parse(manifestBuffer.toString("utf-8"));
    } catch (e) {
      return respondWithError(res, e, "Unable to parse manifest.json");
    }

    if (manifest.version === state.getExtension()?.version) {
      return respondWithError(
        res,
        undefined,
        "Please increase the version field in the manifest."
      );
    }

    manifest.update_url = `http://${req.hostname}:${state.PORT}/updates.xml`;

    try {
      await writeFile("tmp/unpacked/manifest.json", JSON.stringify(manifest));
    } catch (e) {
      return respondWithError(res, e, "Unable to write updated manifest.json");
    }

    if (!manifest.name || !manifest.version) {
      return respondWithError(
        res,
        undefined,
        "Manifest is missing name or version."
      );
    }

    let id, packed;

    try {
      const result = await crx.createCrx("tmp/unpacked");
      id = result.id;
      packed = result.packed;
    } catch (e) {
      return respondWithError(res, e, "Unable to generated signed crx.");
    }

    try {
      await writeFile("tmp/extension.crx", packed);
    } catch (e) {
      return respondWithError(res, e, "Unable to write crx to disk.");
    }

    state.setExtension(id, manifest.name, manifest.version);

    res.setHeader("Content-Type", "application/json");
    res.send(
      JSON.stringify({
        success: true,
        id,
        name: manifest.name,
        version: manifest.version
      })
    );
  };
};

function respondWithError(res, error, message) {
  if (error) {
    console.error("Error uploading new extension:", error);
  }

  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({ success: false, message }));
}

/**
 * Express middleware which causes a 404 error if a route is called but the
 * user has not yet uploaded an extension. This can be used in place of
 * explicitly checking that an extension has been uploaded in any route that
 * requires this to have been done.
 */
module.exports.requireExtensionMiddleware = async function (req, res, next) {
  if (!state.getExtension()) {
    res.status(404);
    res.send("No extension found.");
    return;
  }

  next();
};
