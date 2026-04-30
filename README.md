# Y&P Associates Website Backend

This backend serves the website and stores valuation requests submitted from the form.

## Run Locally

Install Node.js, then run:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Saved Requests

Form submissions are saved in:

```text
data/valuation-requests.json
```

## Admin Page

Start the server with an admin token:

```powershell
$env:ADMIN_TOKEN="change-this-password"
npm start
```

Open:

```text
http://localhost:3000/admin.html
```

Enter the same admin token to view enquiries and export them as CSV.

## Admin API

To view saved requests through the API, start the server with an admin token:

```powershell
$env:ADMIN_TOKEN="change-this-password"
npm start
```

Then call:

```text
GET /api/valuation-requests
Authorization: Bearer change-this-password
```
