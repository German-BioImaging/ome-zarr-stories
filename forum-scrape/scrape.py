"""Pull every image.sc topic tagged ome-ngff / ome-zarr into cache/{id}.md.

Usage: .venv/bin/python scrape.py
First run opens a browser: log in, then press Enter here. Session is kept in state.json.
Re-runs skip topics already cached.
Extra untagged topics: .venv/bin/python scrape.py 123098 57400 ...
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "https://forum.image.sc"
TAGS = ["ome-ngff", "ome-zarr"]
DELAY = 1.5  # ponytail: fixed delay; raise if the forum complains
HERE = Path(__file__).parent
CACHE, STATE, INDEX = HERE / "cache", HERE / "state.json", HERE / "index.tsv"


def get(page, path):
    for _ in range(3):
        status, text = page.evaluate(
            "async p => { const r = await fetch(p, {credentials: 'include'}); return [r.status, await r.text()]; }",
            path,
        )
        time.sleep(DELAY)
        if status == 429:
            print("429, waiting 60s"); time.sleep(60); continue
        if status != 200 or "Crawler is not allowed" in text:
            sys.exit(f"Blocked or error on {path}: {status} {text[:200]}")
        return text
    sys.exit(f"Still rate-limited on {path}")


def main():
    CACHE.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(storage_state=STATE if STATE.exists() else None)
        page = ctx.new_page()
        page.goto(BASE)
        if not STATE.exists():
            input("Log in to image.sc in the browser window, then press Enter here... ")
            ctx.storage_state(path=STATE)

        if len(sys.argv) > 1:  # extra topic ids (e.g. untagged threads linked from tagged ones)
            for i in sys.argv[1:]:
                t = json.loads(get(page, f"/t/{i}.json"))
                if not (CACHE / f"{i}.md").exists():
                    (CACHE / f"{i}.md").write_text(f"# {t['title']}\n\n" + get(page, f"/raw/{i}"))
                tags = ";".join(x if isinstance(x, str) else x.get("name", "") for x in t.get("tags", []))
                with INDEX.open("a") as f:
                    f.write(f"{i}\t{t['title']}\t{tags}\t{t['created_at']}\t{t['posts_count']}\t{BASE}/t/{t['slug']}/{i}\n")
                print("fetched", i, t["title"])
            browser.close()
            return

        topics = {}
        for tag in TAGS:
            n = 0
            while True:
                d = json.loads(get(page, f"/tag/{tag}.json?page={n}"))
                batch = d["topic_list"]["topics"]
                for t in batch:
                    topics.setdefault(t["id"], {**t, "found_in": []})["found_in"].append(tag)
                print(f"{tag} page {n}: {len(batch)} topics")
                if not batch or not d["topic_list"].get("more_topics_url"):
                    break
                n += 1

        with INDEX.open("w") as f:
            f.write("id\ttitle\ttags\tcreated_at\tposts\turl\n")
            for t in sorted(topics.values(), key=lambda t: t["created_at"]):
                tags = ";".join(x if isinstance(x, str) else x.get("name", "") for x in t.get("tags", []))
                f.write(f"{t['id']}\t{t['title']}\t{tags}\t{t['created_at']}\t{t['posts_count']}\t{BASE}/t/{t['slug']}/{t['id']}\n")
        print(f"{len(topics)} topics in index.tsv")

        todo = [i for i in topics if not (CACHE / f"{i}.md").exists()]
        for k, i in enumerate(todo, 1):
            (CACHE / f"{i}.md").write_text(f"# {topics[i]['title']}\n\n" + get(page, f"/raw/{i}"))
            print(f"[{k}/{len(todo)}] {i}")
        browser.close()


if __name__ == "__main__":
    main()
