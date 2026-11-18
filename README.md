# Minimal Frost

A quiet, frosted layout for [Herdr](https://herdr.dev). One grey glass tint across the whole window, no dividing lines, clear terminals over the blurred desktop, softly rounded panes and popups, Geist Mono and a Ghostty-derived terminal palette.

![Minimal Frost](preview.png)

## Install

Copy into your Herdr home (`~/.config/herdr-app`), renaming anything whose name you already use:

- `layouts/minimal-frost.json` and `layouts/minimal-frost.png` → `layouts/`
- `themes/minimal-frost.json` → `themes/`
- `mods/frost-*` → `mods/`
- merge `keys.json` into your own `keys.json` (adds ⌘P → rounded picker for this layout only)

Then:

```sh
for m in ~/.config/herdr-app/mods/frost-*; do herdr-app check "$m"; done
herdr-app do layout.switch '{"name":"minimal-frost"}'
```

`ctrl-shift-l` switches back to your previous layout.

## Notes

- Built for macOS: the glass relies on window blur and the UI font is SF Pro Text.
- The `frost-spaces`, `frost-menu` and `frost-picker` mods run `git` and `hc` locally, the same as the Herdr mods they're copied from. No network access.
- [RECIPE.md](RECIPE.md) describes the layout in full, for rebuilding it from scratch.

## License

The mods are modified copies of Herdr's own mods and are distributed under the Apache License 2.0 (see [LICENSE](LICENSE) and [NOTICE](NOTICE)).
