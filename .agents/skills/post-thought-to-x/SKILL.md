---
name: post-thought-to-x
description: Opens X (x.com) with a compose box prefilled from a thought under src/content/thoughts. Picks the latest thought by default or a specific one on request, converts it to tweet-ready plain text within X's limit, and opens the browser via xdg-open. When over limit, asks the user to choose optimize, summary, or thread. Use when the user wants to share/sync a thought to X/Twitter.
---

# post-thought-to-x

Share a thought from `src/content/thoughts` as an X post. No API keys — this opens **x.com/intent/tweet** in the default browser with the text prefilled; the user reviews and hits Post themselves.

## Workflow

1. **Pick the thought**
   - Default: the file with the lexicographically greatest `YYYY-MM-DD` prefix in `src/content/thoughts/` (i.e. the most recent).
   - If the user names one (date, slug, or phrase), find that file instead.

2. **Build the tweet text** from the body only (ignore frontmatter):
   - Strip YAML frontmatter, markdown headings, images (`![...](...)`), and footnote syntax.
   - Convert links to bare URLs; drop local/site-relative links entirely.
   - Keep the author's wording — do not rewrite, summarize, or add commentary yet.
   - Do **not** append a site/source link (e.g. `https://yuler.dev/thoughts`).

3. **Check length (X weighted limit)**
   - X counts most CJK / fullwidth characters as **2**, Latin/ASCII as **1**, each URL as **23**. Target **≤ 280** weighted.
   - Measure with Python before opening, e.g.:

     ```bash
     python3 -c '
     import re, sys
     s = sys.argv[1]
     w = 0
     for m in re.finditer(r"https?://\S+|.", s):
         t = m.group(0)
         if t.startswith("http"):
             w += 23
         else:
             o = ord(t)
             w += 2 if (0x1100 <= o <= 0x11FF or 0x2E80 <= o <= 0x9FFF
                        or 0xAC00 <= o <= 0xD7AF or 0xF900 <= o <= 0xFAFF
                        or 0xFF00 <= o <= 0xFFEF) else 1
     print(w)
     ' "$TWEET_TEXT"
     ```

   - If **within limit**: open directly (step 5).
   - If **over**: do **not** silently truncate. Ask the user to pick one option (show the overage, e.g. "加权 ~355 / 280"):

     | Option | What you do |
     |--------|-------------|
     | **优化** | Tighten wording in the author's voice — cut filler, keep facts and punchline. Stay as close as possible to their phrasing. Aim just under 280 weighted. |
     | **摘要** | Write a short summary that covers the core point + punchline; details can go in a reply. Still ≤ 280 weighted. |
     | **Thread** | Split into 2+ posts that read as a thread. Each part ≤ 280 weighted. Number them `1/n`, `2/n`, … |

   - After they choose, show the draft(s) and open only when they confirm (or say "打开").
   - If they paste their own rewrite that is still over, re-offer the three options (or tighten further on request).

4. **Thread open flow** (only if they chose Thread)
   - Open part `1/n` first via `xdg-open`.
   - Tell them to Post it, then say when ready for the next part (or open the next after they confirm).
   - Do not open all parts at once — each intent URL is a separate compose window.

5. **Open X**

   ```bash
   xdg-open "https://x.com/intent/tweet?text=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$TWEET_TEXT")"
   ```

   - URL-encode properly (newlines, `&`, `#`, CJK all must be encoded). Python is only for encoding; `xdg-open` opens the browser.

6. **Report back**: show the final tweet text (or each thread part) and say that the compose window is open for review.

## Notes

- Images in the thought cannot be attached via intent URLs — mention this if the thought has `images` frontmatter.
- Do not attempt browser automation or API posting; the intent-URL + manual review flow is intentional.
- The skill never edits the thought file itself (use `create-thought` for that).
- Never mid-sentence cut with "..." unless truncating a quote the author already had.
