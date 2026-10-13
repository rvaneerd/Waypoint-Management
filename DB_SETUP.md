# Waypoint Management System: MariaDB Setup

## Connection settings

The application reads its database connection settings from `.env`:

| Setting  | Variable      |
| -------- | ------------- |
| Host     | `DB_HOST`     |
| Port     | `DB_PORT`     |
| Database | `DB_NAME`     |
| User     | `DB_USER`     |
| Password | `DB_PASSWORD` |

Create `.env` in the project root and set the values for your MariaDB server. The MariaDB server must be reachable from the app container. In Docker, the app joins the external network named by `DOCKER_NETWORK` (default: `shared_wp_net`).

Compose reads `.env` for its port, network, and container-name settings and passes the file into the app container. The Node configuration loads the same `.env` for local commands such as `npm start` and `npm run init`. Create `.env` locally using the settings above, keep actual credentials there, and do not commit it to Git.

## Create the database and user

Before running the SQL below, open `.env` and replace every placeholder with the corresponding actual value from `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Do not use the placeholder text literally. Run the SQL as a MariaDB administrator on the SharedDB server, or through its database administration tool:

```sql
CREATE DATABASE IF NOT EXISTS `<DB_NAME>`;

CREATE USER IF NOT EXISTS '<DB_USER>'@'%' IDENTIFIED BY '<DB_PASSWORD>';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, REFERENCES
  ON `<DB_NAME>`.* TO '<DB_USER>'@'%';

FLUSH PRIVILEGES;
```

If the account already exists with a different password, update it separately with `ALTER USER` and ensure the application configuration matches.

The database must be created before starting the app. The app creates missing tables at startup using `src/database/schema.js`; it does not create the database. Waypoint types use the existing `waypoint_metadata` table with `meta_key = 'waypoint_type'` and values `standard`, `photolocation`, or `parking`. Existing records without this metadata are treated as `standard`; no table migration or `ALTER` privilege is needed.

## Tables and relationships

The active JavaScript schema creates these tables:

- `location_hierarchies`: location names, parent IDs, and hierarchy levels
- `waypoints`: coordinates and optional `location_hierarchy_id` referencing `location_hierarchies.id`
- `waypoint_metadata`: metadata using `meta_key` and `meta_value`; waypoint categories use `meta_key = 'waypoint_type'`

Use the plural table name `location_hierarchies`. The application joins against that name. `CREATE TABLE IF NOT EXISTS` does not repair a table with an old or incompatible structure; back up the database before making manual changes.

The application initializes the schema when it starts. Set `HOST_PORT` and `PORT` in `.env` to choose the host and container ports, then start it after database setup:

```sh
docker compose up -d --build
docker compose logs --tail=50 waypoint-app
```

Confirm the logs show a successful connection and database initialization, then open `http://localhost:<HOST_PORT>` (default: [http://localhost:3004](http://localhost:3004)). Docker maps `HOST_PORT` to the app's `PORT`.

## Troubleshooting

- **Connection refused or name resolution failure:** confirm MariaDB is running and `DB_HOST` resolves from the app container on `DOCKER_NETWORK`.
- **Access denied:** verify `DB_USER`, `DB_PASSWORD`, the MariaDB host grant, and privileges on the database named by `DB_NAME`.
- **Unknown database:** create the database named by `DB_NAME` before starting the app.
- **Table `waypoints.location_hierarchy` does not exist:** the expected table is `location_hierarchies` (plural). Check the deployed source/image and confirm schema initialization completed.
- **Port already in use:** check `HOST_PORT` on the Mac and `PORT` inside the container. Inside the app container there should be only one listener, started from `index.js`.
