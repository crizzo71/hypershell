---
name: accomplishments-throughput
description: >
  Weekly accomplishments and throughput metrics report. Aggregates all scopes,
  summarizes closed issues with 2 accomplishment styles, and reports cycle time,
  PR review time, and other throughput metrics. Posts to .hypershell/reports/
  every Tuesday at 6pm EST.
---

# Accomplishments & Throughput Report

Generate a weekly aggregated accomplishments and throughput metrics report for all HyperShell SDLC scopes.

## Schedule

Runs automatically every **Tuesday at 6:00 PM EST**.

## Input

*(No manual input required - runs on schedule)*

Optional manual invocation:
```text
$[START_DATE (Optional)] $[END_DATE (Optional)]
```

- START_DATE - Report period start (ISO 8601: YYYY-MM-DD). Defaults to 7 days ago (last week).
- END_DATE - Report period end (ISO 8601: YYYY-MM-DD). Defaults to today.

## Output

A weekly report file at:
```
.hypershell/reports/accomplishments-throughput-YYYY-MM-DD.md
```

Example:
```
.hypershell/reports/accomplishments-throughput-2026-10-19.md
```

## Workflow

### Step 1: Query Closed Issues

Using the GitHub API, fetch all **closed** issues in `openshift-online/hypershell` that:
1. Have `agent/execution-record` label (are SDLC execution records)
2. Have any `agent/scope/*` label (are in-scope)
3. Were closed during `$START_DATE` to `$END_DATE`
4. Have `agent/review-code-approved` label (code reviewed and approved)

For each issue, extract:
- Issue number, title, URL
- All labels (scope, phase)
- Created timestamp
- Closed timestamp
- Linked PRs (branch, merge timestamp)
- Issue body (for accomplishment summary)

Output: `$CLOSED_ISSUES` = list of closed execution records

---

### Step 2: Generate Accomplishment Summaries (2 Styles)

For each closed issue, generate TWO accomplishment summary styles:

**Style A: Impact-Focused (2-3 sentences)**
- Lead with the user-facing impact or capability enabled
- Describe the outcome and its implications
- End with a business/product benefit
- Example: "Enabled late-binding placement for Gateways via capability selectors. Gateways can now be declared fully without explicit cluster assignment, allowing the control plane to resolve and assign ManagedClusters at provision time based on capability requirements."

**Style B: Technical/Feature Summary (1 line)**
- Concise technical description of what was shipped
- Include feature scope or mechanism changed
- Example: "Late-binding placement via capability selectors."

**Generation strategy:**
- Read issue `title` and first 200 chars of `body` (the Requirement section usually contains the key insight)
- Use the issue's own language where possible (don't rewrite)
- Generate both styles; human decides which to use in their status
- If issue body is sparse, derive from title + linked PR description
- **Extract Jira link** from issue body (parse "Canonical Jira link: https://redhat.atlassian.net/browse/HYPERSHELL-XXX" or similar)

Output: `$ACCOMPLISHMENTS` = { issue_number: { style_a: "...", style_b: "...", jira_link: "https://..." } }

---

### Step 3: Calculate Throughput Metrics

For each closed issue, calculate:

**Cycle time:**
```
cycle_time_days = (closed_at - created_at) / 86400
```

**PR review time:** (approximated from label timeline)
```
pr_opened ≈ when agent/reviewable-code label was added
pr_approved ≈ when agent/review-code-approved label was added
review_time ≈ (pr_approved - pr_opened)
```

**Review count:**
- Count how many times the issue bounced between review states
- 0 bounces = 1 approval (first pass)
- 1+ bounces = multiple review cycles (rework)

**Approval rate:**
```
approval_rate = COUNT(issues approved on first review) / COUNT(closed issues)
```

**Phase durations (aggregate):**
For issues that transitioned through multiple phases:
```
spec_time = time from created to first reviewable-spec label
code_time = time from first review-spec-approved to first reviewable-code label
review_time = time from first reviewable-code to review-code-approved label
```

Output: `$METRICS` = {
  cycle_time_avg,
  cycle_time_median,
  cycle_time_range,
  pr_review_time_avg,
  review_count_per_pr,
  approval_rate,
  phase_durations: { spec, code, review }
}

---

### Step 4: Aggregate by Scope

Group closed issues by `agent/scope/*` label:

```
scopes = {
  "agent/scope/mturansk": [#623, #622, ...],
  "agent/scope/jsell": [...],
  "agent/scope/amarin": [...]
}
```

For each scope, compute:
- Item count (closed this week)
- List of issue numbers and titles
- Velocity (items per week)
- Throughput (phase transitions, PRs merged)

Output: `$SCOPE_BREAKDOWN` = { scope: { count, items, velocity, throughput } }

---

### Step 5: Generate Weekly Report Markdown

Output a comprehensive markdown report with sections:

1. **Header**
   - Report title, period, generation timestamp
   - All-scopes status emoji (🟢/🟡/🔴 based on metrics)

2. **Executive Summary**
   - Total items closed this week
   - Aggregate cycle time (avg, median, range)
   - Average PR review time
   - Approval rate (first pass %)
   - Key insight (highest velocity scope, bottleneck, quality signal)

