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

const STATUS_ELEMENT = document.getElementById("status");
const UPLOAD_ELEMENT = document.getElementById("upload");
const FILE_INPUT = UPLOAD_ELEMENT.querySelector("input");
const DOWNLOAD_BUTTON = document.getElementById("download");
const INSTRUCTIONS_SECTION = document.getElementById("instructions");
const WINDOWS_POLICY_ID = document.getElementById("windows-policy-id");
const WINDOWS_POLICY_HOST = document.getElementById("windows-policy-host");

let uploaded = false;

async function onDrop(event) {
  if (!event.dataTransfer?.items) return;

  event.preventDefault();

  const items = event.dataTransfer.items;

  if (items.length > 1) {
    STATUS_ELEMENT.innerText = "Error: Drop an extension folder or zip.";
    return;
  }

  const handle = await items[0].getAsFileSystemHandle();

  if (handle.kind === "file" && handle.name.endsWith(".zip")) {
    // Assume we've been given a valid zip file...
    const file = await handle.getFile();

    STATUS_ELEMENT.innerText = "Uploading...";

    fetch("/upload/zip", {
      method: "POST",
      body: await file.arrayBuffer(),
      headers: {
        "Content-Type": "application/zip"
      }
    }).then(onUploadFinished);

    return;
  }

  if (handle.kind === "directory") {
    // Assume we've been given an extension directory
    STATUS_ELEMENT.innerText = "Uploading...";

    fetch("/upload/directory", {
      method: "POST",
      body: await buildFormDataFromDirectory(handle)
    }).then(onUploadFinished);
    return;
  }

  STATUS_ELEMENT.innerText = "Error: Drop an extension folder or zip.";
}

async function buildFormDataFromDirectory(directory) {
  const formData = new FormData();
  await addFiles(formData, "", directory);
  return formData;
}

async function addFiles(formData, currentPath, directory) {
  for await (const entry of directory.values()) {
    switch (entry.kind) {
      case "file":
        const fileToAdd = await entry.getFile();
        formData.append(
          "files",
          new Blob([await fileToAdd.arrayBuffer()]),
          `${currentPath}/${fileToAdd.name}`
        );
        break;
      case "directory":
        const directoryToAdd = entry;
        await addFiles(
          formData,
          `${currentPath}/${directoryToAdd.name}`,
          directoryToAdd
        );
        break;
    }
  }
}

async function onUploadFinished(response) {
  const data = await response.json();

  if (data.success) {
    showDownloadInstructions(data.id, data.name, data.version);
  } else {
    STATUS_ELEMENT.innerText = data.message;
  }
}

function showDownloadInstructions(id, name, version) {
  STATUS_ELEMENT.innerText = `Serving "${name}" version ${version}...`;
  INSTRUCTIONS_SECTION.removeAttribute("data-disabled");

  WINDOWS_POLICY_ID.innerText = id;
  WINDOWS_POLICY_HOST.innerText = window.location.origin;
}

async function onDownload(event) {
  event.preventDefault();

  const handle = await showSaveFilePicker({
    suggestedName: "extension.crx",
    types: [
      {
        description: "Chrome Extension",
        accept: { "application/x-chrome-extension": [".crx"] }
      }
    ]
  });

  const response = await fetch("/extension.crx");
  const data = await response.blob();

  const writableStream = await handle.createWritable();
  await writableStream.write(data);
  await writableStream.close();
}

UPLOAD_ELEMENT.addEventListener("dragover", (e) => e.preventDefault());
UPLOAD_ELEMENT.addEventListener("drop", onDrop);

FILE_INPUT.addEventListener("change", async (e) => {
  if (
    FILE_INPUT.files.length === 1 &&
    FILE_INPUT.files[0].name.endsWith(".zip")
  ) {
    STATUS_ELEMENT.innerText = "Uploading...";

    fetch("/upload/zip", {
      method: "POST",
      body: await FILE_INPUT.files[0].arrayBuffer(),
      headers: {
        "Content-Type": "application/zip"
      }
    }).then(onUploadFinished);
  } else {
    STATUS_ELEMENT.innerText = "Please select a .zip file.";
  }
});

DOWNLOAD_BUTTON.addEventListener("click", onDownload);

fetch("/status")
  .then((response) => response.json())
  .then((response) => {
    // If the user has already uploaded an extension
    if (response.serving) {
      showDownloadInstructions(response.id, response.name, response.version);
    } else {
      STATUS_ELEMENT.innerText = "Upload an extension to get started.";
      INSTRUCTIONS_SECTION.setAttribute("data-disabled", true);
    }
  });
