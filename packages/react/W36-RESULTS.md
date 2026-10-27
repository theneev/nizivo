# Week 36 results (v0.4 begins: the AI kit)

Recorded on 2026-10-28, overnight, under M77 (ARCHITECTURE.md §21.3 "Week 36 status", §21.4a,
§23.3 M77, §23.4 D-dn). Every number below comes from a command run on the maintainer's Mac.
Everything is under `@nizivo/react/unstable/<name>`, out of the root barrel and `styles.css`, and
nobody has reviewed it yet.

## What was built

Figma's AI page (7409:7), in four batches, each with its changeset (`@nizivo/react` minor):

| Batch | Parts                                                                              | Changeset                |
| ----- | ---------------------------------------------------------------------------------- | ------------------------ |
| 1     | AiBadge, ThinkingIndicator, Citation, SourceCard, SuggestionChip/Group, UsageMeter | `ai-kit-server-parts.md` |
| 2     | ToolCallCard, ResponseBlock, FeedbackBar, ApprovalCard                             | `ai-kit-agent-parts.md`  |
| 3     | ModelSelector, InlineAssist, VoiceOrb                                              | `ai-kit-controls.md`     |
| 4     | ChatMessage and ChatLog, PromptComposer, AiWelcome                                 | `ai-kit-conversation.md` |

- **Server parts** (no client JavaScript): AiBadge, ThinkingIndicator, Citation, SourceCard,
  SuggestionChip and SuggestionGroup, UsageMeter, ToolCallCard, ResponseBlock, VoiceOrb (an
  IconButtonStatic, so no tooltip chain), ChatMessage and ChatLog, AiWelcome.
- **Client parts:** FeedbackBar (IconButton votes and a ChipGroup of reasons), ApprovalCard,
  ModelSelector (on Select), InlineAssist (its own roving focus), PromptComposer.
- **Screen readers:** ResponseBlock's answer is one polite live region that is `aria-busy` while
  it streams, in the DOM before the first word, so it is read once; ToolCallCard reads each step's
  status after its label; ChatLog is `role="log"`; FeedbackBar's thanks and VoiceOrb's state are
  polite live regions; ModelSelector's trigger is named "Balanced Model" (React Aria puts the value
  first), so its visible text is in its name.
- **Figma's Glow Orb** is a WebGPU shader. Shaders stay with `@nizivo/lab` (§14.5, after 1.0), so
  VoiceOrb and AiWelcome draw the orb with CSS gradients, and `orb` takes a shader or a picture in
  its place.
- **Glyphs** (Lucide, ISC; THIRD_PARTY_NOTICES lists 26): sparkles, globe, file-text, thumbs-up,
  thumbs-down, wand-sparkles, circle-stop, refresh-cw, mic; circle-alert and arrow-up are
  Feather-derived and join the Feather paragraph.
- **Tooling:** the docs show an example that passes an inline event handler as source only (the
  docs render examples as Server Components, which cannot hand a function to a client part); an
  unstable part's example may import another unstable part (`../<name>/index`), in the docs and
  the visual lane; the docs smoke lists the AI pages' client modules.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). New entries at measured + 10 %; two existing limits
raised under M77.

| Entry                        | Measured | Limit                            |
| ---------------------------- | -------: | -------------------------------- |
| `./locales/en-US`            |  1,437 B | 1.6 KiB (from 1, M77)            |
| `css/base.css`               |  1,444 B | 1.6 KiB (from 1.4, M77)          |
| `./unstable/response-block`  |  2,323 B | 2.5 KiB                          |
| `./unstable/tool-call-card`  |  1,635 B | 1.8 KiB                          |
| `./unstable/approval-card`   |  2,096 B | 2.3 KiB                          |
| `./unstable/feedback-bar`    | 19,656 B | 21.2 KiB (IconButton, ChipGroup) |
| `./unstable/model-selector`  | 63,730 B | 69 KiB (Select and React Aria)   |
| `./unstable/inline-assist`   |  1,690 B | 1.9 KiB                          |
| `./unstable/voice-orb`       |  1,889 B | 2.1 KiB                          |
| `./unstable/chat-message`    |  1,339 B | 1.5 KiB                          |
| `./unstable/prompt-composer` |  1,525 B | 1.7 KiB                          |
| `./unstable/ai-welcome`      |    876 B | 1 KiB                            |

## Checks

- `pnpm check` passes after each batch, and `pnpm gate` passed on each batch's commits.
- Browser specs (`test/browser/ai-kit.spec.tsx`, `ai-kit-controls.spec.tsx`,
  `ai-kit-conversation.spec.tsx`): 21 cases, all passing in Chromium, Firefox and WebKit. Where
  WebKit on macOS does not focus a clicked button or Tab to one (the known failure class), the case
  focuses it directly, as the PasswordInput spec does.
- ModelSelector's hydration check leaves out two of Select's own React Aria changes after
  hydration (`title=""` on the hidden `<select>`, and the trigger's `aria-describedby` to absent
  description slots); everything else hydrates unchanged.
- The visual lane: 516 new baselines across the 18 parts, identical on two reruns each; no
  existing baseline moved.

## For the maintainer

1. **Nothing is pushed.** `v03-post` (4 commits) and `v04-ai` on top of it, both gated.
2. **M77 decisions to review:** the two limit raises above; ApprovalCard's `autoFocus` default
   (Figma's "Focus lands on Cancel"); ResponseBlock's Stop and Retry always shown (Figma draws
   them; the docs' Server Components cannot pass a handler, so the examples pass none); the
   "source only" rule for examples with inline handlers.
3. **Lime:** Figma keeps the accent for AI only, while Button has had an `accent` variant since
   v0.1; left as it is (public API).
4. **Figma provenance:** Chat Message (7396:26) and Prompt Composer (7396:83) live on the 14
   Product Patterns page, not the AI page; built from those masters.
5. **Dayitava:** the AI parts are unreviewed. Worth a look: FeedbackBar's reasons wrap under the
   votes when they do not fit the row; ModelSelector keeps Select's brand-subtle selected row
   (M36) where Figma's Model Menu shows the hover fill; ChatMessage's meta line uses
   text/secondary where Figma draws text/tertiary (AA).
6. **Not built: the AI assistant panel** (7411:607). It is a pattern, so a registry item people
   copy; it would copy code built on `unstable/` subpaths, which may change in a minor, and need
   their stylesheets, which `init`'s `styles.css` does not carry. It waits until the AI parts are
   promoted (an M77 call; say if you want it sooner, as a docs page rather than a registry item).
