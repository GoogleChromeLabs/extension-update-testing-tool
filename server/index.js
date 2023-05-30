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

const state = require("./state");
const utils = require("./utils");

const bodyParser = require("body-parser");
const express = require("express");

const app = express();

// Serve public directory on root (HTML, JS files etc.)
app.use("/", express.static("public"));

// Handle zip based uploads automatically
app.use(
  bodyParser.raw({ type: "application/zip", limit: Number.POSITIVE_INFINITY })
);

app.get("/status", require("./routes/status"));

app.post(
  "/upload/directory",
  require("./utils").setupTmpDirectory,
  require("./routes/upload/directory")
);

app.post(
  "/upload/zip",
  require("./utils").setupTmpDirectory,
  require("./routes/upload/zip")
);

app.get(
  "/extension.crx",
  utils.requireExtensionMiddleware,
  require("./routes/extension")
);

app.get(
  "/updates.xml",
  utils.requireExtensionMiddleware,
  require("./routes/updates")
);

app.get(
  "/policy.mobileconfig",
  utils.requireExtensionMiddleware,
  require("./routes/policy")
);

app.listen(state.PORT);
console.log(`Listening at http://localhost:${state.PORT}...`);
