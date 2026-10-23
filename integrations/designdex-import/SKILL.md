---
name: designdex-import
description: Scan the design-related agent skills installed for Claude Code and Codex, and write a DesignDex import file (designdex-import.json) that the DesignDex app can load. Use when the user says "DesignDex に取り込んで", "import my skills into DesignDex", or pastes the import prompt copied from the DesignDex app.
---

# DesignDex import

DesignDex is a dictionary app of UI, motion, color and type names with ready-to-paste prompts. This skill turns the
user's installed design skills into DesignDex entries and writes one JSON file. The user then opens that file from
DesignDex (Settings → Import your skills). Nothing is sent anywhere; you only read local skill files and write one file.

## Steps

1. Find installed skills. Look in these folders and read each `SKILL.md` (skip folders that do not exist):
   - `~/.claude/skills/*/SKILL.md` (Claude Code, personal)
   - `~/.agents/skills/*/SKILL.md` and `~/.codex/skills/*/SKILL.md` (Codex, personal)
   - `.claude/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md` in the current project, if any
2. Keep only skills about UI, motion/animation, color, typography or visual design. Skip everything else
   (deploy, git, docs, data, writing, etc.). Also skip the skill ids listed under "Already included in DesignDex"
   in the prompt: DesignDex ships with them and would ignore them. A skill that only fetches its rules from a URL
   and names no techniques itself has nothing to import; skip it too. If none are found, write the file with an empty `sources` list and tell the user.
3. For each kept skill, pick the named techniques, components or patterns the skill actually teaches
   (for example "Spring animation", "Bottom sheet", "Skeleton loading"). Do not invent names that are not in the skill.
   Aim for 3 to 30 entries per skill.
4. Write `~/Downloads/designdex-import.json` (create `~/Downloads` if missing; if a file already exists, overwrite it)
   in exactly the format below, then tell the user the file path and how many entries you wrote, and ask them to open
   DesignDex → Settings → Import your skills → choose the file.

## File format

```json
{
  "format": "designdex-import@1",
  "generated_at": "2026-01-31",
  "sources": [
    {
      "source": { "id": "<skill folder name>", "type": "skill", "name": "<display name>", "ref": "<path to SKILL.md, e.g. ~/.claude/skills/x/SKILL.md>" },
      "entries": [
        {
          "id": "<skill id>/<lowercase-kebab-name>",
          "kind": "motion | ui | type",
          "category": "<one category id from the list given in the prompt, matching kind>",
          "name_en": "<official English name, used in prompts>",
          "name_ja": "<short Japanese name that evokes the look>",
          "description_ja": "<1-2 sentences in Japanese describing how it looks or moves>",
          "aliases": ["<3-6 vague words a person might use, Japanese or English>"],
          "preview": { "demo": "<one demo id from the list given in the prompt>" },
          "source_ref": "<which skill and which section, one sentence>",
          "ref_url": "<an https URL of official documentation for this technique>",
          "prompt": "<4 lines, see below>"
        }
      ]
    }
  ]
}
```

Rules:
- `id` values must be unique. Use only lowercase letters, digits and hyphens after the slash.
- `kind` and `category` must match (a `motion` entry needs a motion category).
- `preview.demo` must be one of the demo ids in the prompt. Pick the closest one. Do not add `image` previews.
- `ref_url` must start with `https://` and point to real official documentation (MDN, Apple, Material, the library's site).
  If you are not sure a URL exists, use the skill's own homepage or `https://developer.mozilla.org/`.
- `prompt` is four lines, separated by `\n`:
  `【出典】<source_ref>／<ref_url>`
  `【作るもの】<name_en>（<name_ja>）`
  `【再現する見た目・動き】<concrete values from the skill: durations, easing, sizes>`
  `【指示】〈使う場所〉に<name_en>を入れて。<one sentence on what to follow from the source>`
- No emoji. Summarize; do not copy long passages from the skill.
