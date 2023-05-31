# Extension Update Testing Tool

The Extension Update Testing Tool is a local extension update server that can be used for testing updates to Chrome Extensions during local development, including permission grants.

![Screenshot of Extension Update Testing Tool](/docs/screenshot.png)

## Use Cases

This tool serves a number of use cases:

- Testing what permission warnings are generated for specific changes in the manifest.json file.
- Seeing the update flow, including how an extension is disabled until a user grants additional permissions.
- Testing migration logic between versions (this is possible by simply reloading an extension, but using the update logic is closer to what happens when updating from the Chrome Web Store).

It is particularly useful for (but not limited to) migrations to Manifest V3, since this often involves changes to the permissions an extension requests.

## Getting Started

1. Install Node.js and NPM: https://nodejs.org/
1. Clone this repository.
1. Run `npm install` in the root of the repository.

## How to use

1. Run `npm start`.
1. Open the local server at http://localhost:8080.
1. Drag an unpacked extension (folder or .zip file) to the page.
1. Follow the instructions to install the extension.
1. Drag an updated extension to the page, making sure to update the version field in the manifest.json file.
1. Click "Update" at chrome://extensions to see the extension update.

## Advanced Configuration

You can configure the port of the local server using the `PORT` environment variable, e.g:

```
PORT=4000 npm start
```

## FAQ

### Why do I see "Package is invalid: 'CRX_REQUIRED_PROOF_MISSING'."?

This happens if you try to use the policy install methods but haven't set the required policy keys. If you've already set these, you may need to click "Reload policies" at chrome://policy.

## Acknowledgements

This project was inspired by many great community projects, including https://github.com/thom4parisot/crx.

## Contributing

Contributions are welcome. See [How to Contribute](docs/contributing.md) for more information on how to get involved.
