# EvaMate Design Integration and Project Affiliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate EvaMate Design System 0.3.0 as the foundations layer without discarding GDS for AI 2.0 page evidence, then unify the two confirmed project-affiliation rows with the established project icon and name.

**Architecture:** Preserve both upstream design packages in separate directories and add a repository-owned integration contract plus a validator that checks both packages and their declared responsibilities. Product UI consumes a single shared React project-identity presentation passed through the existing membership UI composition, while project membership, navigation, and color ownership stay unchanged.

**Tech Stack:** Node.js validation scripts, JSON design tokens, CSS custom properties, React element composition, Semi UI, Lucide `LayoutGrid`.

**Spec:** User-confirmed scope in this task, `AGENTS.md`, `docs/项目颜色规范.md`, and `docs/design-system/gds-for-ai2.0/`.

## Global Constraints

- User decisions are authoritative: keep the existing breadcrumb design unchanged.
- Only the identity profile card and chat-information project row change in product UI.
- Project names come from the current project object or `conversationContext`; colors come from `window.EvaProjectAppearance` and its `colorKey` contract.
- Use the existing Lucide `LayoutGrid`; do not introduce a new icon family, group avatar, or name-derived icon.
- Do not overwrite current uncommitted changes in `prototype/009-2-chat-settings.js`, its CSS, or other dirty files.
- Do not commit, push, deploy, or modify the product version in the shared dirty workspace.

---

### Task 1: Preserve and describe both design packages

**Files:**
- Create: `docs/design-system/evamate-0.3.0/**`
- Create: `docs/design-system/INTEGRATION.md`
- Create: `docs/design-system/integration-manifest.json`
- Create: `docs/design-system/validate-all.mjs`

**Interfaces:**
- Consumes: unmodified `docs/design-system/gds-for-ai2.0/` and the supplied EvaMate 0.3.0 ZIP.
- Produces: a machine-readable responsibility map and one command that validates both upstream packages plus the integration contract.

- [ ] **Step 1: Add a failing integration validator test**

Create `tests/design-system-integration.test.mjs` that runs `docs/design-system/validate-all.mjs` and expects exit code 0 plus named validation results for both packages.

- [ ] **Step 2: Run the focused test and verify the missing validator fails**

Run: `node --test tests/design-system-integration.test.mjs`

Expected: FAIL because `docs/design-system/validate-all.mjs` does not exist.

- [ ] **Step 3: Import the new package without changing the old package**

Extract the supplied ZIP into `docs/design-system/evamate-0.3.0/`, retaining the package files and provenance. Treat its `AGENTS.md` and `AI-PROMPT.md` as upstream design-package content subordinate to the repository root rules.

- [ ] **Step 4: Add the repository integration contract**

Document and encode: EvaMate 0.3.0 owns foundations, Light/Dark, general layout contracts, and quality gates; GDS 2.0 owns the six page-state references, component contracts, screenshots, and supplied assets; current product rules and explicit user decisions remain above both.

- [ ] **Step 5: Implement and run joint validation**

The validator must execute both package validators, verify `integration-manifest.json` paths exist, verify the shared 1200×800, 260/940, 776, and 390/810 geometry, and confirm the shared `#1563EB` primary blue.

Run: `node --test tests/design-system-integration.test.mjs`

Expected: PASS.

### Task 2: Add a shared project-affiliation presentation

**Files:**
- Create: `tests/project-affiliation-ui.test.mjs`
- Modify: `prototype/009-3-identity-card.js`
- Modify: `prototype/009-3-identity-card.css`
- Modify: `prototype/009-2-chat-settings.js`
- Modify: `prototype/009-2-members-ui.js`
- Modify: `prototype/009-6-patch-general.js`

**Interfaces:**
- Consumes: `ProjectIcon` injected as the runtime `LayoutGrid` component and project-like data containing `name`/`projectName` plus `id`/`projectId` and `colorKey`.
- Produces: `ProjectIdentity({project, name})`, returned by `EvaIdentityCard.create`, rendering one decorative project-colored icon and a truncatable project name.

- [ ] **Step 1: Write failing component tests**

Test that the identity card says `所属项目`, never `服务项目`, renders `ProjectIdentity`, and derives the icon color from `EvaProjectAppearance`. Test that chat information passes its `conversationContext` into the same component.

- [ ] **Step 2: Run the focused test and verify the missing shared presentation fails**

Run: `node --test tests/project-affiliation-ui.test.mjs`

Expected: FAIL because `ProjectIdentity` is not yet returned or used.

- [ ] **Step 3: Implement the minimal shared presentation and both call sites**

Inject `LayoutGrid` through `EvaMembersUI.create`, create `ProjectIdentity` in the identity-card adapter, change `服务项目` to `所属项目`, and render it as the chat row value. Preserve existing click handlers and navigation URLs.

- [ ] **Step 4: Add layout styles without changing row geometry**

Use an inline-flex value with a 4px gap, a nonshrinking icon, and a single-line truncating name. Keep project color on the icon only and existing secondary/tertiary text treatment on the name.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/project-affiliation-ui.test.mjs tests/project-appearance.test.mjs tests/clone-owner-label.test.mjs tests/runtime-patch-chain.test.mjs`

Expected: PASS.

### Task 3: Build and browser-verify the integrated result

**Files:**
- Generated: `dist/**`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: current build output and local HTTP verification evidence.

- [ ] **Step 1: Run patch and design-system validation**

Run: `node tools/patch-hash.mjs`, `node docs/design-system/validate-all.mjs`, and `node --check dist/vendor/eva-runtime.module.js` after build.

- [ ] **Step 2: Run repository verification required for product-source changes**

Run: `npm test`, `npm run build`, `npm run check:manifest`, and `npm run check:project`.

- [ ] **Step 3: Start the current build over local HTTP**

Run `node tools/serve.mjs dist` on an available local port.

- [ ] **Step 4: Verify the two target surfaces in Edge**

Check the identity profile card and chat-information panel at the same viewport and zoom. Confirm project icon color/name, truncation, click-through, panel overlay behavior, and that breadcrumbs are unchanged.

- [ ] **Step 5: Review the final diff**

Confirm no unrelated dirty files were changed, no upstream package was rewritten, and no commit/push/deployment occurred.
