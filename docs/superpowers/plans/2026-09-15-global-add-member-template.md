# Eva 全局拉人模板 A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将五类拉人入口迁移到唯一双栏模板 A，并删除旧拉人模板实现。

**Architecture:** `prototype/009-2-members-ui.js` 提供唯一公共 `MemberPicker`，接收候选、分组、身份渲染、可选名称字段和提交回调；项目与群聊入口直接复用，`009-5` 中的 AI 团队编辑器通过公开组件工厂复用它。候选资格、权限和事务仍由各业务层负责，模板只管理弹窗内临时状态。

**Tech Stack:** 原生浏览器模块、React、Semi UI、Lucide、Playwright、Node test runner、Eva 构建补丁链。

**Spec:** `docs/superpowers/specs/2026-09-15-global-add-member-template-design.md`

## Global Constraints

- “AI 分身”和“个人分身”统一称为“AI 分身”。
- 单选选人、选择自己的分身和数字员工加入项目不纳入模板 A。
- 群头像与 AI 团队头像保持默认，不恢复头像编辑。
- 联系人身份使用 `EvaAvatar.personUri`；AI 身份使用 `EvaAIIdentity.avatar` 与 `EvaAIIdentity.badge`。
- 拉人模板允许搜索；单选选人继续不显示搜索。
- 项目与群聊候选范围、权限校验和原子事务保持不变。
- 不提交、不推送、不发布。

---

### Task 1: 固化模板 A 的公共行为合同

**Files:**
- Modify: `tests/browser/ai-team-editor.mjs`
- Create: `tests/browser/member-picker-template.mjs`
- Modify: `prototype/009-2-members-ui.js`
- Modify: `prototype/009-2-picker-preview.js`
- Modify: `prototype/009-2-picker-preview.css`
- Modify: `prototype/009-2-members.css`

**Interfaces:**
- Consumes: `items`, `groups`, `initialSelectedIds`, optional `nameField`, optional `search`, `minimumSelection`, `onSubmit`.
- Produces: `MemberPicker` as the only two-column add-member modal and `renderMemberPickerIdentity(item, location)` for candidate/selected rows.

- [ ] **Step 1: Write the failing browser test**

