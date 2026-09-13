#!/usr/bin/env python3
"""Resize portfolio photos and export responsive numbered WebP files."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".heic", ".webp"}


def natural_sort_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.casefold() for part in re.split(r"(\d+)", path.name)]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL)


def next_image_number(category: dict[str, object]) -> int:
    projects = category.get("projects", [])
    return max(
        (int(project["start"]) + int(project["count"]) for project in projects),
        default=1,
    )


def convert_image(
    source: Path,
    destination: Path,
    target_width: int,
    quality: int,
    temporary_directory: Path,
    fit_longest_edge: bool = False,
) -> None:
    intermediate = temporary_directory / f"{destination.stem}-{target_width}.png"
    resize_arguments = ["-Z", str(target_width)] if fit_longest_edge else ["--resampleWidth", str(target_width)]
    run([
        "sips",
        *resize_arguments,
        "-s",
        "format",
        "png",
        str(source),
        "--out",
        str(intermediate),
    ])
    run([
        "cwebp",
        "-quiet",
        "-q",
        str(quality),
        "-metadata",
        "icc",
        str(intermediate),
        "-o",
        str(destination),
    ])


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="依 portfolio.json 的分類設定，縮圖並輸出連號 WebP。"
    )
    parser.add_argument("source", type=Path, help="放置原始照片的資料夾")
    parser.add_argument("category", help="portfolio.json 內的分類代號，例如 event")
    parser.add_argument("--start", type=int, help="起始編號；省略時自動接續現有作品")
    parser.add_argument("--max-width", type=int, default=1600, help="大圖最長邊上限（預設 1600）")
    parser.add_argument("--medium-width", type=int, default=1200, help="中尺寸寬度（預設 1200）")
    parser.add_argument("--thumb-width", type=int, default=720, help="縮圖寬度（預設 720）")
    parser.add_argument("--quality", type=int, default=85, help="WebP 品質 1–100（預設 85）")
    parser.add_argument("--medium-quality", type=int, default=82, help="中尺寸 WebP 品質 1–100（預設 82）")
    parser.add_argument("--thumbnail-quality", type=int, default=78, help="縮圖 WebP 品質 1–100（預設 78）")
    thumbnail_group = parser.add_mutually_exclusive_group()
    thumbnail_group.add_argument("--thumbnails", action="store_true", help="即使分類未設定，也建立 thumbs 縮圖")
    thumbnail_group.add_argument("--no-thumbnails", action="store_true", help="不建立 thumbs 縮圖")
    parser.add_argument("--overwrite", action="store_true", help="允許覆寫既有輸出檔")
    parser.add_argument("--dry-run", action="store_true", help="只顯示預計輸出的檔案")
    return parser.parse_args()


def fail(message: str) -> None:
    print(f"錯誤：{message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    args = parse_arguments()
    repository_root = Path(__file__).resolve().parent.parent
    portfolio_path = repository_root / "portfolio.json"

    if not args.source.is_dir():
        fail(f"找不到原始照片資料夾：{args.source}")
    if not portfolio_path.is_file():
        fail(f"找不到 {portfolio_path}")
    if args.start is not None and args.start < 1:
        fail("--start 必須大於 0")
    if args.max_width < 1 or args.medium_width < 1 or args.thumb_width < 1:
        fail("圖片尺寸必須大於 0")
    if not all(1 <= quality <= 100 for quality in (args.quality, args.medium_quality, args.thumbnail_quality)):
        fail("WebP 品質必須介於 1–100")

    missing_commands = [command for command in ("sips", "cwebp") if shutil.which(command) is None]
    if missing_commands:
        fail("缺少必要工具：" + "、".join(missing_commands))

    portfolio = json.loads(portfolio_path.read_text(encoding="utf-8"))
    categories = portfolio.get("categories", {})
    if args.category not in categories:
        fail(f"portfolio.json 沒有分類「{args.category}」")

    category = categories[args.category]
    image_directory = category.get("imageDirectory")
    image_prefix = category.get("imagePrefix")
    if not image_directory or not image_prefix:
        fail(f"分類「{args.category}」不是照片分類")

    sources = sorted(
        (
            path
            for path in args.source.iterdir()
            if path.is_file() and path.suffix.casefold() in SUPPORTED_EXTENSIONS
        ),
        key=natural_sort_key,
    )
    if not sources:
        fail("資料夾內沒有支援的照片格式")

    start = args.start if args.start is not None else next_image_number(category)
    output_directory = repository_root / str(image_directory)
    configured_thumbnail_directory = category.get("thumbnailDirectory")
    configured_medium_directory = category.get("mediumDirectory")
    make_thumbnails = not args.no_thumbnails and bool(configured_thumbnail_directory or args.thumbnails)
    thumbnail_name = str(configured_thumbnail_directory or "thumbs")
    thumbnail_directory = output_directory / thumbnail_name
    medium_directory = output_directory / str(configured_medium_directory or "medium")

    outputs: list[tuple[Path, Path, Path | None]] = []
    for offset, _source in enumerate(sources):
        number = start + offset
        filename = f"{image_prefix}-{number:02d}.webp"
        full = output_directory / filename
        medium = medium_directory / filename
        thumbnail = thumbnail_directory / filename if make_thumbnails else None
        outputs.append((full, medium, thumbnail))

    conflicts = [path for pair in outputs for path in pair if path is not None and path.exists()]
    if conflicts and not args.overwrite:
        preview = "\n".join(f"  - {path.relative_to(repository_root)}" for path in conflicts[:8])
        fail("以下輸出已存在；確認後加上 --overwrite：\n" + preview)

    print(f"分類：{args.category}")
    print(f"來源：{args.source.resolve()}")
    print(f"編號：{start:02d}–{start + len(sources) - 1:02d}")
    print(f"大圖：最長邊 {args.max_width}px，WebP 品質 {args.quality}")
    print(f"中尺寸：寬度 {args.medium_width}px，WebP 品質 {args.medium_quality}")
    print("縮圖：" + (f"寬度 {args.thumb_width}px，WebP 品質 {args.thumbnail_quality}" if make_thumbnails else "不建立"))

    if args.dry_run:
        for source, (full, medium, thumbnail) in zip(sources, outputs):
            print(f"{source.name} -> {full.relative_to(repository_root)}")
            print(f"{source.name} -> {medium.relative_to(repository_root)}")
            if thumbnail is not None:
                print(f"{source.name} -> {thumbnail.relative_to(repository_root)}")
        return

    output_directory.mkdir(parents=True, exist_ok=True)
    medium_directory.mkdir(parents=True, exist_ok=True)
    if make_thumbnails:
        thumbnail_directory.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="portfolio-images-") as temporary:
        temporary_directory = Path(temporary)
        for source, (full, medium, thumbnail) in zip(sources, outputs):
            print(f"處理 {source.name} -> {full.name}")
            convert_image(source, full, args.max_width, args.quality, temporary_directory, fit_longest_edge=True)
            convert_image(source, medium, args.medium_width, args.medium_quality, temporary_directory)
            if thumbnail is not None:
                convert_image(
                    source,
                    thumbnail,
                    args.thumb_width,
                    args.thumbnail_quality,
                    temporary_directory,
                )

    snippet = {
        "id": "new-project",
        "year": "YYYY",
        "type": "作品類型",
        "title": "作品名稱",
        "start": start,
        "count": len(sources),
    }
    print("\n完成。請將這筆資料調整後加入 portfolio.json 的 projects：")
    print(json.dumps(snippet, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
