 # CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Active development — Designer portfolio homepage.

## Stack

- **HTML + Tailwind CSS** (CDN, no build step required)
- **Google Fonts**: Archivo (headings) + Space Grotesk (body)
- **Vanilla JS**: Intersection Observer for scroll-reveal, nav glass effect

## Files

- `index.html` — Single-page portfolio (Hero → About → Works → Contact)
- `design-system/designer-portfolio/MASTER.md` — Design system source of truth

## Design Tokens

| Token | Value |
|---|---|
| Background | `#09090F` |
| Surface | `#12121A` |
| Accent | `#A78BFA` (violet-400) |
| Accent dark | `#7C3AED` (violet-600) |
| Text | `#EDEDF5` |
| Muted | `#9CA3AF` |
| Font heading | Archivo |
| Font body | Space Grotesk |

## Customization Checklist

- [ ] Replace `YOUR.NAME` with real name
- [ ] Add real photo in Hero (replace placeholder div with `<img src="photo.jpg" ...>`)
- [ ] Update bio text in About section
- [ ] Update stats (years, projects, clients)
- [ ] Replace project card placeholder divs with `<img>` tags and real project names
- [ ] Update `mailto:your@email.com` with real email
- [ ] Update social links (GitHub, Behance, LinkedIn, Dribbble)
- [ ] Update copyright name and year in Footer
