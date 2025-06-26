const fs = require('fs')
const path = require('path')

const generationTarget = process.argv[2]

const target = path.join(`src/generated-api/${generationTarget}/models/index.ts`);

fs.appendFileSync(target, 'export * from "../../mapped-models"')

