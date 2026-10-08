#!/usr/bin/env python3
"""Prepare faithful lightweight derivatives of the supplied blur diagram."""

from pathlib import Path
import argparse
from PIL import Image


STAGE_BOXES = (
    (18, 18, 391, 455),
    (430, 18, 800, 455),
    (837, 18, 1204, 455),
    (1240, 18, 1625, 455),
    (18, 489, 417, 923),
    (453, 489, 811, 923),
    (847, 489, 1199, 923),
    (1236, 489, 1652, 923),
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with Image.open(args.source) as image:
        image.save(args.output / "blur-diagram.webp", "WEBP", lossless=True, method=6)
        for index, box in enumerate(STAGE_BOXES, 1):
            image.crop(box).save(
                args.output / f"blur-stage-{index}.webp",
                "WEBP",
                lossless=True,
                method=6,
            )


if __name__ == "__main__":
    main()
