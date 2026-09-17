import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const errors = [];

function fail(message) {
  errors.push(message);
}

function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return "";
  }
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    fail(`${relativePath}: JSON 无效：${error.message}`);
    return {};
  }
}

function walk(value, visit, currentPath = []) {
  visit(value, currentPath);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, [...currentPath, String(index)]));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => walk(child, visit, [...currentPath, key]));
  }
}

function collectDtcgTokens(value, currentPath = [], result = new Set()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  if (Object.prototype.hasOwnProperty.call(value, "$value")) {
    result.add(currentPath.join("."));
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    if (!key.startsWith("$")) collectDtcgTokens(child, [...currentPath, key], result);
  }
  return result;
}

const requiredFiles = [
  "README.md",
  "AGENTS.md",
  "manifest.json",
  "DESIGN.md",
  "tokens.json",
  "tokens.dtcg.json",
  "tokens.css",
  "styles.json",
  "layout-contracts.json",
  "AI-PROMPT.md",
  "QUALITY-GATES.md",
  "references/source.md",
  "build-artifacts.mjs"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`缺少文件：${file}`);
}

const manifest = readJson("manifest.json");
const sourceText = readText("tokens.json");
const source = (() => {
  try {
    return JSON.parse(sourceText);
  } catch (error) {
    fail(`tokens.json: JSON 无效：${error.message}`);
    return {};
  }
})();
const dtcg = readJson("tokens.dtcg.json");
const styles = readJson("styles.json");
const layouts = readJson("layout-contracts.json");
const css = readText("tokens.css");
const sourceHash = crypto.createHash("sha256").update(sourceText).digest("hex");

if (dtcg.$extensions?.["com.evamate.meta"]?.sourceSha256 !== sourceHash) fail("tokens.dtcg.json 与 tokens.json 不同步，请运行 node build-artifacts.mjs");
if (!css.includes(`sha256:${sourceHash}`)) fail("tokens.css 与 tokens.json 不同步，请运行 node build-artifacts.mjs");

const expectedCounts = new Map([
  ["EvaMate / Color / Primitive", 44],
  ["EvaMate / Color / Semantic", 56],
  ["EvaMate / Dimension", 56],
  ["EvaMate / Typography", 21],
  ["EvaMate / Behavior", 10]
]);

const allTokens = [];
for (const [collectionName, expected] of expectedCounts) {
  const collection = source.collections?.[collectionName];
  if (!collection) {
    fail(`tokens.json 缺少 Collection：${collectionName}`);
    continue;
  }
  const entries = Object.entries(collection.tokens ?? {});
  if (entries.length !== expected) fail(`${collectionName} 应有 ${expected} 个变量，实际 ${entries.length}`);
  entries.forEach(([name, token]) => allTokens.push({collectionName, name, token}));
}

if (allTokens.length !== 187) fail(`变量总数应为 187，实际 ${allTokens.length}`);

const primitive = source.collections?.["EvaMate / Color / Primitive"]?.tokens ?? {};
const semantic = source.collections?.["EvaMate / Color / Semantic"]?.tokens ?? {};
for (const [name, token] of Object.entries(semantic)) {
  for (const mode of ["Light", "Dark"]) {
    const value = token[mode];
    const match = typeof value === "string" ? value.match(/^\{(.+)\}$/) : null;
    if (!match || !primitive[match[1]]) fail(`${name}.${mode}: 无法解析 Primitive 别名 ${String(value)}`);
  }
}

const cssNames = new Set();
for (const {collectionName, name, token} of allTokens) {
  if (!token.css || !token.css.startsWith("--evamate-")) fail(`${collectionName}/${name}: 缺少 CSS 变量名`);
  if (cssNames.has(token.css)) fail(`CSS 变量名重复：${token.css}`);
  cssNames.add(token.css);
  if (!css.includes(`${token.css}:`)) fail(`tokens.css 缺少定义：${token.css}`);
}

for (const token of Object.values(semantic)) {
  const occurrences = css.split(`${token.css}:`).length - 1;
  if (occurrences !== 2) fail(`${token.css} 应分别定义 Light/Dark 两次，实际 ${occurrences}`);
}

if (!css.includes(':root[data-theme="dark"], [data-theme="dark"]')) fail("tokens.css 缺少显式 Dark 主题选择器");
if (!css.includes("@media (prefers-reduced-motion: reduce)")) fail("tokens.css 缺少 reduced-motion 覆盖");
if (!css.includes("--evamate-motion-duration-standard: 180ms")) fail("标准动效时长应为 180ms");

const dtcgTokenPaths = collectDtcgTokens(dtcg);
if (dtcgTokenPaths.size !== 187) fail(`DTCG 令牌应为 187，实际 ${dtcgTokenPaths.size}`);
walk(dtcg, (value, currentPath) => {
  if (typeof value !== "string") return;
  for (const match of value.matchAll(/\{([^}]+)\}/g)) {
    if (!dtcgTokenPaths.has(match[1])) fail(`tokens.dtcg.json:${currentPath.join(".")}: 无法解析别名 {${match[1]}}`);
  }
});

if (styles.textStyles?.length !== 12) fail(`Text Styles 应为 12，实际 ${styles.textStyles?.length ?? 0}`);
if (styles.effectStyles?.length !== 11) fail(`Effect Styles 应为 11，实际 ${styles.effectStyles?.length ?? 0}`);
if (styles.gridStyles?.length !== 2) fail(`Grid Styles 应为 2，实际 ${styles.gridStyles?.length ?? 0}`);

const reference = layouts.referenceViewport ?? {};
const standard = layouts.contracts?.["standard-workspace"]?.regions ?? {};
const editor = layouts.contracts?.["editor-workspace"]?.regions ?? {};
if (reference.width !== 1200 || reference.height !== 800) fail("基准视口应为 1200 × 800");
if ((standard.sidebar?.width ?? 0) + (standard.workspace?.width ?? 0) !== 1200) fail("standard-workspace 的 260/940 分栏错误");
if ((editor.dialogPane?.width ?? 0) + (editor.editorPane?.width ?? 0) !== 1200) fail("editor-workspace 的 390/810 分栏错误");
if ((editor.thumbnailRail?.width ?? 0) + (editor.editorCanvasRegion?.width ?? 0) !== 810) fail("编辑区 230/580 分栏错误");
if (standard.content?.width !== 776 || standard.composer?.width !== 768 || standard.composer?.height !== 118) fail("主内容或 Composer 关键尺寸错误");

if (manifest.name !== "EvaMate Design System" || manifest.version !== "0.3.0") fail("manifest 名称或版本错误");
if (manifest.scope?.components !== false) fail("manifest 必须明确 components=false");
if (fs.existsSync(path.join(root, "components.json"))) fail("本版本不应包含 components.json");

if (errors.length) {
  console.error("EvaMate Design System 0.3.0 AI 规范包验证失败：");
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`验证通过：5 个 Collections、${allTokens.length} 个 Variables、${dtcgTokenPaths.size} 个 DTCG Tokens、12 个 Text Styles、11 个 Effect Styles、2 个 Grid Styles、2 个页面布局合同，且未包含组件。`);
