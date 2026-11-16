#!/usr/bin/env python3
"""Create a source ZIP preserving existing Git tracking unless --without-git is used."""

from argparse import ArgumentParser
from pathlib import Path
import subprocess
from zipfile import ZIP_DEFLATED, ZipFile

SOURCE_DIRS = ("src", "public", "scripts", "tests", "docs", ".cursor")
SOURCE_FILES = (
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "INFO.md",
    "SITEMAP.md",
    "package.json",
    "bun.lock",
    "package-lock.json",
    "astro.config.mjs",
    "tsconfig.json",
    ".gitignore",
)
EXCLUDED = {".git", "node_modules", "dist", ".astro", "__pycache__", ".DS_Store"}


def source_files(root: Path):
    candidates = [root / name for name in SOURCE_FILES]
    for name in SOURCE_DIRS:
        candidates.extend((root / name).rglob("*"))
    for path in sorted(candidates):
        relative = path.relative_to(root)
        if any(part in EXCLUDED or part.startswith(".env") for part in relative.parts):
            continue
        if path.suffix.lower() in {".zip", ".pyc", ".pem", ".key", ".p12"}:
            continue
        if not path.is_file() or path.is_symlink():
            continue
        if not path.resolve().is_relative_to(root.resolve()):
            continue
        yield path


def package_source(root: Path, output: Path, include_git: bool = True):
    root, output = root.resolve(), output.resolve()
    if output.is_relative_to(root):
        raise ValueError("Save the ZIP outside the project directory.")
    output.parent.mkdir(parents=True, exist_ok=True)
    files = set(source_files(root))
    git_dir = root / ".git"
    if include_git and git_dir.exists():
        if not git_dir.is_dir() or git_dir.is_symlink():
            raise ValueError("Git packaging requires a standalone .git directory, not a linked worktree.")
        alternates = git_dir / "objects/info/alternates"
        if alternates.exists() and alternates.read_text().strip():
            raise ValueError("Git objects depend on an external repository; make a standalone clone first.")
        files.add(git_dir)
        for path in git_dir.rglob("*"):
            if path.is_symlink():
                raise ValueError(f"Git metadata contains a symlink: {path.relative_to(root)}")
            if path.is_dir() or (path.is_file() and path.suffix != ".lock"):
                files.add(path)
        # Preserve existing tracked files even if normal source-only filters omit
        # them (e.g. old tracked Finder files), so extraction adds no deletions.
        tracked = subprocess.check_output(["git", "-C", str(root), "ls-files", "-z"])
        for name in tracked.decode().split("\0"):
            if not name:
                continue
            path = root / name
            if path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(root):
                files.add(path)
    with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(files):
            archive.write(path, Path("presunto-depredador") / path.relative_to(root))
    with ZipFile(output) as archive:
        if archive.testzip():
            raise ValueError("ZIP verification failed.")
    return len(files)


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="ZIP path outside the project")
    parser.add_argument("--without-git", action="store_true", help="Explicitly omit existing Git tracking and history")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    count = package_source(root, args.output, include_git=not args.without_git)
    print(f"{args.output.resolve()} ({count} entries, {args.output.stat().st_size / 1_000_000:.2f} MB)")


if __name__ == "__main__":
    main()
