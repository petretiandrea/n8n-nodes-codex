# n8n Codex Test Environment

This Docker Compose environment starts a local n8n instance and mounts the local custom node project directly into n8n's custom node folder, following the development pattern described here:

- [Developing Custom Nodes for n8n with Docker](https://dev.to/hubschrauber/developing-custom-nodes-for-n8n-with-docker-3poj)

The local folder [`.n8n`](E:\Projects\n8n-codex\n8n-nodes-codex\.n8n) is mounted into the container to persist workflows, credentials, and instance state between restarts.
The local package [n8n-nodes-codex](E:\Projects\n8n-codex\n8n-nodes-codex) is mounted into:

`/home/node/.n8n/custom/node_modules/n8n-nodes-codex`

inside the container.

## Prerequisites

- Docker Desktop running
- The package already built at:
  - `E:\Projects\n8n-codex\n8n-nodes-codex\dist`

## Start

Before starting, build the custom node once on the host:

```powershell
cd "E:\Projects\n8n-codex\n8n-nodes-codex"
npm run build
```

Then start n8n from the package root:

```powershell
cd "E:\Projects\n8n-codex\n8n-nodes-codex"
docker compose up
```

Then open:

```text
http://localhost:5678
```

## Stop

```powershell
docker compose down
```

To also remove the persisted n8n data volume:

```powershell
Remove-Item -Recurse -Force ".\.n8n\*"
```

## What to expect in n8n

After startup, n8n should expose:

- credential: `Codex Device Auth API`
- AI root node: `Codex Chat Model`

## Authentication flow

The credential uses bootstrap values generated outside n8n.

Run this on the host machine:

```powershell
node "E:\Projects\n8n-codex\n8n-nodes-codex\scripts\device-code-bootstrap.mjs"
```

Complete the browser login, then paste the returned values into the `Codex Device Auth API` credential in n8n.

## Quick UI test

1. Create a credential `Codex Device Auth API`
2. Add `Manual Trigger`
3. Add `AI Agent`
4. Add `Codex Chat Model`
5. Connect `Codex Chat Model` to `AI Agent`
6. Use a simple prompt like `Scrivi una risposta di test in una sola frase`

## Development cycle

When you change the custom node code:

```powershell
cd "E:\Projects\n8n-codex\n8n-nodes-codex"
npm run build
docker compose restart n8n
```
