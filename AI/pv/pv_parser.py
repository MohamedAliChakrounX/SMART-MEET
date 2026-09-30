"""
pv_parser.py
============
Extracts a structured dict from the raw LLM response.

The LLM sometimes wraps the JSON in markdown fences or adds introductory text.
This module handles all those edge cases and provides a reliable fallback parser.
"""

import json
import re
import textwrap
from datetime import date
from typing import cast


# ── JSON extraction ────────────────────────────────────────────────────────────

def extract_json(raw_text: str) -> dict:
    """
    Try every strategy to get a valid JSON dict from the LLM response.

    Strategies (in order):
    1. Direct parse — the LLM returned clean JSON
    2. Fence extraction — strip ```json ... ``` wrapper
    3. Brace extraction — find the first { ... } block in the text
    4. Markdown fallback — parse section headers (# 1. Title, # 2. Date …)
    """
    if not raw_text or not raw_text.strip():
        return _empty_pv()

    text = raw_text.strip()

    # Strategy 1: direct parse
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return _normalise(data)
    except json.JSONDecodeError:
        pass

    # Strategy 2: extract JSON from markdown code fence
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        try:
            data = json.loads(fence_match.group(1))
            if isinstance(data, dict):
                return _normalise(data)
        except json.JSONDecodeError:
            pass

    # Strategy 3: find first { ... } block
    brace_match = re.search(r"(\{.*\})", text, re.DOTALL)
    if brace_match:
        try:
            data = json.loads(brace_match.group(1))
            if isinstance(data, dict):
                return _normalise(data)
        except json.JSONDecodeError:
            pass

    # Strategy 4: markdown section fallback
    return _parse_markdown_sections(text)


# ── Normaliser ─────────────────────────────────────────────────────────────────

def _normalise(data: dict) -> dict:
    """Ensure all expected fields exist with sensible defaults."""
    content = data.get("content", data)   # handle flat vs nested shapes

    def _list(key, default=None):
        val = content.get(key) or data.get(key) or default or []
        if isinstance(val, str):
            # LLM sometimes returns a newline-separated string instead of a list
            val = [line.strip("- •·* ") for line in val.splitlines() if line.strip()]
        return val

    def _steps(key):
        raw = content.get(key) or data.get(key) or []
        if isinstance(raw, list):
            result = []
            for item in raw:
                if isinstance(item, dict):
                    result.append({
                        "task":      item.get("task") or item.get("action") or str(item),
                        "owner":     item.get("owner") or item.get("responsible") or "TBD",
                        "due":       item.get("due") or item.get("dueDate") or "",
                        "completed": bool(item.get("completed", False)),
                    })
                elif isinstance(item, str):
                    result.append({"task": item, "owner": "TBD", "due": "", "completed": False})
            return result
        return []

    def _participants(key):
        raw = content.get(key) or data.get(key) or []
        if isinstance(raw, list):
            result = []
            for item in raw:
                if isinstance(item, dict):
                    result.append({
                        "name":      item.get("name") or "Unknown",
                        "function":  item.get("function") or item.get("role") or "Participant",
                        "signature": "",
                        "comment":   item.get("comment") or ""
                    })
                elif isinstance(item, str):
                    result.append({"name": item, "function": "Participant", "signature": "", "comment": ""})
            return result
        return []

    return {
        "title":        data.get("title") or content.get("title") or "Réunion",
        "date":         data.get("date") or content.get("date") or date.today().isoformat(),
        "location":     data.get("location") or content.get("location") or "Non mentionné",
        "type":         data.get("type") or "Interne",
        "participants": _participants("participants"),
        "content": {
            "executiveOverview": content.get("executiveOverview") or content.get("summary") or data.get("summary") or "",
            "keyDecisions":      _list("keyDecisions") or _list("points") or _list("decisions"),
            "nextSteps":         _steps("nextSteps") or _steps("actions") or _steps("actionItems"),
        }
    }


# ── Markdown fallback ──────────────────────────────────────────────────────────

def _parse_markdown_sections(text: str) -> dict:
    """
    Last-resort parser: the LLM returned markdown with '# 1. Titre' headers.
    Extracts each numbered section by looking for the next header.
    """
    def _section(number: int) -> str:
        pattern = rf"(?:^|\n)[#* \t]*{number}[.\)\-]\s+[^\n]*\n(.*?)(?=\n[#* \t]*\d+[.\)\-]|\Z)"
        m = re.search(pattern, text, re.DOTALL)
        return m.group(1).strip() if m else ""

    def _bullets(number: int) -> list:
        raw = _section(number)
        return [
            re.sub(r"^[-•*·]\s*", "", line).strip()
            for line in raw.splitlines()
            if line.strip() and re.match(r"^[-•*·]", line.strip())
        ] or [raw] if raw else []

    def _action_bullets(number: int) -> list:
        bullets = _bullets(number)
        result = []
        for b in bullets:
            # Try to parse "Task — Owner — Due date" pattern
            parts = re.split(r"\s*[–—:]\s*", b, maxsplit=2)
            result.append({
                "task":      parts[0].strip() if parts else b,
                "owner":     parts[1].strip() if len(parts) > 1 else "TBD",
                "due":       parts[2].strip() if len(parts) > 2 else "",
                "completed": False,
            })
        return result

    title_raw = _section(1).strip()
    title = title_raw.splitlines()[0] if title_raw else "Réunion"

    participants_raw = _bullets(3)
    participants = [
        {"name": p, "function": "Participant", "signature": "", "comment": ""}
        for p in participants_raw
    ]

    _exec_raw: str = _section(4).strip()
    _exec_overview: str = textwrap.shorten(_exec_raw, width=1000, placeholder="")
    return {
        "title":        title,
        "date":         _section(2).strip() or date.today().isoformat(),
        "location":     "Non mentionné",
        "type":         "Interne",
        "participants": participants,
        "content": {
            "executiveOverview": _exec_overview,
            "keyDecisions":      _bullets(5),
            "nextSteps":         _action_bullets(6),
        }
    }


# ── Empty PV ───────────────────────────────────────────────────────────────────

def _empty_pv() -> dict:
    return {
        "title":        "Réunion",
        "date":         date.today().isoformat(),
        "location":     "Non mentionné",
        "type":         "Interne",
        "participants": [],
        "content": {
            "executiveOverview": "",
            "keyDecisions":      [],
            "nextSteps":         [],
        }
    }
