# Claude skills — install list

156 skills from 11 sources. Run these on the other machine in a terminal
(Git Bash on Windows). Requires Node.js; `-g` installs them for the whole user,
not one project.

## 1. Install everything (copy this whole block)

```bash
npx skills add anthropics/skills -g
npx skills add addyosmani/agent-skills -g
npx skills add mattpocock/skills -g
npx skills add JuliusBrussee/caveman -g
npx skills add nextlevelbuilder/ui-ux-pro-max-skill -g
npx skills add DietrichGebert/ponytail -g
npx skills add multica-ai/andrej-karpathy-skills -g
npx skills add Graphify-Labs/graphify -g
npx skills add Leonxlnx/taste-skill -g
git clone https://github.com/wheresryan22/anatomy.git ~/.claude/skills/anatomy
```

Then install **Claude SEO** by following its README (it needs a Python setup):
https://github.com/AgriciDaniel/claude-seo

## 2. What each source gives you

| Source | Skills | What's in it |
|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) | 20 | docx, pdf, pptx, xlsx, skill-creator, frontend-design, mcp-builder, claude-api, canvas-design, webapp-testing |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 25 | TDD, code review, debugging, security, performance, CI/CD, shipping, spec-driven development |
| [mattpocock/skills](https://github.com/mattpocock/skills) | 38 | grill-me, handoff, to-spec, to-tickets, triage, tdd, pr, codebase-design, domain-modeling |
| [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | 22 | caveman, surgical-patch, safe-refactor, investigate-first, verify-and-stop |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 7 | ui-ux-pro-max, design, design-system, brand, banner-design, slides, ui-styling |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | 6 | ponytail, ponytail-review, ponytail-audit, ponytail-debt |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | 1 | karpathy-guidelines |
| [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | 1 | graphify |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 1 | design-taste-frontend |
| [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) | 1 | anatomy (isometric technical figures) |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | 34 | seo, seo-audit, seo-google, seo-bing, seo-schema, seo-technical and more |

## 3. Install only some skills

Add `--skill <name>` to pick one skill from a source, for example:

```bash
npx skills add mattpocock/skills -g --skill grill-me
```

## 4. Nothing to install

- **`anthropic-skills:*`** (docs, schedule, chrome-browser…) — built into the
  Claude desktop app; another account has them automatically.
- **`exhibition-service-taxonomy`** — committed in the OneXhib repo under
  `.claude/skills/`; any Claude working in a clone of the project gets it.
- **SEO connections** (Google Search Console service account, Bing Webmaster)
  — not part of any skill; connect them again on the new machine.
