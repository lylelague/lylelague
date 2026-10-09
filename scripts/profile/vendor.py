"""Dev-only: refresh the vendored fonts and icons used by the profile SVGs.

Not run in CI. Needs fonttools + brotli (pip install fonttools brotli).

  python scripts/profile/vendor.py <mona-sans-webfonts-dir> <simple-icons-pkg-dir> <octicons-pkg-dir>

Sources, pinned:
  Mona Sans v2.0.27 webfonts (github/mona-sans, SIL OFL 1.1)
  simple-icons 16.32.0 (CC0 1.0)
  @primer/octicons 19.38.0 (MIT)
"""

import json
import re
import shutil
import sys
from pathlib import Path

from fontTools import subset

HERE = Path(__file__).resolve().parent

FONTS = {
    "mona-regular": "MonaSans-Regular.woff2",
    "mona-semibold": "MonaSans-SemiBold.woff2",
    "mona-expanded-extrabold": "MonaSansExpanded-ExtraBold.woff2",
}
# Printable ASCII plus the right single quote and en dash used in copy.
UNICODES = "U+0020-007E,U+2019,U+2013"

SIMPLE_ICONS = [
    "typescript", "express", "sequelize", "postgresql", "react", "nextdotjs", "laravel",
    "inertia", "vuedotjs", "expo", "supabase", "kotlin", "php", "claude",
]
OCTICONS = [
    "browser-24", "device-mobile-24", "server-24", "trophy-24",
]


def subset_fonts(webfonts: Path) -> None:
    out = HERE / "fonts"
    out.mkdir(exist_ok=True)
    for name, file in FONTS.items():
        src = next(webfonts.rglob(file))
        subset.main([
            str(src), f"--unicodes={UNICODES}", "--flavor=woff2",
            "--layout-features=kern,liga", f"--output-file={out / (name + '.woff2')}",
        ])
    shutil.copy(next(webfonts.rglob("OFL.txt")), out / "OFL.txt")


def font_metrics() -> None:
    """Advance widths per character, so layout code can measure text without a renderer."""
    from fontTools.ttLib import TTFont

    metrics = {}
    for name in FONTS:
        font = TTFont(HERE / "fonts" / f"{name}.woff2")
        cmap, hmtx = font.getBestCmap(), font["hmtx"]
        metrics[name] = {
            "upm": font["head"].unitsPerEm,
            "widths": {chr(cp): hmtx[glyph][0] for cp, glyph in cmap.items()},
        }
    (HERE / "fonts" / "metrics.json").write_text(json.dumps(metrics) + "\n", encoding="utf8")


def read_path(svg: str) -> tuple[str, str]:
    view_box = re.search(r'viewBox="([^"]+)"', svg).group(1)
    paths = re.findall(r'<path[^>]*\sd="([^"]+)"', svg)
    return view_box, " ".join(paths)


def extract_icons(simple_icons: Path, octicons: Path) -> None:
    icons = {}
    for slug in SIMPLE_ICONS:
        view_box, d = read_path((simple_icons / "icons" / f"{slug}.svg").read_text(encoding="utf8"))
        icons[slug] = {"viewBox": view_box, "d": d}
    for name in OCTICONS:
        view_box, d = read_path((octicons / "build" / "svg" / f"{name}.svg").read_text(encoding="utf8"))
        icons[name] = {"viewBox": view_box, "d": d}
    (HERE / "icons.json").write_text(json.dumps(icons, indent=1) + "\n", encoding="utf8")


if __name__ == "__main__":
    webfonts, simple_icons, octicons = map(Path, sys.argv[1:4])
    subset_fonts(webfonts)
    font_metrics()
    extract_icons(simple_icons, octicons)
