# Accomplishments and Throughput Metrics Agent Specification

## Purpose

The accomplishments-throughput agent is an autonomous agent that generates weekly aggregated accomplishments and throughput metrics across all HyperShell scopes. It runs on a cron schedule (Tuesday 6:00 PM EST) and produces markdown and JSON reports capturing both impact-focused and technical accomplishment summaries, along with cycle time and phase duration metrics calculated from closed GitHub issues in the HyperShell execution record.

## Requirements

### Requirement: Issue Query and Filtering

The agent SHALL query closed GitHub issues matching ALL of the following:
- Have the `agent/execution-record` label (marks GitHub execution records linked to Jira items)
- Have at least one `agent/scope/*` label (e.g., `agent/scope/me`, `agent/scope/int`)
- Be in the `openshift-online/hypershell` repository
- Have a merge date (closed issues with linked merged PRs)

#### Scenario: Query returns scoped execution records

- GIVEN closed GitHub issues in the HyperShell repository
- WHEN the agent queries for issues with both `agent/execution-record` and `agent/scope/*` labels
- THEN it returns only issues meeting both label criteria, grouped by `agent/scope/*` value

### Requirement: Accomplishment Summary Generation

The agent SHALL generate two distinct accomplishment summary styles for each closed issue:

1. **Impact-focused** - Frames the accomplishment in business/product terms (e.g., "Enabled real-time cluster provisioning")
2. **Technical** - Frames the accomplishment in engineering terms (e.g., "Implemented gRPC watch stream reconciliation")

#### Scenario: Generate both styles for a single issue

- GIVEN a closed GitHub issue with `agent/execution-record` label
- WHEN the agent processes the issue
- THEN it outputs both an impact-focused and technical accomplishment summary
- AND both summaries are concise (1-2 sentences)

### Requirement: Jira Canonical Link Extraction

The agent SHALL extract Jira canonical links from GitHub issue bodies (formatted as HTML comments in the issue body) and include them as clickable links in the markdown report.

#### Scenario: Extract and render Jira link

- GIVEN a GitHub issue body containing a Jira canonical link (e.g., `<!-- Jira: HYPERSHELL-123 -->`)
- WHEN the agent generates the report
- THEN the markdown includes a clickable link to the Jira issue
- AND the link uses the Jira URL pattern: `https://redhat.atlassian.net/browse/HYPERSHELL-<key>`

### Requirement: Throughput Metrics Calculation

The agent SHALL calculate the following metrics for each closed issue:

1. **Cycle time** - Time from issue creation to PR merge (in days)
2. **PR review time** - Time from first commit to first approval (in days)
3. **Approval rate** - Percentage of issues approved on first code review (no rejections)
4. **Phase durations** - Time spent in each SDLC phase (spec, code, review) in days

#### Scenario: Calculate cycle time from created and merged dates

- GIVEN a closed GitHub issue with creation date and a linked merged PR with merge date
- WHEN the agent calculates cycle time
- THEN cycle time equals (merge date - creation date) in days
- AND the value is rounded to one decimal place

#### Scenario: Calculate phase durations from label timestamps

- GIVEN GitHub issue label events showing phase transitions (e.g., `agent/workable` -> `agent/reviewable-spec` -> `agent/review-spec-approved`)
- WHEN the agent retrieves label event timestamps
- THEN it calculates duration per phase as the time between label application events
- AND it reports durations in days

### Requirement: Report Generation and Output

The agent SHALL output two report formats:

1. **Markdown report** - Human-readable format with:
   - Title and generation date
   - Accomplishments grouped by scope, with both impact and technical summaries
   - Jira links rendered as clickable URLs
   - Throughput metrics table (cycle time, review time, approval rate)
   - Phase duration summary by scope
   
2. **JSON report** - Machine-readable format with:
   - Structured metadata (generated date, report period, scope)
   - Array of accomplishment records (issue key, summary styles, Jira link, metrics)
   - Aggregated metrics (average cycle time, approval rate %)
   - Phase duration statistics by scope

Reports are written to `.hypershell/reports/` directory with filenames:
- Markdown: `accomplishments-YYYY-MM-DD.md`
- JSON: `accomplishments-YYYY-MM-DD.json`

#### Scenario: Generate both markdown and JSON outputs

- GIVEN processed closed issues and calculated metrics
- WHEN the agent generates reports
- THEN both markdown and JSON files are created in `.hypershell/reports/`
- AND filenames include the report generation date
- AND `.hypershell/reports/` is in `.gitignore` (reports are not committed)

### Requirement: Cron Schedule

The agent SHALL run autonomously on a cron schedule: **Tuesday 6:00 PM EST (23:00 UTC)**.

#### Scenario: Agent execution on schedule

- GIVEN the agent is deployed in the cluster
- WHEN the cron schedule matches (Tuesday 18:00 EST)
- THEN the agent wakes, queries issues, generates reports, and outputs them to `.hypershell/reports/`

### Requirement: Agent Configuration and Secrets

The agent SHALL be configured with:
- `.hypershell/agents/accomplishments-throughput/agent.yaml` - AgentRuntime definition
- `.hypershell/agents/accomplishments-throughput/kustomization.yaml` - Kustomize overlay
- `.hypershell/agents/accomplishments-throughput/SKILL.md` - Agent workflow prompt

Secrets (GitHub token, Jira token) SHALL be provisioned in Vault and mounted as environment variables or files.

#### Scenario: Agent uses credentials from secrets

- GIVEN the agent is running in the cluster
- WHEN it queries GitHub and Jira APIs
- THEN it authenticates using credentials from mounted secret sources
- AND credentials are never logged or exposed in reports

## Scenarios

### End-to-End: Weekly Accomplishments Report Generation

- GIVEN the agent is deployed and cron schedule is configured
- WHEN Tuesday 6:00 PM EST arrives
- AND there are closed GitHub issues with both `agent/execution-record` and `agent/scope/*` labels
- THEN the agent queries those issues
- AND generates accomplishment summaries (both impact and technical) for each
- AND extracts Jira canonical links
- AND calculates throughput metrics (cycle time, review time, approval rate, phase durations)
- AND outputs markdown and JSON reports to `.hypershell/reports/`
- AND the user can read the reports locally and validate accomplishment styles and metrics are accurate
