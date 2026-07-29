#!/usr/bin/env python3
import json
import re
import sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool_input = data.get("tool_input", {}) or {}
file_path = tool_input.get("file_path", "") or ""

if "/src/" not in file_path:
    sys.exit(0)

text = tool_input.get("new_string")
if text is None:
    text = tool_input.get("content")
if not text:
    sys.exit(0)

flagged = []
for line in text.splitlines():
    s = line.strip()
    if not s:
        continue
    if s.startswith(("//", "/*", "*/", "{/*")) or s.startswith("* "):
        flagged.append(s)
    elif re.search(r"(?<!:)//", line) and not re.search(r"https?://", line):
        flagged.append(s)
    elif "/*" in line:
        flagged.append(s)

if not flagged:
    sys.exit(0)

lines = "\n".join(f"  {c}" for c in flagged)
sys.stderr.write(
    "Comment(s) added to "
    + file_path
    + ". Per the no-flavor-comments rule, justify each as genuinely "
    "disambiguating non-obvious code, or remove it:\n" + lines + "\n"
)
sys.exit(2)
