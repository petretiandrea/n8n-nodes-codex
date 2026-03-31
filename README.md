# n8n Codex Community Node

Community node package for using OpenAI Codex in n8n through the ChatGPT subscription device-code flow.

## MVP scope

- Self-hosted n8n only
- Device-code bootstrap helper
- `Codex Chat Model` AI root node
- Text generation with optional streaming
- Runtime access-token refresh using the stored refresh token bundle

## Important caveat

This package talks to the internal Codex backend currently exposed at `https://chatgpt.com/backend-api/codex/responses`. It is not the public OpenAI API and may change without notice.

## Authentication

The current n8n credential UI does not provide a first-class interactive device-code login flow for community nodes, so this package ships a helper CLI:

```bash
npx --package @petretiandrea/n8n-nodes-codex codex-device-login
```

Run it, complete authorization in the browser, then paste the returned values into the `Codex Device Auth API` credential.

## Publishing

This package supports both the official `n8n-node release` flow and GitHub Actions publishing.

### First local release

For the first publish, the simplest path is:

```bash
npm login
npm run release
```

`n8n-node release` uses `release-it` to run lint and build checks, update the changelog, create git tags, create a GitHub release, and publish the package to npm.

Before running it, make sure the repository has a valid GitHub remote configured and that you have publish access to the `@petretiandrea/n8n-nodes-codex` package on npm.

### GitHub Actions publish

1. Push the repository to GitHub.
2. In GitHub repository settings, add the `NPM_TOKEN` secret with an npm automation token that has publish access for `@petretiandrea/n8n-nodes-codex`.
3. Create a GitHub release or push a version tag like `v0.1.0`.
4. The workflow at `.github/workflows/publish.yml` will run tests, build the package, and publish it to npm.

After publishing, users can install the package in self-hosted n8n and run:

```bash
npx --package @petretiandrea/n8n-nodes-codex codex-device-login
```

to bootstrap the credential values.

## Known limitations

- No tool calling yet
- No multimodal support yet
- No n8n Cloud target yet
- Refresh tokens are reused at runtime, but if the backend rotates them you may need to run the bootstrap helper again
