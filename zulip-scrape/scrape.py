"""Pull every topic of the image.sc Zulip NGFF channel (and nothing else) into cache/.

Usage: uv run zulip-scrape/scrape.py   (or ../forum-scrape/.venv/bin/python scrape.py)
First run opens a browser: log in there; the script notices and continues. Session is kept in state.json.
Only NGFF-narrowed JSON is requested; any message not from channel 328251 aborts the run.
Re-runs skip topics whose newest message id is unchanged.
"""
import hashlib, json, re, sys, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlencode
from playwright.sync_api import sync_playwright

BASE = "https://imagesc.zulipchat.com"
CHANNEL, CHANNEL_SLUG = 328251, "328251-NGFF"
DELAY = 1.5
HERE = Path(__file__).parent
CACHE, STATE, INDEX = HERE / "cache", HERE / "state.json", HERE / "index.tsv"


def get(req, path):  # req = the browser context's request API: same cookies, no page needed
    for _ in range(3):
        r = req.get(BASE + path)
        time.sleep(DELAY)
        if r.status == 429:
            print("429, waiting 60s"); time.sleep(60); continue
        if r.status != 200:
            sys.exit(f"Error on {path}: {r.status} {r.text()[:200]} (if 401: delete state.json and log in again)")
        return r.json()
    sys.exit(f"Still rate-limited on {path}")


def topic_url(name):  # Zulip hash encoding: encodeURIComponent, then % -> .
    return f"{BASE}/#narrow/channel/{CHANNEL_SLUG}/topic/" + quote(name, safe="!*'").replace(".", "%2E").replace("%", ".")


def slug(name):
    return re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-")[:80] + "-" + hashlib.sha1(name.encode()).hexdigest()[:6]


def messages(req, topic):
    narrow = json.dumps([{"operator": "channel", "operand": CHANNEL}, {"operator": "topic", "operand": topic}])
    out, anchor = [], "oldest"
    while True:
        d = get(req, "/json/messages?" + urlencode({"narrow": narrow, "anchor": anchor, "num_before": 0,
                                                     "num_after": 1000, "apply_markdown": "false"}))
        new = [m for m in d["messages"] if not out or m["id"] > out[-1]["id"]]
        for m in new:  # guard: never keep anything outside NGFF
            if m.get("type") != "stream" or m.get("stream_id") != CHANNEL:
                sys.exit(f"Non-NGFF message {m.get('id')} returned; aborting without saving.")
        out += new
        if d.get("found_newest") or not new:
            return out
        anchor = out[-1]["id"]


def main():
    CACHE.mkdir(exist_ok=True)
    old = {}
    if INDEX.exists():
        for l in list(INDEX.open())[1:]:
            f = l.rstrip("\n").split("\t")
            old[f[0]] = f
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=STATE.exists())  # window only for the first login
        ctx = browser.new_context(storage_state=STATE if STATE.exists() else None)
        req = ctx.request
        if not STATE.exists():
            ctx.new_page().goto(BASE + "/login/")
            print("Log in to imagesc.zulipchat.com in the browser window (waiting up to 10 min)...")
            # no stdin under `!`, so poll. The topic list is public; NGFF messages need a session.
            probe = BASE + "/json/messages?" + urlencode({"narrow": json.dumps([{"operator": "channel", "operand": CHANNEL}]),
                                                          "anchor": "newest", "num_before": 0, "num_after": 0})
            for i in range(200):
                time.sleep(3)
                try:
                    status = req.get(probe).status
                except Exception as e:
                    status = type(e).__name__
                if status == 200:
                    break
                if i % 10 == 0:
                    print(f"  not logged in yet (status {status}); tabs: {[pg.url[:70] for pg in ctx.pages]}")
            else:
                sys.exit("Login not detected.")
            ctx.storage_state(path=STATE)
            for pg in ctx.pages:
                pg.close()  # close the app tab (inbox, DMs); everything below is NGFF JSON only
            print("Logged in; session saved.")

        topics = get(req, f"/json/users/me/{CHANNEL}/topics")["topics"]
        print(f"{len(topics)} NGFF topics")
        rows = []
        for k, t in enumerate(topics, 1):
            name, max_id = t["name"], str(t["max_id"])
            if name in old and old[name][5] == max_id and (CACHE / f"{slug(name)}.md").exists():
                rows.append(old[name]); continue
            ms = messages(req, name)
            when = lambda m: datetime.fromtimestamp(m["timestamp"], timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            body = "".join(f"{m['sender_full_name']} | {when(m)} | #{i}\n\n{m['content']}\n\n-------------------------\n\n"
                           for i, m in enumerate(ms, 1))
            (CACHE / f"{slug(name)}.md").write_text(f"# {name}\n\n{body}")
            rows.append([name, str(len(ms)), when(ms[0])[:10] if ms else "", when(ms[-1])[:10] if ms else "",
                         topic_url(name), max_id, slug(name)])
            print(f"[{k}/{len(topics)}] {len(ms):4d} {name}")
        browser.close()
    with INDEX.open("w") as f:
        f.write("topic\tmessages\tfirst\tlast\turl\tmax_id\tfile\n")
        for r in sorted(rows, key=lambda r: r[3], reverse=True):
            f.write("\t".join(r) + "\n")
    print(f"{len(rows)} topics in index.tsv")


if __name__ == "__main__":
    assert topic_url("multiscales: spec vs de-facto").endswith("/topic/multiscales.3A.20spec.20vs.20de-facto")
    main()
