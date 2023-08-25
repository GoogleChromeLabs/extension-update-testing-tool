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

/**
 * Utility file that contains helpers for creating .crx files from an unpacked
 * extension directory. This uses only the built in Node crypto module.
 */

const AdmZip = require("adm-zip");
const Pbf = require("pbf");
const crypto = require("crypto");
const { promisify } = require("util");
const { writeFile, stat, readFile } = require("fs/promises");

const { CrxFileHeader, SignedData } = require("./generated/crx3");

const SHOULD_WRITE_KEY = process.env.WRITE_KEY === "1";
let keyPair;

/**
 * Creates a signed .crx file from the unpacked extension directory passed in
 * as unpackedFolder. If this function has been called previously, the existing
 * keyPair used in memory is used which ensures a stable extension ID across
 * versions. Otherwise, a new 2048-bit RSA key is generated.
 *
 * @param unpackedFolder Location of unpacked extension.
 */
module.exports.createCrx = async function (unpackedFolder) {
  if (!keyPair) {
    keyPair = await generateKey();
  }

  // Pack extension as .zip and get as buffer
  const zip = new AdmZip();
  await zip.addLocalFolderPromise(unpackedFolder);
  const zipBuffer = await zip.toBufferPromise();

  // Get signed header data using key and zip data
  const headerData = headerDataForExtension(keyPair, zipBuffer);

  return {
    id: getExtensionIdAsString(
      keyPair.publicKey.export({
        type: "spki",
        format: "der"
      })
    ),
    packed: Buffer.concat([
      // Magic bytes
      Buffer.from("Cr24", "utf8"),
      // Version identifier (v3)
      new Uint8Array([3, 0, 0, 0]),
      // Length of header data
      UInt32Le(4, headerData.length),
      // Header data
      headerData,
      // Archive contents
      zipBuffer
    ])
  };
};

/**
 * Gets a SignedData Protocol Buffer containing a given extension ID. This is
 * signed as part of the overall crx file header.
 *
 * @param id Extension ID.
 */
function signedDataForExtensionId(id) {
  const pbf = new Pbf();
  SignedData.write({ crx_id: id }, pbf);
  return pbf.finish();
}

/**
 * Gets a CrxFileHeader Protocol Buffer, including signed data for both the
 * header and contents. This is directly prepended to the contents of the
 * extension archive as part of building a crx file.
 *
 * @param publicKey Public key associated with privateKey.
 * @param privateKey Key to sign header with.
 * @param signedData Data to sign in header.
 * @param zipBuffer Contents to sign.
 */
function fileHeader(publicKey, privateKey, signedData, zipBuffer) {
  const pbf = new Pbf();

  CrxFileHeader.write(
    {
      sha256_with_rsa: [
        {
          public_key: publicKey,
          signature: Buffer.from(
            getSignature(privateKey, signedData, zipBuffer),
            "binary"
          )
        }
      ],
      signed_header_data: signedData
    },
    pbf
  );

  return pbf.finish();
}

/**
 * Creates a Buffer containg the header data to be prepended to the extension
 * archive as part of building a crx file. This is a wrapper around fileHeader
 * that takes more readily available data.
 *
 * @param keyPair Key to sign header with.
 * @param zipBuffer Contents to sign.
 */
function headerDataForExtension(keyPair, zipBuffer) {
  const publicKey = keyPair.publicKey.export({
    type: "spki",
    format: "der"
  });

  const extensionId = getExtensionId(publicKey);
  const signedData = signedDataForExtensionId(extensionId);

  const header = fileHeader(
    publicKey,
    keyPair.privateKey,
    signedData,
    zipBuffer
  );

  return header;
}

/**
 * Creates a new Buffer of size `size` and stores the value `value`, as an
 * unsigned 32-bit int in little-endian.
 *
 * @param size Size of buffer in bytes.
 * @param value Value to store in buffer.
 */
function UInt32Le(size, value) {
  const buffer = Buffer.alloc(size);
  buffer.writeUInt32LE(value, 0);
  return buffer;
}

/**
 * Gets an extension ID as a SHA-256 hash of the public key from the keypair
 * used to sign the extension. See `getExtensionIdAsString` to convert this to
 * a human-readable string.
 *
 * @param publicKey Public key associated with keypair used to sign extension.
 */
function getExtensionId(publicKey) {
  return crypto.createHash("sha256").update(publicKey).digest().subarray(0, 16);
}

// prettier-ignore
const BASE16_NORMAL_ALPHABET = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

// prettier-ignore
const BASE16_CRX_ALPHABET = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p"];

/**
 * Gets a human-readable string associated with the extension ID. This is a
 * base16 encoding of the data but using a a-p alphabet instead of the usual
 * 0-9a-f.
 *
 * @param publicKey  Public key associated with keypair used to sign extension.
 */
function getExtensionIdAsString(publicKey) {
  return getExtensionId(publicKey)
    .toString("hex")
    .split("")
    .map((c) => BASE16_CRX_ALPHABET[BASE16_NORMAL_ALPHABET.indexOf(c)])
    .join("");
}

/**
 * Gets a signature to include in a crx file header based on the signed header
 * data and contents of the archived extension.
 *
 * @param privateKey Private key used to sign extension.
 * @param headerData Header data to sign.
 * @param zipBuffer Contents to sign.
 * @returns
 */
function getSignature(privateKey, headerData, zipBuffer) {
  const hash = crypto.createSign("sha256");

  hash.update(Buffer.from("CRX3 SignedData\x00", "utf8"));
  hash.update(UInt32Le(4, headerData.length));
  hash.update(headerData);
  hash.update(zipBuffer);

  return hash.sign(privateKey);
}

/**
 * Generates a new 2048-bit RSA keypair which can be used to sign extensions.
 */
async function generateKey() {
  if (SHOULD_WRITE_KEY) {
    if (
      await stat("key.pem")
        .then((s) => s.isFile())
        .catch(() => false)
    ) {
      const privateKeyData = await readFile("key.pem");
      const privateKey = crypto.createPrivateKey(privateKeyData);

      return {
        publicKey: crypto.createPublicKey(privateKey),
        privateKey
      };
    }
  }

  const generateKeyPair = promisify(crypto.generateKeyPair);
  const { publicKey, privateKey } = await generateKeyPair("rsa", {
    modulusLength: 2048
  });

  if (SHOULD_WRITE_KEY) {
    await writeFile(
      "key.pem",
      privateKey.export({ type: "pkcs8", format: "pem" })
    );
  }

  return { publicKey, privateKey };
}
