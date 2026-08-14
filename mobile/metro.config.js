const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const shared = path.resolve(workspaceRoot, "shared");
const escape = (value) => value.replace(/[/\\]/g, "[/\\\\]");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [shared];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  "@shared": shared,
  "@supabase/supabase-js": path.resolve(
    projectRoot,
    "node_modules/@supabase/supabase-js",
  ),
};

const extraBlock = [
  new RegExp(`${escape(workspaceRoot)}/node_modules/.*`),
  new RegExp(`${escape(workspaceRoot)}/\\.next/.*`),
  new RegExp(`${escape(workspaceRoot)}/src/.*`),
];
const currentBlock = config.resolver.blockList;
config.resolver.blockList = [
  ...(currentBlock instanceof RegExp
    ? [currentBlock]
    : Array.isArray(currentBlock)
      ? currentBlock
      : []),
  ...extraBlock,
];

module.exports = withNativeWind(config, { input: "./global.css" });