3. **Accomplishments by Scope**
   - For each scope: list of closed issues
   - For each issue: BOTH Style A and Style B summaries
   - Users can choose which style to use in their own status

4. **Throughput Metrics**
   - Cycle time table (per issue)
   - Aggregate cycle time stats
   - PR review time (per issue and average)
   - Review count and approval rate
   - Phase duration breakdown (spec, code, review)

5. **Scope Breakdown**
   - Table: scope | items closed | velocity | trend
   - Identify highest and lowest velocity scopes

6. **Quality Signals**
   - Approval rate (100% = no rework; <100% = rework needed)
   - Review cycles (1 = first pass; 2+ = rework)
   - Rejection count
   - Process health assessment

7. **Key Observations**
   - Bottleneck analysis (which phase longest?)
   - Velocity trends
   - Quality trends
   - Recommendations for improvement

8. **JSON Metrics Snapshot**
   - Machine-readable metrics for dashboards/alerting

---

### Step 6: Write Report to File

Write the markdown report to:
```
.hypershell/reports/accomplishments-throughput-$(date +%Y-%m-%d).md
```

Also write a JSON metrics snapshot to:
```
.hypershell/reports/accomplishments-throughput-$(date +%Y-%m-%d).json
```

Output both files.

---

## Example Output Structure

```markdown
# HyperShell Accomplishments & Throughput Report - Week of 2026-10-19
**Report Generated:** 2026-10-19 20:00 UTC  
**Status:** 🟢 GREEN (12 items, 0.49 day avg cycle time, 100% approval)

---

## Executive Summary
- **Items Closed:** 12
- **Cycle Time:** 0.49 days avg (11.8 hours), 0.12 days median
- **PR Review Time:** ~1.5 hours avg
- **Approval Rate:** 100% (no rework)
- **Key:** Agent provisioning pipeline complete; major milestone week

---

## Accomplishments by Scope

### agent/scope/mturansk (12 items)

#### #623: Gateway create: make cluster_id optional
**Jira:** [HYPERSHELL-416](https://redhat.atlassian.net/browse/HYPERSHELL-416)

**Style A (Impact-Focused):**
Enabled late-binding placement for Gateways via capability selectors...

**Style B (Technical):**
Late-binding placement via capability selectors.

#### #622: hsctl: add get/list for Repository kind
**Jira:** [HYPERSHELL-417](https://redhat.atlassian.net/browse/HYPERSHELL-417)

...

[continues for all 12 issues]

---

## Throughput Metrics

### Cycle Time

[table with all issues, dates, and days]

**Average:** 0.49 days  
**Median:** 0.12 days  
**Range:** 0.04 - 4.30 days

### PR Review Time

[table with issues and review durations]

**Average:** ~1.5 hours  
**All PRs approved same day**

### Approval Rate

| Metric | Value |
| Total closed | 12 |
| Approved first pass | 12 |
| Rework/rejection | 0 |
| **Rate** | **100%** |

### Phase Durations

| Phase | Duration | Notes |
| Spec | 0.5-2 days | Well-defined upfront |
| Code | <1 day | Short implementation |
| Review | <2 hours | Single approval cycle |

---

## Scope Breakdown

| Scope | Items | Velocity | Trend |
| agent/scope/mturansk | 12 | 1.7/day | ↑↑ Very high |
| agent/scope/jsell | 0 | - | - |
| agent/scope/amarin | 0 | - | - |

---

## Quality Signals

✅ **100% first-pass approval** - No rejections  
✅ **Fast review cycles** - <2 hours typical  
✅ **High velocity** - 1.7 items/day  
✅ **Short cycle time** - 85% closed within 1 day

---

## Key Observations

### Velocity
- 12 items closed in 7 days
- 1.7 items/day completion
- Week-over-week: ↑ Very high

### Quality
- 100% first-pass approval rate
- Zero rejections or rework
- Fast review (<2 hours)

### Bottleneck Analysis
- Design work longest (4.3 days)
- Code implementation very fast (<1 day)
- Review never a bottleneck (<2 hours)

---

## JSON Metrics

[machine-readable JSON snapshot for dashboards]

---

**Generated by:** HyperShell accomplishments-throughput agent  
**Period:** 2026-10-12 to 2026-10-19  
**Data source:** GitHub closed issues with agent/review-code-approved label
```

---

## Dry-Run Mode

When invoked with no arguments or in a dry-run context, output the report to stdout and log what WOULD be written to file, but do NOT write the file.

---

## Integration Notes

This agent runs on a schedule every Tuesday at 6pm EST. It:
- ✅ Queries all scopes automatically
- ✅ Generates both accomplishment styles
- ✅ Calculates all throughput metrics
- ✅ Writes to `.hypershell/reports/`
- ✅ Is idempotent (same inputs → same outputs)

Use the generated report for your weekly manager status:
- Copy accomplishments to your weekly manager report (pick Style A or B)
- Share throughput metrics to show team velocity and quality
- Reference scope breakdown to show distribution of work
