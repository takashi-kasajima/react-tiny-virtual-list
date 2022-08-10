const tsc = require("typescript");
const crypto = require("crypto");
const fs = require("fs");

const babelTransformer = require("./javascript");
const tsConfig = require("../../../tsconfig.json");

module.exports = {
  getCacheKey() {
    return crypto
      .createHash("md5")
      .update(fs.readFileSync(__filename))
      .digest("hex");
  },
  process(src, path, ...rest) {
    if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      const tsOutput = tsc.transpile(src, tsConfig.compilerOptions, path, []);

      const fakeJSPath = path.replace(/\.tsx?$/, ".js");
      return babelTransformer.process(tsOutput, fakeJSPath, ...rest);
    }
    return src;
  },
};
