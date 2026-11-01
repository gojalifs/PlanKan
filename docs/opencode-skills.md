# OpenCode Skills

PlanKan uses OpenCode Agent Skills stored as `SKILL.md` files.

## Locations
OpenCode discovers skills from:
- `.opencode/skills/<name>/SKILL.md`
- `.claude/skills/<name>/SKILL.md`
- `.agents/skills/<name>/SKILL.md`

Global locations are also supported under the user's home directory.

## Current Skills
- `plan-kan`: repository-specific development guidance (`.opencode/skills/plan-kan/SKILL.md`).
- Prisma skills: CLI, client API, database setup, migrations, Postgres, Compute, driver adapters, and upgrades (`.agents/skills/`).

## Adding a Skill
1. Create one directory per skill name.
2. Add `SKILL.md` in all caps.
3. Include valid YAML frontmatter with `name` and `description`.
4. Ensure `name` matches the directory name.
5. Keep skill names unique across all locations.
6. Document the skill in this file and in `README.md` if relevant.

## Permissions
Skills can be allowed, denied, or requested per agent in `opencode.json` using pattern rules.
EOF