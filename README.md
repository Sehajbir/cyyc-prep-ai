# CYYC Prep AI

A small, dependency-free Python web app for aviation study practice. It includes:

- **Flash Cards** — create decks and cards, attach a question image and/or answer image, review by minimum difficulty, rate Easy/Mid/Hard, and export/import every deck as JSON.
- **Apron Ops** — randomized CYYC Apron 1 arrival and departure scenarios. Departure scenarios require both a spot and an exit taxiway; arrival scenarios require an entry taxiway.

## Run locally

Python 3.9+ is all that is needed:

```bash
python app.py
```

Open <http://localhost:8000>. Set `PORT` for hosting platforms that provide a port (the server binds to `0.0.0.0`):

```bash
PORT=8080 python app.py
```

Decks and practice statistics are intentionally stored in the browser's local storage. Use **Export all** regularly to keep a portable backup. Import replaces the current browser decks after confirmation.

## Updating the Apron 1 tables

The source of truth for the scenario trainer is `rules.py`. The UI loads it from `/api/rules`; the supplied gate route tables and taxiway-to-position table are transcribed there, including the asterisk markers and permitted gate list. Update that file when the training tables change. This is a study aid and should not be used as operational guidance without checking current airport publications.

No third-party packages, build step, database, or external CDN is required.
