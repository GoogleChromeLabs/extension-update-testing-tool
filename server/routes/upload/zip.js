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

const { mkdir, writeFile } = require("fs/promises");

const AdmZip = require("adm-zip");

const utils = require("../../utils");

module.exports = utils.makeUploadHandler(async (req) => {
  // Download the file
  await writeFile("tmp/extension.zip", new Uint8Array(req.body));

  // Extract the extension
  const zip = new AdmZip("tmp/extension.zip");

  await mkdir("tmp/unpacked", { recursive: true });

  await new Promise((resolve, reject) =>
    zip.extractAllToAsync("tmp/unpacked", true, false, (err) => {
      if (err) reject(err);
      resolve(undefined);
    })
  );
});
