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

const { mkdir } = require("fs/promises");
const path = require("path");

const utils = require("../../utils");

const multer = require("multer");

const upload = multer({
  storage: multer.diskStorage({
    destination: "tmp/unpacked",
    filename: async (_, file, cb) => {
      const filePath = path.resolve(
        "tmp/unpacked",
        file.originalname.replace(/^\//, "")
      );
      await mkdir(path.dirname(filePath), { recursive: true });
      cb(null, file.originalname);
    }
  }),
  preservePath: true
});

module.exports = utils.makeUploadHandler((req, res) => {
  return new Promise((resolve, reject) => {
    upload.array("files")(req, res, (err) => {
      if (err) {
        reject(new Error("Unable to upload files"));
      }

      resolve();
    });
  });
});
