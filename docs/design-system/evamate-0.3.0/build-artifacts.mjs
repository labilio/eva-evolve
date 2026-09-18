import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourceText = fs.readFileSync(path.join(root, "tokens.json"), "utf8");
const sourceHash = crypto.createHash("sha256").update(sourceText).digest("hex");
const source = JSON.parse(sourceText);
const collections = source.collections;

const primitive = collections["EvaMate / Color / Primitive"].tokens;
const semantic = collections["EvaMate / Color / Semantic"].tokens;
const dimension = collections["EvaMate / Dimension"].tokens;
const typography = collections["EvaMate / Typography"].tokens;
const behavior = collections["EvaMate / Behavior"].tokens;

function setNested(target, segments, value) {
  let cursor = target;
  for (const segment of segments.slice(0, -1)) cursor = cursor[segment] ??= {};
  cursor[segments.at(-1)] = value;
}

function colorToDtcg(value) {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const numbers = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    return {colorSpace: "srgb", components: numbers, alpha: 1, hex: value};
  }
  const match = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (!match) throw new Error(`无法转换颜色：${value}`);
  return {
    colorSpace: "srgb",
    components: [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255],
    alpha: Number(match[4])
  };
}

function dtcgValue(token, name) {
  if (token.type === "color") return colorToDtcg(token.value);
  if (token.type === "dimension") return {value: token.value, unit: "px"};
  if (name.startsWith("motion/duration/")) return {value: token.value, unit: "ms"};
  if (name === "motion/easing/standard") return [0.2, 0, 0, 1];
  return token.value;
}

function dtcgType(token, name) {
  if (name.startsWith("font/family/")) return "fontFamily";
  if (name.startsWith("font/weight/")) return "fontWeight";
  if (name.startsWith("motion/duration/")) return "duration";
  if (name === "motion/easing/standard") return "cubicBezier";
  return token.type;
}

const dtcg = {
  "$description": "EvaMate Design System 0.3.0。由 tokens.json 自动生成，请勿直接编辑。",
  "$extensions": {
    "com.evamate.meta": {
      "version": "0.3.0",
      "source": "Figma YfmZumn8azSodYXTmQXbC4",
      "defaultTheme": "Light",
      "themes": ["Light", "Dark"],
      "generatedBy": "build-artifacts.mjs",
      "sourceSha256": sourceHash
    }
  }
};

for (const [name, token] of Object.entries(primitive)) {
  setNested(dtcg, ["color", "primitive", ...name.split("/")], {
    "$type": "color",
    "$value": dtcgValue(token, name),
    "$extensions": {"com.evamate.figma": {"collection": "EvaMate / Color / Primitive", "cssVariable": token.css}}
  });
}

for (const [name, token] of Object.entries(semantic)) {
  const lightAlias = token.Light.slice(1, -1).split("/").join(".");
  const darkAlias = token.Dark.slice(1, -1).split("/").join(".");
  setNested(dtcg, ["color", "semantic", ...name.split("/").slice(1)], {
    "$type": "color",
    "$value": `{color.primitive.${lightAlias}}`,
    "$extensions": {
      "com.evamate.modes": {"Light": `{color.primitive.${lightAlias}}`, "Dark": `{color.primitive.${darkAlias}}`},
      "com.evamate.figma": {"collection": "EvaMate / Color / Semantic", "cssVariable": token.css}
    }
  });
}

for (const [collectionName, tokens] of [
  ["EvaMate / Dimension", dimension],
  ["EvaMate / Typography", typography],
  ["EvaMate / Behavior", behavior]
]) {
  for (const [name, token] of Object.entries(tokens)) {
    setNested(dtcg, name.split("/"), {
      "$type": dtcgType(token, name),
      "$value": dtcgValue(token, name),
      "$extensions": {"com.evamate.figma": {"collection": collectionName, "cssVariable": token.css}}
    });
  }
}

function cssValue(token, name) {
  if (name === "font/family/ui") return '"PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  if (name === "font/family/brand") return '"Praise", cursive';
  if (token.type === "dimension") return `${token.value}px`;
  if (name.startsWith("motion/duration/")) return `${token.value}ms`;
  return String(token.value);
}

function primitiveReference(alias) {
  const target = primitive[alias.slice(1, -1)];
  if (!target) throw new Error(`无法解析颜色别名：${alias}`);
  return `var(${target.css})`;
}

const css = [];
css.push(`/* EvaMate Design System 0.3.0 — generated from tokens.json — sha256:${sourceHash} */`);
css.push(":root {");
for (const token of Object.values(primitive)) css.push(`  ${token.css}: ${token.value};`);
for (const [name, token] of Object.entries(dimension)) css.push(`  ${token.css}: ${cssValue(token, name)};`);
for (const [name, token] of Object.entries(typography)) css.push(`  ${token.css}: ${cssValue(token, name)};`);
for (const [name, token] of Object.entries(behavior)) css.push(`  ${token.css}: ${cssValue(token, name)};`);
for (const token of Object.values(semantic)) css.push(`  ${token.css}: ${primitiveReference(token.Light)};`);
css.push("  --evamate-elevation-01: 0 1px 2px var(--evamate-primitive-alpha-black-04);");
css.push("  --evamate-elevation-02: 0 16px 48px -8px var(--evamate-primitive-alpha-black-06), 0 0 0 0.5px var(--evamate-primitive-alpha-black-15);");
css.push("  --evamate-elevation-03: 0 5px 16px -4px var(--evamate-primitive-alpha-black-06), 0 0 0 0.5px var(--evamate-primitive-alpha-black-15);");
css.push("  --evamate-elevation-04: 0 4px 80px 8px var(--evamate-primitive-alpha-black-04), 0 3px 6px var(--evamate-primitive-alpha-black-04);");
css.push("  --evamate-blur-small: 20px;");
css.push("  --evamate-blur-medium: 90px;");
css.push("  --evamate-blur-large: 100px;");
css.push("  color-scheme: light;");
css.push("}");
css.push("");
css.push(':root[data-theme="dark"], [data-theme="dark"] {');
for (const token of Object.values(semantic)) css.push(`  ${token.css}: ${primitiveReference(token.Dark)};`);
css.push("  --evamate-elevation-01: 0 1px 2px var(--evamate-primitive-alpha-black-40);");
css.push("  --evamate-elevation-02: 0 16px 48px -8px var(--evamate-primitive-alpha-black-40), 0 0 0 0.5px var(--evamate-primitive-alpha-white-06);");
css.push("  --evamate-elevation-03: 0 5px 16px -4px var(--evamate-primitive-alpha-black-40), 0 0 0 0.5px var(--evamate-primitive-alpha-white-06);");
css.push("  --evamate-elevation-04: 0 4px 80px 8px var(--evamate-primitive-alpha-black-40), 0 3px 6px var(--evamate-primitive-alpha-black-15);");
css.push("  color-scheme: dark;");
css.push("}");
css.push("");
css.push("@media (prefers-reduced-motion: reduce) {");
css.push("  :root {");
css.push("    --evamate-motion-duration-fast: 0ms;");
css.push("    --evamate-motion-duration-standard: 0ms;");
css.push("    --evamate-motion-duration-slow: 0ms;");
css.push("  }");
css.push("}");

fs.writeFileSync(path.join(root, "tokens.dtcg.json"), `${JSON.stringify(dtcg, null, 2)}\n`);
fs.writeFileSync(path.join(root, "tokens.css"), `${css.join("\n")}\n`);

console.log("已生成 tokens.dtcg.json 与 tokens.css");
