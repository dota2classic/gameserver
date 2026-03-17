# Automatic npm Client Generation Setup

Sets up automatic TypeScript API client generation and publishing to npm on every successful build.

---

## Prerequisites

- NestJS project with `@nestjs/swagger` decorators
- npm account with publish access under the target scope (e.g. `@yourorg/`)
- GitHub repository with Actions enabled

---

## Step 1: Install the generator

```bash
yarn add @dota2classic/nest-openapi-client-generator
```

---

## Step 2: Create `scripts/generate-api-client.js`

```js
const { runClientGenerator } = require("@dota2classic/nest-openapi-client-generator");
const { AppModule } = require("../dist/src/app.module");
const fs = require("fs");
const path = require("path");

const packageName = process.env.NPM_PACKAGE_NAME || "@yourorg/your-api-generated";
const packageVersion = process.env.NPM_PACKAGE_VERSION || "0.0.1";
const outputDir = process.env.OUTPUT_DIR || "./generated-client";

function patchGeneratedFiles() {
  const pkgPath = path.join(outputDir, "package.json");
  const tsconfigPath = path.join(outputDir, "tsconfig.json");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.main = "./dist/Api.js";
  pkg.types = "./dist/Api.d.ts";
  pkg.files = ["dist"];
  pkg.publishConfig = { access: "public", provenance: true };
  pkg.repository = { type: "git", url: "https://github.com/yourorg/yourrepo" };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
  tsconfig.compilerOptions.outDir = "./dist";
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n");

  console.log("Patched generated files for npm publishing.");
}

process.on("exit", () => {
  try {
    if (fs.existsSync(path.join(outputDir, "package.json"))) {
      patchGeneratedFiles();
    }
  } catch (err) {
    console.error("Failed to patch generated files:", err);
  }
});

async function main() {
  await runClientGenerator(AppModule, {
    title: "Your API",
    description: "Your description",
    version: "1.0",
    tags: ["your-tag"],
    bearerAuth: true,
    packageName,
    packageVersion,
    outputDir,
  });
}

main().catch((err) => {
  console.error("Failed to generate API client:", err);
  process.exit(1);
});
```

Replace `AppModule` import path, `title`, `description`, `tags`, `repository.url`, and the default package name as needed.

---

## Step 3: Add script to `package.json`

```json
"scripts": {
  "apigen": "node scripts/generate-api-client.js"
}
```

---

## Step 4: Add `NPM_PACKAGE_NAME` to `.github/deploy.env`

```
NPM_PACKAGE_NAME=@yourorg/your-api-generated
```

---

## Step 5: Create `.github/workflows/generate-api-client.yml`

```yaml
name: Generate API Client

on:
  workflow_run:
    workflows: ["Build"]
    types: [completed]
    branches: ["master"]
  workflow_dispatch:

jobs:
  generate-client:
    name: Generate and Publish API Client
    runs-on: ubuntu-latest
    if: >-
      (github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/master') ||
      (github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.head_branch == 'master')
    permissions:
      contents: read
      id-token: write   # required for provenance/trusted publishing

    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Load deploy config
        run: cat .github/deploy.env >> $GITHUB_ENV

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: "yarn"
          registry-url: "https://registry.npmjs.org"

      - name: Update npm to latest
        run: npm install -g npm@latest

      - name: Install dependencies
        run: yarn install

      - name: Build
        run: yarn build

      - name: Generate API client
        run: yarn apigen
        env:
          NPM_PACKAGE_NAME: ${{ env.NPM_PACKAGE_NAME }}
          NPM_PACKAGE_VERSION: "0.0.${{ github.run_number }}"
          OUTPUT_DIR: ./generated-client

      - name: Build generated client
        working-directory: generated-client
        run: |
          npm install
          npm run build

      - name: Publish to npm
        working-directory: generated-client
        run: npm publish --access public --provenance
        env:
          NPM_CONFIG_PROVENANCE: true
```

---

## Step 6: Publish the first version manually

> **Important:** npm Trusted Publishing (used for `--provenance`) can only be enabled after the package already exists on npm. You must publish the first version manually.

```bash
yarn build
yarn apigen
cd generated-client
npm install
npm run build
npm publish --access public
```

After the package appears on npmjs.com, go to:
**npmjs.com → your package → Settings → Trusted Publishing** → link it to your GitHub repo and the `generate-api-client.yml` workflow.

Once configured, all subsequent publishes are handled automatically by CI with no token needed.

---

## Step 7: Add `NODE_AUTH_TOKEN` secret (fallback)

In GitHub repo → **Settings → Secrets → Actions**, add:

- `NODE_AUTH_TOKEN` = your npm access token with publish permissions

This is used as a fallback if Trusted Publishing is not yet configured.