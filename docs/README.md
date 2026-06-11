# Docs Index

This folder is organized by purpose to keep operational scripts and source content easy to find without changing runtime behavior.

## Core Reference
- `system-architecture.md`
- `database-schema.md`
- `user-flow-map.md`
- `exam-import-implementation-guide.md`
- `exam-import-troubleshooting-log.md`
- `BRAND-GUIDELINES-DASHBOARD-UI-MAPPING.md`

## Structured Subfolders
- `architecture/` - technical architecture and implementation notes
- `audits/` - audits, checklists, and assessment reports
- `changes/` - historical change logs and evidence
- `handover/` - handover and transition documentation
- `v2-guide/` - V2 product and workflow guides
- `superpowers/` - capability and operating notes

## Script-Coupled Content (Do Not Relocate Without Path Updates)
- `data/` - import package templates consumed by scripts
- `imports/` - source/import files consumed by scripts and functions scripts

## Naming and Hygiene Conventions
- Keep machine-generated evidence in `changes/`.
- Keep long-lived reference docs in root of `docs/` or in a clearly named subfolder.
- Prefer descriptive, date-aware filenames for audits and handovers.
- Avoid moving `docs/data` and `docs/imports` unless all script paths are updated and validated.
