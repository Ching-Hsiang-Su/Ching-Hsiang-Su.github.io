#!/usr/bin/env python3
"""Fetch the Medium RSS feed and save a small, static blog.json file."""

from __future__ import annotations

import argparse
import html
import json
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


FEED_URL = "https://medium.com/feed/@kmes9940211"
PROFILE_URL = "https://medium.com/@kmes9940211"


class ContentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.text: list[str] = []
        self.first_image = ""

    def handle_data(self, data: str) -> None:
        self.text.append(data)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.casefold() == "img" and not self.first_image:
            source = dict(attrs).get("src") or ""
            if source.startswith("https://"):
                self.first_image = source


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="更新網站使用的 Medium 文章資料。")
    parser.add_argument("--input", type=Path, help="使用本機 RSS 檔案，不連線下載")
    parser.add_argument("--limit", type=int, default=6, help="最多保留幾篇文章（預設 6）")
    return parser.parse_args()


def element(item: str, tag: str) -> str:
    match = re.search(
        rf"<{re.escape(tag)}(?:\s[^>]*)?>(.*?)</{re.escape(tag)}>",
        item,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return ""

    value = match.group(1).strip()
    if value.startswith("<![CDATA[") and value.endswith("]]>"):
        value = value[9:-3]
    return html.unescape(value.strip())


def clean_url(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme != "https":
        return PROFILE_URL
    query = urlencode([(key, val) for key, val in parse_qsl(parsed.query) if key != "source"])
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, query, ""))


def summarize(markup: str, limit: int = 150) -> tuple[str, str]:
    parser = ContentParser()
    parser.feed(markup)
    text = re.sub(r"\s+", " ", " ".join(parser.text)).strip()
    if len(text) > limit:
        text = text[:limit].rstrip() + "..."
    return text or "點擊閱讀完整文章。", parser.first_image


def parse_feed(feed: str, limit: int) -> list[dict[str, str]]:
    items = re.findall(r"<item(?:\s[^>]*)?>(.*?)</item>", feed, flags=re.IGNORECASE | re.DOTALL)
    posts: list[dict[str, str]] = []

    for item in items[:limit]:
        content = element(item, "content:encoded") or element(item, "description")
        summary, image_url = summarize(content)
        published = element(item, "pubDate")
        published_at = ""
        if published:
            published_at = parsedate_to_datetime(published).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

        posts.append({
            "title": element(item, "title") or "未命名文章",
            "url": clean_url(element(item, "link")),
            "publishedAt": published_at,
            "image": image_url,
            "summary": summary,
        })

    return posts


def main() -> None:
    args = parse_arguments()
    if args.limit < 1:
        raise SystemExit("錯誤：--limit 必須大於 0")

    if args.input:
        feed = args.input.read_text(encoding="utf-8")
    else:
        try:
            request = Request(FEED_URL, headers={"User-Agent": "ChingHsiang-Portfolio-Updater/1.0"})
            with urlopen(request, timeout=20) as response:
                feed = response.read().decode("utf-8")
        except OSError as error:
            raise SystemExit(f"錯誤：無法下載 Medium RSS，原有 blog.json 未變更（{error}）") from None

    posts = parse_feed(feed, args.limit)
    if not posts:
        raise SystemExit("錯誤：RSS 內找不到文章，原有 blog.json 未變更")

    repository_root = Path(__file__).resolve().parent.parent
    destination = repository_root / "blog.json"
    temporary = destination.with_suffix(".json.tmp")
    data = {
        "version": 1,
        "source": PROFILE_URL,
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "posts": posts,
    }
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(destination)
    print(f"已更新 {destination.name}：{len(posts)} 篇文章")


if __name__ == "__main__":
    main()
