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

let _lastExtensionId;
let _lastExtensionName;
let _lastExtensionVersion;

module.exports.PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

/**
 * Saves information about the last uploaded extension in memory. This is used
 * when building policy files, update XML files etc.
 *
 * @param {*} id ID of the extension.
 * @param {*} version Value of the version field in the extension manifest.
 */
module.exports.setExtension = function (id, name, version) {
  _lastExtensionId = id;
  _lastExtensionName = name;
  _lastExtensionVersion = version;
};

/**
 * Gets information about the last uploaded extension in memory.
 */
module.exports.getExtension = function () {
  if (!_lastExtensionId || !_lastExtensionName || !_lastExtensionVersion)
    return undefined;

  return {
    id: _lastExtensionId,
    name: _lastExtensionName,
    version: _lastExtensionVersion
  };
};
