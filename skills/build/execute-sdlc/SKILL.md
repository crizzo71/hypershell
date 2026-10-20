---
name: execute-sdlc
description: >
  Mechanically execute the SDLC workflow for a work item through spec, code review, and merge phases.
---

# Execute SDLC

Mechanically drive a work item through the entire SDLC: intake → triage → spec implementation → spec review → code implementation → code review → merge.

## Usage

```
/execute-sdlc LABEL_SCOPE [ISSUE_OVERRIDE] [--dry-run]
```

### Parameters

- **LABEL_SCOPE** (required): A scope label to narrow execution scope (e.g., `agent/scope/me`, `agent/scope/int`). Matched against GitHub and Jira labels.
- **ISSUE_OVERRIDE** (optional): A single work item (Jira key like `HYPERSHELL-426` or GitHub issue URL/number). If provided, the SDLC executes against this item instead of choosing from the scope.
- **--dry-run** (optional): Run without write actions.

### Workflow

The SDLC executes in these steps:

1. **Step 0: Ingest** - Resolve execution records and ensure Jira ↔ GitHub bidirectional sync
2. **Step 1: Triage** - Classify unclassified items (only if ISSUE_OVERRIDE is empty)
3. **Step 2: Choose** - Select a work item in scope (random if empty scope, or use ISSUE_OVERRIDE)
4. **Step 3: Funnel** - Drive the selected item through active phases:
   - `agent/workable` → spec-implementation
   - `agent/review-spec-rejected` → spec-implementation (retry)
   - `agent/reviewable-spec` → spec-review
   - `agent/review-spec-approved` → code-implementation
   - `agent/review-code-rejected` → code-implementation (retry)
   - `agent/reviewable-code` → code-review
   - `agent/review-code-approved` → STOP (approved, awaiting merge)

Each phase transition is followed by reconciliation to sync Jira status and artifact links.

## Orchestration

This skill coordinates the following agent responsibilities:

- `.hypershell/agents/ingest/` - Bidirectional Jira ↔ GitHub intake
- `.hypershell/agents/reconcile/` - Keep Jira status and links in sync
- `.hypershell/agents/triage/` - Classify new items
- `.hypershell/agents/spec-implementation/` - Author spec PRs
- `.hypershell/agents/spec-review/` - Review specs
- `.hypershell/agents/code-implementation/` - Author code PRs
- `.hypershell/agents/code-review/` - Review code

## Example

Run the SDLC for HYPERSHELL-426 with scope `agent/scope/me`:

```
/execute-sdlc agent/scope/me HYPERSHELL-426
```

Dry-run without writes:

```
/execute-sdlc agent/scope/me HYPERSHELL-426 --dry-run
```

## Handoff

When the SDLC reaches `agent/review-code-approved`, the work is complete and awaiting human merge:

1. Review and merge the pull request
2. Re-run this skill or `/reconcile` to finalize the Jira status projection to Done and close the execution record

---

# Implementation

Execute the following steps mechanically.

## Step 0: Resolve Execution Records (Ingest)

Delegate to the `ingest` responsibility under `.hypershell/agents/`:

```
/execute-skill .hypershell/agents/ingest LABEL_SCOPE [ISSUE_OVERRIDE]
```

Ingest ensures every in-scope Jira item has a linked GitHub execution record (create-if-missing, idempotent).

### Post-ingest

For every execution record resolved by ingest:

1. **Associate artifacts** - Find any existing PR with the Jira key in its branch or title; if found and not already linked, add a reference comment.
2. **Derive initial phase** (if no phase label yet):
   - Open `implementer/code-*` PR → `agent/reviewable-code`
   - Open `implementer/spec-*` PR → `agent/reviewable-spec`
   - Otherwise → `agent/workable`
3. **Reconcile** - Run `/reconcile` against the execution record with no previous phase to sync Jira status and artifact links.

## Step 1: Execute Triage

Only if `ISSUE_OVERRIDE` is empty:

```
/triage openshift-online/hypershell LABEL_SCOPE
```

Triage classifies items not already in flight. Items with active phase labels are skipped.

## Step 2: Choose Work Item

If `ISSUE_OVERRIDE` is provided, use that record (and verify it has `LABEL_SCOPE`).

Otherwise, select one random execution record that:
- Has `LABEL_SCOPE`
- Has at least one ACTIVE phase label: `agent/workable`, `agent/reviewable-spec`, `agent/review-spec-approved`, `agent/review-spec-rejected`, `agent/reviewable-code`, `agent/review-code-rejected`
- Is not terminal: not `agent/review-code-approved`, `agent/needs-input`, `agent/duplicate`, `agent/blocked`

If no candidates exist, STOP and report: "No in-flight or workable items in scope: LABEL_SCOPE."

## Step 3: Invoke Agents (Loop)

Store the current phase as `$PREVIOUS_PHASE`.

**WHILE** the selected work item has at least one ACTIVE phase label:

1. Identify the highest-precedence active phase:
   - `agent/reviewable-code` → invoke code-review
   - `agent/review-code-rejected` → invoke code-implementation
   - `agent/review-spec-approved` → invoke code-implementation
   - `agent/reviewable-spec` → invoke spec-review
   - `agent/review-spec-rejected` → invoke spec-implementation
   - `agent/workable` → invoke spec-implementation

2. Invoke the corresponding agent skill:
   ```
   /AGENT_SKILL EXECUTION_RECORD
   ```

3. Normalize to a single phase label (remove all other phase labels so exactly one remains).

4. Reconcile to sync Jira:
   ```
   /reconcile EXECUTION_RECORD $PREVIOUS_PHASE
   ```

**WHEN** the work item reaches `agent/review-code-approved` or has no ACTIVE phase labels, STOP.

## Terminal Handoff

When the loop stops at `agent/review-code-approved`:

1. Provide the PR URL to the human for review.
2. Request that after merge, they re-run:
   ```
   /reconcile EXECUTION_RECORD
   ```
   This detects the merge, projects Jira to Done, and closes the GitHub execution record.
