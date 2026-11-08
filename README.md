# Boilerplate

A reusable Python project template. Clone, run one script, start coding.

## Quick start

```bash
git clone <this-repo> my-new-project   # the folder name becomes the project name
cd my-new-project
./setup.sh              # macOS / Linux
.\setup.ps1             # Windows (PowerShell)
```

The project name is taken from the folder you cloned into. Optional argument: `--fresh-git`
(drops the template's git history and starts a clean repo — recommended for new projects).

The script will:
1. Rename the `my_project` placeholder package to the folder name (e.g. `my-new-project` -> package `my_new_project`)
2. Create `.venv` and install the project plus dev tools (`pip install -e ".[dev]"`)
3. Create `.env` from `.env.example`
4. Install pre-commit hooks (ruff lint + format)

It's safe to re-run.

## Layout

```
src/<package>/   application code
tests/           pytest tests
scripts/setup.py cross-platform setup logic
.github/         CI (ruff + pytest)
```

## Everyday commands (with the venv activated)

```
pytest             run tests
ruff check .       lint
ruff format .      format
python -m <pkg>    run the app
```
