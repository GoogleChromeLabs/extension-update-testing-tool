# Extension Update Testing Tool

The Extension Update Testing Tool is a local extension update server that can be used for testing update flows during local development, including permission grants.

![Screenshot of Extension Update Testing Tool](/docs/screenshot.png)

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
