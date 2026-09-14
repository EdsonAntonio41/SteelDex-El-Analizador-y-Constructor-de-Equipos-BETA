#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/update-meta-teams.py
Generates meta/teams.json for SteelDex from external, public VGC sources.

Pipeline (each step is kept isolated so a failure degrades gracefully):
  1. fetch    -> pull teams + teamlists from Pikalytics (AI markdown) and
                 stats from PokeKit open data (Smogon-backed).
  2. normalize -> shape everything into SteelDex's PRESET_TEAMS-like format.
  3. validate  -> drop entries without minimum required data.
  4. dedupe    -> remove identical teams (species/item/ability/moves/tera).
  5. emit      -> write meta/teams.json (only when real data was gathered).

The script NEVER invents complete teams from usage statistics. Stats from
PokeKit are stored separately (metaStats) and are never merged into teams.

Sources are accessed through stable public endpoints, no login, no scraping
of protected pages. If a source is unavailable the remaining ones still work.
"""

import html as html_mod
import json
import os
import re
import sys
import time
import urllib.request
from urllib.error import URLError, HTTPError

# --------------------------------------------------------------------------
# Configuration (overridable via environment variables)
# --------------------------------------------------------------------------

# Pikalytics "AI" markdown endpoints. These are the tournament top-teams of the
# current VGC season. Each team links to its full public teamlist on Limitless.
DEFAULT_FORMATS = os.environ.get("PIKALYTICS_FORMATS", "championstournaments").split(",")

MAX_TEAMS_PER_FORMAT = int(os.environ.get("MAX_TEAMS", "60"))

REGULATION_OVERRIDE = os.environ.get("REGULATION", "").strip()

# PokeKit open data (Smogon-backed) for current meta usage statistics.
POKEKIT_STATS_URL = os.environ.get(
    "POKEKIT_STATS_URL", "https://poke.itlibra.com/opendata/usage-champions.json"
)

SCRAPE_POKEKIT = os.environ.get("SCRAPE_POKEKIT", "1") == "1"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_PATH = os.path.join(REPO_ROOT, "meta", "teams.json")

BASE_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteelDexMetaUpdater/1.0"


def log(msg):
    print(msg, flush=True)


def http_get(url, timeout=15, max_bytes=None):
    """Fetch a URL and return its decoded text (or None on any failure)."""
    req = urllib.request.Request(url, headers={"User-Agent": BASE_USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(max_bytes) if max_bytes else resp.read()
        return raw.decode("utf-8", errors="replace")
    except (URLError, HTTPError, OSError, ValueError) as exc:
        log(f"  [warn] request failed {url}: {exc}")
        return None


# --------------------------------------------------------------------------
# Name normalization helpers
# --------------------------------------------------------------------------

CANON_TABLE = {
    "floetteeternalmega": "floetteeternalmega",
    "raichumegay": "raichumegay",
    "raichumegax": "raichumegax",
    "gengar-mega": "gengarmega",
    "meowscarada": "meowscarada",
    "golispodmega": "golisopodmega",
}


def canon(name):
    """Lowercased alphanumeric key used for deduplication / matching."""
    if not name:
        return ""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def species_canon(name):
    """Canonical species key that matches SteelDex's POKEDEX key convention."""
    key = canon(name)
    if key in CANON_TABLE:
        return CANON_TABLE[key]
    # Handle "Meganium-Mega" (base form + mega) vs forms like "Raichu-Mega-Y".
    return key


# --------------------------------------------------------------------------
# Fetch: Pikalytics top-teams pages (markdown)
# --------------------------------------------------------------------------

PIKA_TEAM_URL = "https://www.pikalytics.com/ai/topteams/{fmt}"
PIKA_TEAM_URL_ALT = "https://www.pikalytics.com/ai/top-teams/{fmt}"


def parse_team_table(md):
    """Parse the 'Top Teams Table' markdown into team dicts."""
    rows = []
    in_table = False
    for line in md.splitlines():
        if line.strip().startswith("## Top Teams Table"):
            in_table = True
            continue
        if in_table:
            if other_table_heading(line):
                break
            cells = parse_table_row(line)
            # Tournament names may contain '|', so only rank/author/record and
            # the trailing archetypes/pokemon cells are positional.
            if cells and len(cells) >= 6 and cells[0].strip().isdigit():
                rank_raw = cells[0].strip()
                author = cells[1].strip()
                record = cells[2].strip()
                archetypes = cells[-2].strip()
                pokemon_raw = cells[-1].strip()
                event = "|".join(cells[3:-2]).strip()
                rows.append((rank_raw, author, record, event, archetypes, pokemon_raw))

    teams = []
    for rank_raw, author, record, event, archetypes, pokemon_raw in rows:
        try:
            placement = int(re.sub(r"[^\d]", "", rank_raw))
        except ValueError:
            placement = None
        teams.append(
            {
                "source": "pikalytics/topteams",
                "placement": placement,
                "creator": author,
                "record": record,
                "event": clean_md(event.replace("|", " · ")),
                "tags": [t.strip().lower() for t in archetypes.split(",") if t.strip().lower() != "none"],
                "pokemon": [clean_md(p) for p in pokemon_raw.split(",") if p.strip()],
            }
        )
    return teams


