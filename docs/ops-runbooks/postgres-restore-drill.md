# Postgres backup restore drill

**Who can run this:** whoever has `kubectl`/production cluster access (Mattias). Needs a real connection to the cluster's MinIO and a scratch Postgres — cannot be done from a sandboxed session.

## Background

`chart/templates/postgres-backup-cronjob.yaml` has taken nightly `pg_dump --format=custom` backups into the `goodtribes-backups` MinIO bucket since 2026-08-11 (see `CLAUDE.md`'s "Known issues"). **Nobody has ever confirmed a backup actually restores.** This drill does that, against a disposable database — it never touches the real `goodtribes-postgres` deployment.

## Step 1 — List available backups

```bash
kubectl -n goodtribes run mc-drill --rm -it --restart=Never --image=minio/mc:latest -- sh -c '
  mc alias set local http://goodtribes-minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
  mc ls local/goodtribes-backups
'
```

(Pull `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` from the `goodtribes-secret` Secret if the pod's `envFrom` doesn't already have them — same pattern the cronjob itself uses.)

Pick the most recent `goodtribes-<timestamp>.dump` file.

## Step 2 — Download it locally

```bash
kubectl -n goodtribes cp mc-drill:/dev/stdin ./restore-drill.dump # adjust to how you get the file off the pod, e.g.:
kubectl -n goodtribes exec -it mc-drill -- mc cat "local/goodtribes-backups/<FILENAME>" > ./restore-drill.dump
```

## Step 3 — Spin up a throwaway scratch Postgres (NOT the real one)

```bash
docker run -d --name restore-drill-pg \
  -e POSTGRES_USER=drill -e POSTGRES_PASSWORD=drill -e POSTGRES_DB=drill \
  -p 15498:5432 postgres:16-alpine

# wait for it to be ready
until docker exec restore-drill-pg pg_isready -U drill; do sleep 1; done
```

## Step 4 — Restore into it

```bash
docker cp ./restore-drill.dump restore-drill-pg:/tmp/restore-drill.dump
docker exec restore-drill-pg pg_restore \
  -U drill -d drill --no-owner --no-privileges -v /tmp/restore-drill.dump
```

Watch for errors in the output — `pg_restore` prints per-object failures but often still exits 0, so don't just check the exit code.

## Step 5 — Verify the data actually landed

```bash
docker exec -it restore-drill-pg psql -U drill -d drill -c "\dt" # table list looks complete?
docker exec -it restore-drill-pg psql -U drill -d drill -c 'SELECT count(*) FROM "Project";'
docker exec -it restore-drill-pg psql -U drill -d drill -c 'SELECT count(*) FROM "User";'
```

Compare row counts against what you'd expect from production (roughly — an exact match isn't the point, an empty or wildly-off table is).

## Step 6 — Clean up

```bash
docker rm -f restore-drill-pg
rm ./restore-drill.dump
```

## Step 7 — Decide on retention

Once the drill confirms restores work, decide: is 14 days of on-cluster MinIO retention (`postgresBackup.retentionDays` in `chart/values.yaml`) enough, or should dumps also mirror off-cluster (e.g. a separate cloud storage bucket, outside this cluster's own blast radius)? If a whole-cluster incident ever takes MinIO down too, on-cluster-only backups don't help.

## If the drill fails

Don't leave it there — a backup that doesn't restore is worse than believing there's no backup at all (false confidence). File it as a bug against `postgres-backup-cronjob.yaml`'s dump format/flags immediately.
