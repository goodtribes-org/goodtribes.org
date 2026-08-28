# Observability — dashboards & alert rules

Authored ahead of a live Prometheus/Grafana existing in the cluster (see CLAUDE.md's Fas 2 entry — this session couldn't confirm either way, so the scrape config was left annotation-based rather than a `ServiceMonitor` CRD). These files are inert until someone with cluster access wires them up; nothing here changes the deployed chart's behavior on its own.

## What's here

- `dashboards/frontend-process.json` — a Grafana dashboard covering the frontend pod's process metrics: target up/down, restart count, uptime, CPU vs its 1000m limit, memory (RSS + heap) vs its 512Mi limit, event loop lag percentiles, GC duration, active handles/requests.
- `alerts/frontend-process.yaml` — companion Prometheus alerting rules (`FrontendTargetDown`, `FrontendFrequentRestarts`, `FrontendHighMemory`, `FrontendHighCPU`, `FrontendHighEventLoopLag`).

Both are scoped to the frontend Deployment only — postgres/redis/meilisearch/minio have no metrics exporters today (see "Not done" in MATTIAS_TODO.md item 6), so there's nothing to build a dashboard against for them yet.

## Prerequisite

Confirm Prometheus is actually scraping `/api/metrics` first: it requires a `bearer_token`/`bearer_token_file` set to the same value as `CRON_SECRET` in `goodtribes-secret` (see the route's own comment and `chart/templates/frontend-service.yaml`'s `prometheus.io/*` annotations). No dashboard or alert here will show data without that scrape config existing.

## To use the dashboard

1. Grafana → Dashboards → New → Import → paste the contents of `dashboards/frontend-process.json`.
2. When prompted, pick your Prometheus datasource for the `DS_PROMETHEUS` input.
3. The dashboard has a `job` template variable at the top — pick whatever job label your scrape config assigns to the frontend target (it's a dropdown populated from `label_values(process_start_time_seconds, job)`, not something this repo can know in advance).

## To use the alert rules

`alerts/frontend-process.yaml` is plain Prometheus rule-file syntax (a `groups:` list), not a `PrometheusRule` CRD — same reasoning as the dashboard's datasource-agnostic design. Two ways to load it, depending on what's actually running:

- **Plain Prometheus (no Operator):** add the file's path to `rule_files:` in `prometheus.yml`, or mount it into the Prometheus pod and reference it there.
- **Prometheus Operator:** wrap the same `groups:` list in a `PrometheusRule` custom resource (`apiVersion: monitoring.coreos.com/v1`, `kind: PrometheusRule`) — the `groups` field is copy-paste compatible, it just needs the CR envelope added around it.

Either way, replace every `{{JOB_LABEL}}` placeholder in the file with the real job label first (same one picked in the dashboard's `job` variable above).

## Revisit later

- Thresholds (CPU/memory %, event loop lag ms) are derived from `chart/values.yaml`'s current frontend resource requests/limits — if those change, or once real traffic history exists, re-tune rather than treating these as final. Same caveat this repo already applies to the ResourceQuota/HPA numbers.
- No per-route/HTTP request metrics exist yet (see CLAUDE.md's Fas 2 note on why) — this dashboard is process-health only, not request-latency/error-rate. That would need `/api/metrics` instrumented per-route first, which App Router doesn't make as easy as a single `middleware.ts` hook would (middleware only covers pages, not every route handler).