def parse_source_links(md):
    """Parse '- **Team N**: [author](url)' lines."""
    links = {}
    for m in re.finditer(r"-\s+\*\*Team\s+(\d+)\*\*:\s*\[([^\]]*)\]\(([^)]+)\)", md):
        links[int(m.group(1))] = m.group(3).strip()
    return links


def parse_table_row(line):
    if not line.strip().startswith("|"):
        return None
    stripped = line.strip().strip("|")
    return [c.strip() for c in stripped.split("|")]


def other_table_heading(line):
    return line.strip().startswith("## ") and "Top Teams Table" not in line


def clean_md(text):
    """Strip markdown emphasis and emoji noise from a cell."""
    text = re.sub(r"[*`_]", "", text).strip()
    return text


def parse_topteams_markdown(md):
    """Extract teams plus their teamlist URLs from a Pikalytics top-teams page."""
    teams = parse_team_table(md)
    if not teams:
        return []
    links = parse_source_links(md)
    for idx, team in enumerate(teams, start=1):
        team["sourceUrl"] = links.get(idx)
    return teams


# --------------------------------------------------------------------------
# Fetch: Limitless teamlist pages (full pokemon sets)
# --------------------------------------------------------------------------

def parse_teamlists_block(text):
    """Parse a Limitless teamlist page into pokemon sets.

    Limitless teamlists render sets as repeated `<div class="pkmn">` blocks with
    clean, non-protected markup. A generic text fallback keeps the pipeline
    working even if a page changes its markup.
    """
    if not text:
        return []

    mons = []
    parts = text.split('<div class="pkmn">')
    if len(parts) > 1:
        for part in parts[1:]:
            chunk = part.split('<div class="pkmn">')[0]
            name_m = re.search(r"<span>(.*?)</span>", chunk, re.S)
            if not name_m:
                continue
            species = _unescape(name_m.group(1))
            if not species or len(species) > 40:
                continue
            item = re.search(r'class="item">(.*?)</div>', chunk, re.S)
            ability = re.search(r'class="ability">(?:\s*Ability:\s*)?(.*?)</div>', chunk, re.S)
            nature = re.search(r'class="nature">(.*?)</div>', chunk, re.S)
            moves = [_unescape(m) for m in re.findall(r"<li>(.*?)</li>", chunk, re.S)]
            mons.append(
                {
                    "species": species,
                    "item": _unescape(item.group(1)) if item else None,
                    "ability": _unescape(ability.group(1)) if ability else None,
                    "nature": _unescape(nature.group(1)) if nature else None,
                    "moves": [m for m in moves if m][:4],
                }
            )
        if len(mons) >= 4:
            return mons

    return parse_teamlists_block_generic(text)


def _unescape(text):
    text = clean_md(html_mod.unescape(text or ""))
    return text.strip() or None


