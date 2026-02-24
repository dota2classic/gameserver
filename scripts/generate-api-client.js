/**
 * Generates TypeScript API client from the NestJS app.
 *
 * Usage: node scripts/generate-api-client.js
 * Requires: yarn build first
 */
const { runClientGenerator } = require("@dota2classic/nest-openapi-client-generator");
const { AppModule } = require("../dist/src/app.module");
const fs = require("fs");
const path = require("path");

const packageName = process.env.NPM_PACKAGE_NAME || "@dota2classic/gs-api-generated";
const packageVersion = process.env.NPM_PACKAGE_VERSION || "0.0.1";
const outputDir = process.env.OUTPUT_DIR || "./generated-client";

async function main() {
  console.log("Generating API client...");
  console.log(`  Package: ${packageName}@${packageVersion}`);
  console.log(`  Output: ${outputDir}`);

  await runClientGenerator(AppModule, {
    title: "GameServer API",
    description: "Matches, players, MMRs",
    version: "1.0",
    tags: ["game"],
    bearerAuth: true,
    packageName: packageName,
    packageVersion: packageVersion,
    outputDir: outputDir,
  });

  // Patch generated files to use dist/ output
  const pkgPath = path.join(outputDir, "package.json");
  const tsconfigPath = path.join(outputDir, "tsconfig.json");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.main = "./dist/Api.js";
  pkg.types = "./dist/Api.d.ts";
  pkg.files = ["dist"];
  pkg.publishConfig = {
    access: "public",
    provenance: true,
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
  tsconfig.compilerOptions.outDir = "./dist";
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n");

  console.log("API client generated successfully!");
}

main().catch((err) => {
  console.error("Failed to generate API client:", err);
  process.exit(1);
});
