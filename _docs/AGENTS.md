# Internal Docs — AGENTS Guide

## Module Overview
- Purpose: Centralize internal VirtEngine documentation used by operators, engineers, and agents for architecture, security, operations, and runbooks.
- Use when: Adding or updating internal docs, referencing non-public guidance, or looking for system-level context.
- Key entry points: `_docs/INDEX.md`, `_docs/onboarding/README.md`, `_docs/operations/`, `_docs/runbooks/`, `_docs/security/`.

## Architecture
- `_docs/INDEX.md` is the table of contents for internal docs. Update it whenever a doc is added, moved, or archived.
- Subfolders group docs by function:
  - `adr/` → Architectural Decision Records
  - `architecture/` → Architecture studies and diagrams
  - `audit/` + `audits/` → Audit scope and audit reports
  - `onboarding/` → New engineer onboarding guide
  - `operations/` → Ops playbooks and operational references
  - `protocols/` → Protocol specs and data formats
  - `runbooks/` → Incident and operational runbooks
  - `security/` → Security policies and checklists
  - `training/` → Training materials
  - `validators/` → Validator onboarding and requirements

## Core Concepts
- **Internal-only docs:** Content here is not intended for public release.
- **Source of truth:** Internal docs must live in `_docs/` only. Do not create internal docs outside this folder.
- **Sync policy:** If public docs are derived from internal docs, keep the internal `_docs/` version authoritative and link to it from public-facing docs.

## Usage Examples

### Add a new internal doc
```bash
# 1) Create file in _docs/ (or a subfolder)
# 2) Update _docs/INDEX.md
# 3) Update _docs/AGENTS.md if you added a new category or rule
```

### Reference internal docs from module work
```text
See internal guidance in _docs/INDEX.md (category: operations/runbooks/security).
```

## Implementation Patterns
- **Naming convention (new docs):**
  - Use `kebab-case.md` for new files.
  - ADRs use `ADR-###-short-title.md` in `_docs/adr/`.
  - Keep descriptive nouns in filenames, avoid version suffixes unless required.
- **Legacy names:** Existing files with uppercase/underscores or spaces are legacy. Do not rename them unless you update all references and `INDEX.md`.
- **Required updates when editing internal docs:**
  - Update `_docs/INDEX.md` if the doc is new, moved, or archived.
  - Update `_docs/AGENTS.md` if new guidance or categories are introduced.

## Configuration
- No runtime configuration.

## Testing
- None required for docs-only changes.

## Troubleshooting
- **Doc not found**
  - Cause: Missing entry in `_docs/INDEX.md`.
  - Fix: Add the file to the correct category in `_docs/INDEX.md`.
- **Broken link in internal docs**
  - Cause: File moved or renamed without updating references.
  - Fix: Update references in `_docs/INDEX.md` and any cross-links.
