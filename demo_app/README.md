# Qpro PHP Sample App

This sample lives inside `static_web_page/demo_app` and adds:

- Session login with `demo` / `password`
- MySQL-backed CRUD for `inventory`, `ticket`, and `traceability`
- A landing page with 3 use-case cards
- QPRO `print_markups` integration through the provided `qpro-label-sdk.js`

## Database

The app is configured to use:

- Host: `127.0.0.1`
- Port: `3306`
- Database: `quandosol_demo`
- Username: `root`
- Password: empty

On first load, the app will create the tables if needed. It will not automatically refresh your demo data on every request.

Change these values in `includes/config.php` if your server uses different MySQL settings.

## Run locally

```bash
cd /Users/admin/Sites/qcim/static_web_page/demo_app
php -S 127.0.0.1:8080
```

Then open `http://127.0.0.1:8080/login.php`.

## Refresh demo data

To reset the app data back to the default seeded records, visit:

```text
/refresh_database.php
```

You must be logged in first. This refresh will:

- clear the current `users` table
- recreate the default `demo` login
- clear and reseed `inventory_records`
- clear and reseed `ticket_records`
- clear and reseed `traceability_records`

## QPRO API target

The sample app now uses only these exposed API base URLs:

- Local: `http://qcim-backend.test/api`
- Production: `https://api.beta.quandosol.com/api`

Change the active target in `includes/config.php`:

```php
'environment' => 'local'
```

Use `local` for your local backend and `production` for beta production.

## QPRO label setup

The app maps each use case to a label name in `includes/config.php`:

- `inventory`
- `ticket`
- `traceability`

Update those names if your real QPRO labels use different names.

For each QPRO label, add these API variables in the designer:

- `{{api:record_id}}`
- `{{api:reference_code}}`
- `{{api:title}}`
- `{{api:location}}`
- `{{api:status}}`
- `{{api:owner_name}}`
- `{{api:category}}`
- `{{api:quantity}}`
- `{{api:scheduled_at}}`

These are sent in the `apiData` payload whenever the user clicks `Print` through `QPROLabelSDK.printLabel(...)`.
