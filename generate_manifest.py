#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор manifest.json для MemeZone.
Сканирует папки topics/ и top/, собирает все медиафайлы
и записывает topics/manifest.json.

Запуск:  python generate_manifest.py
"""

import json
import os
import sys
from pathlib import Path

# ─── Настройки ───
ROOT        = Path(__file__).parent.resolve()
TOPICS_DIR  = ROOT / "topics"
TOP_DIR     = ROOT / "top"
OUT_FILE    = TOPICS_DIR / "manifest.json"
META_FILE   = TOPICS_DIR / "meta.json"

MEDIA_EXT = {
    # Картинки
    "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif", "ico",
    # Видео
    "mp4", "webm", "ogg", "mov", "m4v",
}

# Папки-исключения (не считать темами)
IGNORE_FOLDERS = {".git", ".github", "__pycache__", "node_modules", ".vscode"}


# ─── Утилиты ───
def is_media(name: str) -> bool:
    """Проверяет, является ли файл медиа по расширению."""
    if name.startswith("."):
        return False
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    return ext in MEDIA_EXT


def prettify(slug: str) -> str:
    """kapibary → Kapibary, my_topic → My Topic."""
    return slug.replace("-", " ").replace("_", " ").title()


def natural_sort_key(s: str):
    """
    Натуральная сортировка: 'мем 2' идёт перед 'мем 10'.
    Полезно, если мемы нумеруются.
    """
    import re
    return [
        int(part) if part.isdigit() else part.lower()
        for part in re.split(r"(\d+)", s)
    ]


def read_meta() -> dict:
    """Читает topics/meta.json — красивые имена и эмодзи для тем."""
    if not META_FILE.exists():
        return {}
    try:
        with META_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except json.JSONDecodeError as e:
        print(f"⚠  meta.json — ошибка парсинга, игнорирую: {e}")
        return {}


def list_media(directory: Path, recursive: bool = False) -> list:
    """
    Возвращает отсортированный список медиафайлов в папке.
    Если recursive=False — только файлы верхнего уровня.
    """
    if not directory.exists() or not directory.is_dir():
        return []

    result = []
    for entry in directory.iterdir():
        if entry.name.startswith("."):
            continue
        if entry.is_file() and is_media(entry.name):
            result.append(entry.name)
        elif entry.is_dir() and recursive:
            # На случай вложенных подпапок — можно игнорировать,
            # но оставим возможность
            for sub in entry.iterdir():
                if sub.is_file() and is_media(sub.name):
                    result.append(str(sub.relative_to(directory)))

    result.sort(key=natural_sort_key)
    return result


# ─── Основная логика ───
def build_manifest() -> dict:
    meta = read_meta()
    topics = []

    if TOPICS_DIR.exists():
        for entry in sorted(TOPICS_DIR.iterdir()):
            if not entry.is_dir():
                continue
            if entry.name in IGNORE_FOLDERS or entry.name.startswith("."):
                continue

            memes = list_media(entry, recursive=False)
            if not memes:
                # Пустую папку пропускаем — нечего показывать
                continue

            m = meta.get(entry.name, {})
            topics.append({
                "folder": entry.name,
                "name":   m.get("name") or prettify(entry.name),
                "emoji":  m.get("emoji", ""),
                "memes":  memes,
            })

    # Мемы недели из top/
    top_files = list_media(TOP_DIR, recursive=False)

    return {
        "topics": topics,
        "top":    top_files,
    }


def write_manifest(manifest: dict) -> None:
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")  # финальный перевод строки


def main() -> int:
    if not ROOT.exists():
        print(f"❌ Папка проекта не найдена: {ROOT}")
        return 1

    try:
        manifest = build_manifest()
    except Exception as e:
        print(f"❌ Ошибка при сборке манифеста: {e}")
        return 1

    write_manifest(manifest)

    topics_count = len(manifest["topics"])
    memes_count  = sum(len(t["memes"]) for t in manifest["topics"])
    top_count    = len(manifest["top"])

    print(f"✅ manifest.json обновлён")
    print(f"   📁 Тем: {topics_count}")
    print(f"   🖼  Мемов в темах: {memes_count}")
    print(f"   🔥 Мемов недели (top/): {top_count}")
    print(f"   💾 Файл: {OUT_FILE.relative_to(ROOT)}")

    for t in manifest["topics"]:
        prefix = (t["emoji"] + " ") if t["emoji"] else ""
        print(f"      • {prefix}{t['name']} ({t['folder']}) — {len(t['memes'])} шт.")

    return 0


if __name__ == "__main__":
    sys.exit(main())