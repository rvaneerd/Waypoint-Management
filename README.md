# Waypoint Management System

A Node.js and Express application for managing GPS waypoints in MariaDB and exporting them for Topo GPS.

## Features

- Create, view, update, and delete waypoints
- Organize waypoints in a parent-child location hierarchy
- Create locations from the web page, including nested locations
- Keep the most recently selected location in the current browser
- Export waypoints as a ZIP for Topo GPS
- Enter latitude and longitude side by side on wider screens

## Requirements

- Docker Desktop with Docker Compose
- A reachable MariaDB server
- The external Docker network `shared_wp_net`

The application connects to the existing SharedDB server. See [DB_SETUP.md](DB_SETUP.md) for database and account setup.

## Run with Docker Compose

Ensure the external network exists. If SharedDB has not already created it, create it with:

```sh
docker network create shared_wp_net
```

Copy `.env.example` to `.env` if needed, then set the database credentials and deployment settings. Compose reads `.env` and passes the same values to the app. The real `.env` is ignored by Git; do not commit credentials.

Start or rebuild the application:

```sh
docker compose up -d --build
```

Open `http://localhost:<HOST_PORT>` (default: [http://localhost:3004](http://localhost:3004)). The app listens on container port `PORT` (default: `3000`).

Useful commands:

```sh
docker compose ps
docker compose logs -f waypoint-app
docker compose restart waypoint-app
docker compose down
```

### Source files and dependencies

Compose bind-mounts the project folder on the Mac to `/app` in the container. Edit the files in the Mac project folder; those changes are immediately visible inside the container. The app runs with `node index.js`, which does not automatically reload changed code. After editing application source files such as `.js`, restart the app:

```sh
docker compose restart waypoint-app
```

No image rebuild is needed for ordinary source-code edits. After the restart, check that the container is running and inspect startup errors with:

```sh
docker compose ps
docker compose logs --tail=50 waypoint-app
```

If `package.json` or `package-lock.json` changes, rebuild the image and renew the separate `node_modules` volume so the new dependencies are installed:

```sh
docker compose up -d --build --force-recreate --renew-anon-volumes waypoint-app
```

If `Dockerfile`, `docker-compose.yml`, or Docker-related `.env` settings change, recreate the app so the updated build or Compose configuration is applied:

```sh
docker compose up -d --build --force-recreate waypoint-app
```

## Run locally without Docker

Install dependencies and start the app:

```sh
npm install
npm start
```

The server and database settings are loaded from `.env` by `src/database/config.js`. Set `PORT` for the local server and the `DB_*` variables for the database connection. `npm run init` also reads `.env`.

For development with nodemon:

```sh
npm run dev
```

## Database

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `.env` to configure the MariaDB connection. The database itself must exist before startup. On startup, the app runs `src/database/schema.js` to create missing tables. The hierarchy table is named `location_hierarchies` (plural); waypoint records refer to it through `location_hierarchy_id`.

The schema contains:

- `waypoints`
- `location_hierarchies`
- `waypoint_metadata`

Existing tables are not migrated by `CREATE TABLE IF NOT EXISTS`. Back up the database before applying manual schema changes.

## Web interface and API

The home page lets you add waypoints, create top-level or nested locations, browse waypoints, and download a ZIP export. The selected location is remembered in browser `localStorage`.

The export ZIP encodes the location hierarchy as nested folders and names each location CSV after its leaf folder, for example `De Mooiste Fotolocaties/België.csv`. This avoids an extra `waypoints` subfolder during import. Import the ZIP itself into Topo GPS without extracting it; Topo GPS preserves folders found inside an imported ZIP. Waypoints without a location are placed in a root-level `waypoints.csv`. The archive also includes `waypoints.json` as a data copy and a `README.txt`.

| Method   | Endpoint               | Purpose                                                                                    |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `GET`    | `/api/waypoints`       | List waypoints                                                                             |
| `GET`    | `/api/waypoints/:id`   | Get one waypoint                                                                           |
| `POST`   | `/api/waypoints`       | Create a waypoint                                                                          |
| `PUT`    | `/api/waypoints/:id`   | Update a waypoint                                                                          |
| `DELETE` | `/api/waypoints/:id`   | Delete a waypoint                                                                          |
| `POST`   | `/api/hierarchies`     | Create a location; JSON body: `{"name":"Area","parent_id":null}`. `parent_id` is optional. |
| `GET`    | `/api/export/zip`      | Download the Topo GPS ZIP export                                                           |
| `GET`    | `/api/export/zip/file` | Generate a ZIP file on the server and return its path                                      |

## Troubleshooting

- **Port already in use:** the app listens on container port `PORT`, published as host port `HOST_PORT`. Check those `.env` values and whether another process is using the host port.
- **Missing `location_hierarchies` table:** confirm the application is connected to database `waypoints` and that startup completed successfully. Do not use the singular table name `location_hierarchy`.
- **Code changes do not appear:** the files are mounted from the Mac, but the Node process does not hot-reload. Run `docker compose restart waypoint-app`.
- **Connection failure:** check that the MariaDB server at `DB_HOST:DB_PORT` is reachable and verify `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env`.

## License

MIT
