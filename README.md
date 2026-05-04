# EVB Value Grid

A Dynamics 365 HTML Web Resource that displays a pivot-style grid of EVB values linked to an ERVO record.

## What it does

The web resource is embedded on the **ERVO** form. It reads all **EVB Value** records associated with the current ERVO and renders them in a table:

| Jahr nach… | Current year | Year -1 | Year -2 | Year -3 |
|------------|--------------|---------|---------|---------|
| 1          | 0.91         | 0.89    | …       | …       |
| 2          | 0.88         | 0.86    | …       | …       |
| …          | …            | …       | …       | …       |
| 30         | 0.60         | 0.58    | …       | …       |

- Rows represent **Year after** values (1–30) — how far into the future the projection is.
- Columns represent the **current year** (taken from the linked ERVO record) and up to the **3 preceding years**, if data is available.

## Data model

| Table | Description |
|-------|-------------|
| ERVO | Parent record; holds the reference year |
| EVB Value | Child records; each holds a year-after index (1–30), a decimal value, and a lookup to its ERVO |

> Field and entity logical names are environment-specific and must be configured before deploying.

## Project structure

```
src/
  index.html              # Web resource entry point
  styles.css              # Grid styling
  evbValueGrid.types.ts   # Shared TypeScript interfaces
  dynamics365Api.ts       # Dataverse / Web API calls
  evbValueGrid.ts         # Grid rendering logic
  evbValueGridApp.ts      # Application bootstrap
```

The build produces a single self-contained HTML file that can be uploaded directly as a Dynamics 365 Web Resource.

## Prerequisites

- Node.js (any recent LTS)
- A Dynamics 365 environment with the ERVO and EVB Value tables configured

## Build

Install dependencies (first time only):

```bash
npm install
```

Compile and bundle:

```bash
npm run build
```

Type-check without bundling:

```bash
npm run typecheck
```

## Deployment

1. Run `npm run build`.
2. In Dynamics 365, go to **Settings → Customizations → Customize the System → Web Resources**.
3. Upload the generated HTML file (type: Web Page / HTML).
4. Add it to the **ERVO** form as an iframe, passing the record ID via the `id` URL parameter.
5. Publish all customizations.
