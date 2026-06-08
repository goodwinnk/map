# Issues Map

A browser-based visualization of YouTrack issues as a hexagonal bubble-pack map. It has two parts:

1. **`youtrack-connector/`** — a Kotlin CLI tool that fetches issues from the YouTrack REST API and writes compressed JSON files to `web/data/`.
2. **`web/`** — a static frontend (D3.js + Bootstrap) that reads those JSON files and renders the interactive map.

## Connector: build and run

The connector uses Gradle with Kotlin DSL. Run from the `youtrack-connector/` directory:

```bash
cd youtrack-connector
./gradlew run           # fetches issues and writes web/data/
```

To authenticate, set the `YT_TOKEN` environment variable to a YouTrack permanent token before running. Without it, requests are made without auth (may be rate-limited or rejected).

```bash
YT_TOKEN=your_token ./gradlew run
```

The connector writes two things:
- `web/data/data.json` — contains `{ "last": "dd.MM.yyyy" }` pointing to the latest snapshot
- `web/data/YYYY.MM.dd/<query-name>.json` — one file per `IssuesRequest` defined in `kt-youtrack.kt`

## Web frontend: develop and build

From the `web/` directory:

```bash
cd web
npm install             # installs gulp + bower, then runs bower install via postinstall
npm run deploy          # runs gulp dist → copies assets into web/web/
```

For live-reload during development:

```bash
cd web
npx gulp watch          # watches index.html, js/*.js, css/*.css and triggers livereload
```

Open `web/index.html` directly in a browser (no server required — data is loaded via `d3.json` relative paths).

## Architecture

### Data flow

```
YouTrack API
    ↓ (youtrack-connector, Kotlin)
web/data/YYYY.MM.dd/<query>.json   ← CompressedIssues JSON
web/data/data.json                 ← { "last": "dd.MM.yyyy" }
    ↓ (browser, d3.json)
web/js/youtrack.js  →  loadIssues() → filterIssues() → addIssues()
web/js/main.js      →  D3 rendering (bubble-pack + hexagons)
```

### Compressed issue format

To minimize JSON size, the connector encodes string fields (assignee, state, priority, subsystems) into integer indices. The `CompressedIssues` object carries lookup maps (`assignees`, `states`, `priorities`, `subsystems`) and each issue (`IssueOverviewMappedCompressed`) stores indices instead of strings. Field names in the JSON are single-letter abbreviations: `s`=summary, `p`=priority, `st`=state, `c`=created, `u`=updated, `v`=votes, `a`=assignee, `ss`=subsystems.

### Frontend URL parameters

The page state lives entirely in URL query parameters — no routing library:

| Param | Values | Meaning |
|-------|--------|---------|
| `q` | `kt-all`, `kt-compiler`, `kt-tools`, `kt-native`, `kt-aa`, `kt-other`, `idea-all` | Which JSON file to load |
| `d` | `dd.MM.yyyy` | Data snapshot date (defaults to `last` in data.json) |
| `g` | _(none)_=subsystem, `a`=assignee, `p`=priority | Grouping |
| `h` | _(none)_=votes+age, `age`, `priority`, `updated` | Heat/color mode |
| `s` | integer index | Subsystem filter |
| `assignee` | integer index | Assignee filter |

All navigation mutates `document.location.search` via `hrefParam()` in `youtrack.js`, which triggers a full page reload.

### Visited-issue tracking

The browser stores visited issue IDs in `localStorage` (via `store-js`) bucketed by issue ID prefix and thousands-group (e.g. `KT42` holds KT-42000–42999). This allows clearing per-project without scanning all keys.

### Adding a new issue query

1. Add an `IssuesRequest` entry to the `requests` list in `youtrack-connector/src/main/kotlin/nk/issues/map/kt-youtrack.kt`.
2. Run the connector to generate the new JSON file.
3. Add a menu entry in `web/index.html` calling `queryHref('your-query-name')`.
4. Add the display name mapping in `updateFilter()` in `web/js/youtrack.js`.
