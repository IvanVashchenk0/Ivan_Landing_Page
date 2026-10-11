"""Create faithful web derivatives from the supplied LinkedIn profile originals."""

from argparse import ArgumentParser
from hashlib import file_digest
from pathlib import Path

from PIL import Image


parser = ArgumentParser()
parser.add_argument("--source", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()

sources = {
    "banner": args.source / "banner.png",
    "profile": args.source / "profile.jpeg",
}


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def webp(source: Path, target: Path, width: int, quality: int) -> None:
    with Image.open(source) as image:
        image = image.convert("RGB")
        if image.width > width:
            height = round(image.height * width / image.width)
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=quality, method=6)


before = {name: sha256(path) for name, path in sources.items()}
args.output.mkdir(parents=True, exist_ok=True)
webp(sources["banner"], args.output / "banner.webp", 1920, 90)
webp(sources["profile"], args.output / "profile.webp", 1200, 90)
after = {name: sha256(path) for name, path in sources.items()}
if before != after:
    raise RuntimeError("A LinkedIn source image changed during preparation.")

with Image.open(args.output / "banner.webp") as banner, Image.open(args.output / "profile.webp") as profile:
    print(
        f"Prepared LinkedIn banner {banner.width}×{banner.height} and "
        f"profile {profile.width}×{profile.height}; source hashes unchanged."
    )