Add a test that opens the project member picker and asserts the actual dialog has one search input, a left candidate pane, a right selected pane, 28px avatars, and no old selected-chip region. Select and remove one candidate and assert the right pane updates.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test tests/browser/member-picker-template.mjs`

Expected: FAIL because the project member dialog still renders the old one-column `SelectionBody` and chips.

- [ ] **Step 3: Implement the reusable template**

Replace the old `MemberPicker` body with the confirmed two-column structure. Move shared styles from the AI-team-only selectors to `.eva-member-picker__*`; keep modal width 680px, candidate/selected identity size 28px, scroll containment, empty states, error row, footer, and reset-on-context behavior.

- [ ] **Step 4: Make preview consume the real template**

Remove the preview-only duplicate composition. Keep the preview route as a thin fixture that passes data/configuration into the exported `MemberPicker`.

- [ ] **Step 5: Run focused tests**

Run: `npm run build && node --test tests/browser/member-picker-template.mjs tests/browser/ai-team-editor.mjs`

Expected: PASS with two-column behavior in both project and AI-team paths.

### Task 2: Migrate project and group add-member flows

**Files:**
- Modify: `prototype/009-2-members-ui.js`
- Modify: `prototype/009-2-chat-settings.js`
- Modify: `tests/project-members.test.mjs`
- Modify: `tests/browser/member-picker-template.mjs`

**Interfaces:**
- Consumes: the Task 1 `MemberPicker` API.
- Produces: project add, member-page group add, chat-settings group add, and create-group configurations using the same component.

- [ ] **Step 1: Add failing scenario tests**

Extend the browser test to open each available entry and assert the same `.eva-member-picker` root, correct title/action label, correct empty initial selection, and correct reset after cancel/reopen. Assert project and project-group candidate scopes with literal expected names.

- [ ] **Step 2: Verify red**

Run: `npm run build && node --test tests/browser/member-picker-template.mjs`

Expected: FAIL on at least the not-yet-migrated create-group or chat-settings entry.

- [ ] **Step 3: Configure all human/group flows**

Pass explicit group definitions and search labels from each entry. Preserve `store.candidates`, `humanItems`, `cloneItems`, `store.transaction`, `createGroup`, `addMember`, and `addClone` behavior. Do not route transfer dialogs through the multi-select template.

- [ ] **Step 4: Verify green and membership invariants**

Run: `npm run build && node --test tests/browser/member-picker-template.mjs tests/project-members.test.mjs`

Expected: PASS; failed batch creation still leaves no partial group or membership record.

### Task 3: Migrate AI team create/edit to the public template

**Files:**
- Modify: `prototype/009-5-patch-im.js`
- Modify: `prototype/046-ai-team.css`
- Modify: `tests/browser/ai-team-editor.mjs`

**Interfaces:**
- Consumes: `window.EvaMembersUI` public picker factory and AI-team candidate appearances.
- Produces: thin `EvaAITeamGroupEditor` adapter that supplies AI-only groups, initial member IDs, optional team-name field, and save callback.

- [ ] **Step 1: Tighten the failing identity test**

Require the AI-team dialog and project/group dialogs to share `.eva-member-picker`; require AI candidates and selected rows to expose the public AI badge and 28px avatar geometry. Keep the default-team-avatar assertions.

- [ ] **Step 2: Verify red**

Run: `npm run build && node --test tests/browser/ai-team-editor.mjs`

Expected: FAIL because `EvaAITeamGroupEditor` still owns its own picker DOM.

- [ ] **Step 3: Replace the AI-team picker DOM with an adapter**

Instantiate the public picker with cloud-avatar, assistant, and digital-employee groups. Preserve minimum one member, 50-character team name, create/save copy, initial member snapshot, modal container, errors, and close behavior.

- [ ] **Step 4: Remove AI-team-only picker CSS**

Delete selectors that only style the duplicated AI-team picker while retaining unrelated My AI rail and conversation styles.

- [ ] **Step 5: Verify green**

Run: `npm run build && node --test tests/browser/ai-team-editor.mjs tests/browser/member-picker-template.mjs`

Expected: PASS for search, select/remove/clear, create, reopen, edit, route roundtrip, default avatar, and shared root.

### Task 4: Remove the old template and align the product contract

**Files:**
- Modify: `prototype/009-2-picker-preview.js`
- Modify: `prototype/009-2-picker-preview.css`
- Modify: `prototype/009-2-members.css`
- Modify: `docs/项目与群聊成员体系.md`
- Modify: `tests/integration-regressions.test.mjs`
- Modify: `tests/browser/member-picker-template.mjs`

**Interfaces:**
- Consumes: all migrated callers from Tasks 1–3.
- Produces: one component, one DOM vocabulary, one state controller, and one CSS family for拉人.

- [ ] **Step 1: Add a failing runtime behavior assertion**

Assert every real拉人 entry renders one `.eva-member-picker`, never renders `.eva-picker-selected` chips, and can complete its relevant add/create action. Avoid tests that merely grep source symbols.

- [ ] **Step 2: Verify red**

Run: `npm run build && node --test tests/browser/member-picker-template.mjs`

Expected: FAIL while any old runtime entry remains.

- [ ] **Step 3: Delete unused implementation**

Remove the old `SelectionBody` composition, selected-chip UI, preview-only modal, and CSS with no remaining caller. Keep single-person transfer and own-clone selection components separate and visually unchanged.

- [ ] **Step 4: Update terminology and search boundary**

In the business document, distinguish multi-person “拉人” from single-person “选人”: template A supports search; transfer/successor selectors do not. Replace “个人分身” with “AI 分身” where it describes the same identity, without altering permissions.

- [ ] **Step 5: Run focused regression**

Run: `npm run build && node --test tests/browser/member-picker-template.mjs tests/browser/ai-team-editor.mjs tests/project-members.test.mjs tests/member-identity-avatar.test.mjs tests/ai-identity-avatar.test.mjs tests/integration-regressions.test.mjs`

Expected: all tests pass with no page errors.

### Task 5: Full verification and local acceptance

**Files:**
- Verify only; update tests only if a genuine uncovered requirement is found before production changes.

**Interfaces:**
- Consumes: final implementation.
- Produces: fresh build, contract checks, runtime syntax evidence, and local HTTP acceptance evidence.

- [ ] **Step 1: Run GDS and source checks**

Run: `node docs/design-system/gds-for-ai2.0/validate.mjs && npm run check:manifest && npm run check:project && npm run test:search`

Expected: all commands exit 0.

- [ ] **Step 2: Run product tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and the runtime builds.

- [ ] **Step 3: Verify patch chain and generated syntax**

Run: `node tools/patch-hash.mjs && node --check dist/vendor/eva-runtime.module.js`

Expected: the patch hash command reports a valid hash and syntax check exits 0.

- [ ] **Step 4: Run browser flows**

Run: `node --test tests/browser/member-picker-template.mjs tests/browser/ai-team-editor.mjs tests/browser/thread-preferences.mjs`

Expected: all browser tests pass at 1200×800 with no page errors.

- [ ] **Step 5: Inspect the local HTTP build**

Open `http://127.0.0.1:4173/` and verify project add, create group, group add, AI-team create, and AI-team edit. Check candidate/selected identity alignment, scrolling, search, disabled/enabled primary action, cancel/reopen reset, and title-bar visibility.

- [ ] **Step 6: Review final diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only scoped files plus pre-existing user changes appear. Do not commit or push.