def parse_teamlists_block_generic(text):
    """Fragile-but-robust fallback: strip tags and detect pokemon blocks."""
    text = re.sub(r"<script.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "\n", text)
    text = html_mod.unescape(text).replace("&nbsp;", " ")
    blocks = re.split(r"\n\s*\n+", text)

    mons = []
    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        first = lines[0]
        if first.lower().startswith("copy to clipboard") or len(first) > 60:
            continue
        if first.startswith("http") or first.startswith("img") or first.startswith("!("):
            continue

        species = first
        item = None
        ability = None
        nature = None
        moves = []
        seen_ability = False
        for idx, raw in enumerate(lines[1:]):
            low = raw.lower()
            if low.startswith("ability:") or low.startswith("habilidad:"):
                ability = raw.split(":", 1)[1].strip()
                seen_ability = True
            elif "nature" in low or "naturaleza" in low:
                nature = re.sub(r"nature|naturaleza", "", raw, flags=re.IGNORECASE).strip("-: ")
            elif not item and not seen_ability and idx < 4 and not raw.startswith("-") and not raw.startswith("("):
                item = raw
            elif not raw.startswith("(") and not raw.startswith(")"):
                moves.append(raw.lstrip("- ").strip())

        # Drop non-pokemon blocks (nav, standings, players, etc.).
        if not moves and not ability and not nature and not item:
            continue

        mons.append(
            {
                "species": species,
                "item": item,
                "ability": ability,
                "nature": nature,
                "moves": [m for m in moves if m][:4],
            }
        )
    return mons


# --------------------------------------------------------------------------
# Fetch: PokeKit open-data stats (metaStats only, never teams)
# --------------------------------------------------------------------------

def fetch_pokekit_stats():
    """Best effort: pull current usage stats. Returns dict or None."""
    if not SCRAPE_POKEKIT:
        return None
    raw = http_get(POKEKIT_STATS_URL, timeout=30, max_bytes=12 * 1024 * 1024)
    if not raw:
        log("  [warn] PokéKit stats unavailable, skipping metaStats")
        return None
    try:
        data = json.loads(raw)
    except ValueError:
        log("  [warn] PokéKit stats invalid JSON, skipping metaStats")
        return None

    if isinstance(data, dict):
        data = data.get("data", data.get("pokemon", []))
    if not isinstance(data, list):
        return None

    def pick(obj):
        name = obj.get("name") or obj.get("pokemon_name") or ""
        usage = obj.get("usage_pct") or obj.get("usage") or obj.get("percent")
        return {
            "pokemon": clean_md(name),
            "usage": float(usage) if _to_float(usage) is not None else None,
            "moves": _top_list(obj.get("moves")),
            "items": _top_list(obj.get("items")),
            "abilities": _top_list(obj.get("abilities")),
            "tera": _top_list(obj.get("tera")),
            "teammates": _top_list(obj.get("teammates")),
        }

    stats = []
    for item in data:
        if not isinstance(item, dict):
            continue
        stats.append(pick(item))
        if len(stats) >= 20:
            break
    if not stats:
        return None
    return {"source": "pokekit/smogon", "top": stats}


def _to_float(val):
    try:
        return float(str(val).replace("%", "").strip())
    except (TypeError, ValueError):
        return None


def _top_list(val):
    """PokeKit uses an 'id:%' bar-separated string like 'move1:74,move2:60'."""
    if not val:
        return []
    if isinstance(val, list):
        out = []
        for entry in val[:8]:
            if isinstance(entry, dict):
                out.append({"name": clean_md(entry.get("id") or entry.get("name") or ""),
                            "usage": _to_float(entry.get("pct") or entry.get("percent") or entry.get("usage"))})
            else:
                out.append({"name": clean_md(str(entry)), "usage": None})
        return out
    try:
        parts = str(val).split("|")
    except (TypeError, ValueError):
        return []
    out = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        name, sep, pct = part.rpartition(":")
        if not sep:
            name, pct = part, None
        out.append({"name": clean_md(name), "usage": _to_float(pct)})
    return out


# --------------------------------------------------------------------------
# Normalization
# --------------------------------------------------------------------------

def to_showdown_paste(team):
    """Serialize a team into Pokemon Showdown export format (pokepasteText)."""
    lines = []
    for ser in team.get("details", []):
        name = ser.get("species") or "Pokemon"
        line = name
        if ser.get("item"):
            line += " @ " + ser["item"]
        lines.append(line)
        if ser.get("ability"):
            lines.append("Ability: " + ser["ability"])
        nature = re.sub(r"\s*(nature|naturaleza)$", "", (ser.get("nature") or ""), flags=re.IGNORECASE).strip()
        if nature:
            lines.append(nature + " Nature")
        for mv in ser.get("moves", []):
            if mv:
                lines.append("- " + mv)
        lines.append("")
    return "\n".join(lines).strip()


def fingerprint_team(team):
    """Order-independent fingerprint for duplicate detection."""
    slots = []
    for i, name in enumerate(team.get("pokemon", [])):
        ser = team.get("details", [{}])[i] if i < len(team.get("details", [])) else {}
        slots.append(
            (
                species_canon(ser.get("species") or name),
                canon(ser.get("item")),
                canon(ser.get("ability")),
                canon(ser.get("teraType")),
                tuple(sorted(canon(m) for m in ser.get("moves", []))),
                canon(ser.get("nature")),
            )
        )
    slots.sort(key=lambda s: s[0])
    return json.dumps(slots)


def merge_source_refs(target, team):
    ref = {
        "source": team.get("source"),
        "sourceUrl": team.get("sourceUrl"),
        "event": team.get("event"),
        "placement": team.get("placement"),
        "record": team.get("record"),
    }
    refs = target.setdefault("sourceRefs", [])
    exists = any(r.get("sourceUrl") == ref.get("sourceUrl") and r.get("event") == ref.get("event")
                 for r in refs)
    if not exists:
        refs.append(ref)


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

def is_valid_team(team):
    pokes = team.get("pokemon", [])
    if not isinstance(pokes, list) or not (4 <= len(pokes) <= 6):
        return False
    if not all(species_canon(p) for p in pokes):
        return False
    details = team.get("details", []) or []
    if details and len(details) != len(pokes):
        return False
    for ser in details:
        if not ser.get("species"):
            return False
        moves = ser.get("moves") or []
        if len(moves) > 4:
            return False
    return True


# --------------------------------------------------------------------------
# Pipeline
# --------------------------------------------------------------------------

def normalize_team(team):
    already = dict(team)
    name = team.get("event") or team.get("creator") or "Top team"
    already["description"] = clean_md(name)
    already["source"] = team.get("source") or "pikalytics"
    already["id"] = "META-{:04d}".format(team.get("placement") or 0)
    # Teams without a parsed teamlist keep only their species lineup.
    already["details"] = already.get("details") or []
    if already["details"]:
        already["pokepasteText"] = to_showdown_paste(already)
    return already


def deduplicate(teams):
    seen = {}
    kept = []
    removed = 0
    for team in sorted(teams, key=lambda t: (t.get("placement") is None, t.get("placement") or 99)):
        fp = fingerprint_team(team)
        if fp in seen:
            known = seen[fp]
            # Prefer the entry that has full details over a species-only one.
            if team.get("details") and not known.get("details"):
                kept[kept.index(known)] = team
                seen[fp] = team
            else:
                merge_source_refs(known, team)
                removed += 1
        else:
            seen[fp] = team
            kept.append(team)
    return kept, removed


def main():
    log("=== SteelDex meta/teams.json updater ===")

    all_teams = []
    sources = []

    # --- 1. Pikalytics top-teams ----------------------------------------
    for fmt in DEFAULT_FORMATS:
        fmt = fmt.strip()
        if not fmt:
            continue
        log(f"Fetching source: Pikalytics top-teams/{fmt}")
        md = http_get(PIKA_TEAM_URL.format(fmt=fmt)) or http_get(PIKA_TEAM_URL_ALT.format(fmt=fmt))
        if not md:
            log(f"  [warn] could not fetch format '{fmt}'")
            continue
        teams = parse_topteams_markdown(md)
        log(f"  Found {len(teams)} candidates")
        # Parse each team's public teamlist (full pokemon sets).
        for team in teams[:MAX_TEAMS_PER_FORMAT]:
            url = team.get("sourceUrl")
            if not url or not url.startswith("http"):
                continue
            html = http_get(url, timeout=15)
            if html:
                mons = parse_teamlists_block(html)
                if len(mons) >= 4:
                    pokes = team.get("pokemon", [])
                    details = []
                    # Trust order: teamlist blocks are in the same order as the
                    # top-teams table. Fall back to the table name per slot.
                    for i in range(max(len(pokes), len(mons))):
                        poke_name = pokes[i] if i < len(pokes) else (mons[i].get("species") or "")
                        mon = mons[i] if i < len(mons) else {}
                        details.append(
                            {
                                "species": poke_name or mon.get("species"),
                                "item": mon.get("item"),
                                "ability": mon.get("ability"),
                                "nature": mon.get("nature"),
                                "moves": mon.get("moves", []),
                            }
                        )
                    team["details"] = details[:6]
            time.sleep(0.15)
        all_teams.extend(teams)
        sources.append(f"pikalytics/{fmt}")

    log(f"Found {len(all_teams)} teams")

    # --- 2. Stats (never teams) ------------------------------------------
    meta_stats = fetch_pokekit_stats()
    if meta_stats:
        sources.append("pokekit/smogon")

    # --- 3. Normalize + validate + dedupe --------------------------------
    normalized = [normalize_team(t) for t in all_teams]
    valid = [t for t in normalized if is_valid_team(t)]
    log(f"Normalized {len(normalized)} teams, validated {len(valid)}")
    teams, removed = deduplicate(valid)
    log(f"Removed {removed} duplicates -> {len(teams)} unique teams")

    if not teams:
        log("[error] no usable data fetched; NOT overwriting current meta/teams.json")
        sys.exit(1)

    regulation = REGULATION_OVERRIDE or detect_regulation(all_teams)

    payload = {
        "schema": "steeldex-meta-teams",
        "version": 1,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "regulation": regulation,
        "sources": sorted(set(sources)),
        "teams": teams,
        "metaStats": meta_stats,
    }

    # --- 4. Write file -----------------------------------------------------
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    log(f"Writing meta/teams.json ({os.path.getsize(OUTPUT_PATH)} bytes, {len(teams)} teams)")
    log("Done. The Git workflow will skip the commit if there are no changes.")


def detect_regulation(teams):
    """Best effort: derive the regulation from the tournament names."""
    for t in teams:
        m = re.search(r"Reg(?:ulation)?[- ]?[A-Za-z0-9]*", t.get("event") or "", re.IGNORECASE)
        if m:
            return clean_md(m.group(0))
    return ""


if __name__ == "__main__":
    main()