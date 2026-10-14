# TokensBrücke settings for a Nizivo token sync

Written for TokensBrücke 3.18.0. With these settings the plugin's export matches what engineering
gets from the same file with the CLI (`pnpm tokens:raw`, config in `tb.config.json` next to this
file). If the plugin shows a newer version, tell engineering so the CLI is updated to match.

## 1. Settings (once; the plugin remembers them)

Open the plugin in the Nizivo UI Library file. In the profile menu at the top, press `+` and create
a profile named `Nizivo`, then set:

| Setting                               | Value                             |
| ------------------------------------- | --------------------------------- |
| Color mode                            | **sRGB DTCG**                     |
| Include styles: Text styles           | **on** (keep the default name)    |
| Include styles: Effect styles         | **on** (keep the default name)    |
| Include styles: Grid styles           | off                               |
| Include styles: Color styles          | off                               |
| Add styles to                         | **Keep separate**                 |
| Include variable scopes               | **on**                            |
| Use percentage for opacity            | off                               |
| Expand easing presets to cubic-bezier | on                                |
| DTCG 2025.10 format                   | **on**                            |
| Include `.value` string for aliases   | off                               |
| Include Figma metadata                | **on**                            |
| Split collections into separate files | off                               |
| Split modes into separate files       | **on**                            |
| Omit collection names                 | off                               |
| Push to server                        | none (v0.1 uses the upload below) |

Do not rename the style groups: the export must contain `Typography-styles` and `Effect-styles`.

## 2. Export

1. Publish the library first, and note what you changed.
2. In the plugin, press **Download JSON**. You get `design.tokens.zip`. Unzip it.
3. The folder holds one file per collection and mode, for example `Grove Color/Light.tokens.json`,
   `Grove Color/Dark.tokens.json`, `Grove Space.tokens.json` (one-mode collections are a single
   file), plus `Typography-styles.tokens.json` and `Effect-styles.tokens.json`.
4. Delete the files of other brands before uploading: everything whose name does not start with
   `Grove` or `Nizivo`, except the two `*-styles` files (for example `Clario Tokens.tokens.json`,
   `Pipkin Soft.tokens.json`). Once those leftovers are moved out of the Figma file (handoff §2.3),
   this step goes away.

If the export stops with an error that mentions `reading 'type'`, the cause is the effect style
`Elevation/0 Flat`: it has no effects, and TokensBrücke 3.18.0 cannot export an empty effect style.
Delete that style (it draws nothing, so no layer changes) or ask engineering, then export again.

## 3. Upload and open a pull request

1. Open <https://github.com/theneev/nizivo/tree/main/packages/tokens/figma/raw>.
2. Press **Add file → Upload files**. Drag the **contents** of the unzipped folder (the files and
   the collection folders, not the folder itself) onto the page. Dragging keeps the sub-folders;
   the file picker does not, so drag. Files with the same name replace the old ones.
3. Under **Commit changes**, write a short title such as `Token sync 2026-10-20`, choose
   **Create a new branch for this commit and start a pull request**, and name the branch
   `tokens/sync-2026-10-20` (today's date).
4. Press **Propose changes**, then **Create pull request**. In the description, list what you
   changed in Figma.
5. If you renamed or deleted a collection, its old files are still in the folder. Say so in the pull
   request and engineering removes them on your branch.

CI then builds the tokens and comments on the pull request with what changed. An engineer reviews
the code side, you review the visual diff.

If GitHub says you cannot create a branch, you do not have write access yet; ask engineering.

## For engineering: known differences from the CLI export

- `createdAt` in `$extensions["tokens-bruecke-meta"]` is the export time, so it always differs.
- Until the leftovers are removed from Figma, the plugin's `Typography-styles` file also holds their
  138 text styles and the meta `variableCollections` list names their collections. The normalizer's
  `Grove`/`Nizivo` allowlist drops them; the agent snapshot never contains them.
- `Elevation/0 Flat` (no effects) is left out of the CLI input by `scripts/figma/raw.ts`, for the
  crash described above. `Surface/Glass` exports only its background blur (its drop shadow is lost)
  and `Surface/Liquid Glass` (a Figma GLASS effect) is not exported at all, in both paths.
