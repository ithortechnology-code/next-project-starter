# PostgreSQL 17 to 18 upgrade

PostgreSQL 18 is now the default for local Compose and VPS deployments. The PostgreSQL major version change needs a logical backup and restore. The official PostgreSQL Docker image also changed `PGDATA` and its declared volume path in version 18: the new cluster lives at `/var/lib/postgresql/18/docker`, and Compose must mount the new volume at `/var/lib/postgresql`. PostgreSQL 18 uses a separate `postgres_data_v18` volume; the existing `postgres_data` volume remains untouched for rollback.

Do not run the updated setup or deployment flow against an existing PostgreSQL 17 volume until the restore is complete. The local setup and VPS deployment scripts run a preflight check and stop when they find an unmarked PostgreSQL 17 cluster.

## Local development

Stop any host-run API or worker using the database. From the repository root, create a private backup while PostgreSQL 17 is still running:

```sh
mkdir -p .data/postgres-upgrade
chmod 700 .data/postgres-upgrade
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > .data/postgres-upgrade/postgres-17.dump
chmod 600 .data/postgres-upgrade/postgres-17.dump
```

Stop PostgreSQL 17 and start PostgreSQL 18 with the updated Compose file. This creates a separate version 18 data volume and leaves the original version 17 volume untouched:

```sh
docker compose stop postgres
docker compose up -d --wait postgres
```

Restore the configured application database, verify the server version and app data, then mark the migration complete:

```sh
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' < .data/postgres-upgrade/postgres-17.dump
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SHOW server_version;"'
docker compose exec -T postgres sh -c 'touch "$PGDATA/.starter-postgres-18-migrated"'
```

Use the configured `POSTGRES_USER` and `POSTGRES_DB` values for the verification command if they differ from the local defaults. The migration marker is written inside the PostgreSQL 18 data directory only after restore and verification; it allows the setup preflight to proceed while the original PostgreSQL 17 volume remains available for rollback. Keep the dump and both volumes until the new database has been checked. Do not run `docker compose down -v` during this upgrade.

## Existing VPS deployments

Schedule a maintenance window. Keep API, worker, and migration services stopped while upgrading, and take an off-server copy of the database backup. On the VPS, from the deployment directory and before deploying the PostgreSQL 18 Compose file, make a backup:

```sh
docker compose --env-file .env -f compose.yaml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > postgres-17.dump
chmod 600 postgres-17.dump
```

Deploy the updated Compose file. The deployment preflight will stop because the volume still contains PostgreSQL 17 data. Start only the PostgreSQL 18 database service, restore and verify the backup, and then mark the migration:

```sh
docker compose --env-file .env -f compose.yaml up -d --wait db
docker compose --env-file .env -f compose.yaml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' < postgres-17.dump
docker compose --env-file .env -f compose.yaml exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SHOW server_version;"'
docker compose --env-file .env -f compose.yaml exec -T db sh -c 'touch "$PGDATA/.starter-postgres-18-migrated"'
```

Use the configured database name and role if they differ from the example values. Once the PostgreSQL 18 data and application records are verified, rerun the deployment workflow. It then runs the versioned application migrations and starts the application containers. Keep the original PostgreSQL 17 volume and backup until staging or production checks pass. The rollback path is to stop PostgreSQL 18 and restore the previous PostgreSQL 17 Compose image and data mount; do not delete either volume during the rollout.

## References

- [PostgreSQL 18 cluster upgrade methods](https://www.postgresql.org/docs/18/upgrading.html)
- [Official PostgreSQL Docker image: PGDATA and volume changes](https://github.com/docker-library/docs/blob/master/postgres/README.md#pgdata)
