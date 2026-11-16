"""Check ZIP exclusions using an isolated project, never the real Git directory."""

import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import subprocess
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location("package_source", Path(__file__).parents[1] / "scripts/package-source.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


class PackageSourceTest(unittest.TestCase):
    def test_portable_source_without_history_generated_files_or_secrets(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary) / "project"
            included = [
                "README.md",
                "AGENTS.md",
                "src/pages/index.astro",
                "public/media/video/demo.mp4",
                ".cursor/rules/project.mdc",
            ]
            excluded = [
                ".git/config",
                "node_modules/pkg/index.js",
                "dist/index.html",
                "src/.env.local",
                "public/.env",
                "scripts/__pycache__/cached.pyc",
                "docs/key.pem",
            ]
            for name in included + excluded:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("fixture")
            (root / "public/linked-secret").symlink_to(root / "src/.env.local")
            output = Path(temporary) / "source.zip"
            self.assertEqual(packager.package_source(root, output, include_git=False), len(included))
            with ZipFile(output) as archive:
                self.assertEqual(set(archive.namelist()), {f"presunto-depredador/{name}" for name in included})
            with self.assertRaises(ValueError):
                packager.package_source(root, root / "source.zip")

    def test_existing_git_tracking_is_included_by_default(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary) / "project"
            root.mkdir()
            subprocess.run(["git", "init", "--quiet", str(root)], check=True)
            (root / "README.md").write_text("fixture")
            (root / ".DS_Store").write_text("old tracked file")
            subprocess.run(["git", "-C", str(root), "add", "-f", "README.md", ".DS_Store"], check=True)
            output = Path(temporary) / "source.zip"
            packager.package_source(root, output)
            with ZipFile(output) as archive:
                names = archive.namelist()
                self.assertIn("presunto-depredador/.git/HEAD", names)
                self.assertIn("presunto-depredador/.git/index", names)
                self.assertIn("presunto-depredador/.DS_Store", names)
                archive.extractall(Path(temporary) / "extracted")
            extracted = Path(temporary) / "extracted/presunto-depredador"
            status = lambda repo: subprocess.check_output(["git", "-C", str(repo), "status", "--porcelain", "--untracked-files=all"])
            self.assertEqual(status(root), status(extracted))


if __name__ == "__main__":
    unittest.main()
