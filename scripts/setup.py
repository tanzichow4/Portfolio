#!/usr/bin/env python3
"""One-shot project setup: rename the template, create .venv, install deps, init tooling.

Usage: python scripts/setup.py [--fresh-git]
The project name is taken from the folder this repo was cloned into.
Safe to re-run.
"""

import argparse
import re
import shutil
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLACEHOLDER = "my_project"
PLACEHOLDER_DASH = "my-project"
TEXT_SUFFIXES = {".py", ".toml", ".md", ".yml", ".yaml", ".txt", ".example"}


def run(cmd, **kw):
    print(f"$ {' '.join(map(str, cmd))}")
    return subprocess.run(cmd, cwd=ROOT, **kw)


def package_name(name: str) -> str:
    pkg = re.sub(r"[^0-9a-zA-Z]+", "_", name).strip("_").lower()
    if not pkg or pkg[0].isdigit():
        sys.exit(f"Invalid folder name {name!r}: rename it to start with a letter and re-run.")
    return pkg


def rename_project(name: str) -> None:
    pkg = package_name(name)
    dash = pkg.replace("_", "-")
    old_dir = ROOT / "src" / PLACEHOLDER
    if not old_dir.exists():
        print("Template already renamed, skipping rename.")
        return
    old_dir.rename(ROOT / "src" / pkg)
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts or ".venv" in path.parts:
            continue
        if path.suffix not in TEXT_SUFFIXES or path.name == "setup.py":
            continue
        text = path.read_text(encoding="utf-8")
        new = text.replace(PLACEHOLDER_DASH, dash).replace(PLACEHOLDER, pkg)
        if path.name == "README.md":
            new = re.sub(r"\A# .*", f"# {name}", new)
        if new != text:
            path.write_text(new, encoding="utf-8")
    print(f"Renamed project to '{dash}' (package '{pkg}').")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--fresh-git", action="store_true", help="discard template git history and start a new repo"
    )
    args = ap.parse_args()

    if sys.version_info < (3, 10):  # noqa: UP036
        sys.exit("Python 3.10+ is required.")

    name = ROOT.name
    rename_project(name)

    venv_dir = ROOT / ".venv"
    if not venv_dir.exists():
        print("Creating virtual environment...")
        venv.create(venv_dir, with_pip=True)
    py = venv_dir / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")

    if run([py, "-m", "pip", "install", "-q", "--upgrade", "pip"]).returncode:
        sys.exit("pip upgrade failed")
    if run([py, "-m", "pip", "install", "-e", ".[dev]"]).returncode:
        sys.exit("Dependency install failed")

    env, example = ROOT / ".env", ROOT / ".env.example"
    if example.exists() and not env.exists():
        shutil.copy(example, env)
        print("Created .env from .env.example")

    if args.fresh_git:
        shutil.rmtree(ROOT / ".git", ignore_errors=True)
        run(["git", "init", "-q", "-b", "main"])
        print("Initialized a fresh git repository (no history, no remote).")

    if (ROOT / ".git").exists() and shutil.which("git"):
        run([py, "-m", "pre_commit", "install"])

    activate = (
        r".venv\Scripts\Activate.ps1" if sys.platform == "win32" else "source .venv/bin/activate"
    )
    print(
        f"\nDone! Activate with:  {activate}\nThen try:  pytest   |   ruff check .   |   python -m {package_name(name)}"
    )


if __name__ == "__main__":
    main()
