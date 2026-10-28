// @nizivo/react/locales/en-US-unstable: the built-in strings of the unstable parts
// (`@nizivo/react/unstable/<name>`), by component (ARCHITECTURE.md §16.4, D-dr). Kept apart from
// `./locales/en-US` so that the stable catalogue, and every translation typed against it, changes
// only with the stable parts: these entries change with their parts, outside semver, and an entry
// moves to `./locales/en-US` when its part is promoted. CommandMenu and DateRangePicker shipped in
// `./locales/en-US` with 0.3.0 and stay there. The imports are types only. NO directive.
import type { AiBadgeLabels } from '../unstable/ai-badge/index';
import type { CitationLabels } from '../unstable/citation/index';
import type { SourceCardLabels } from '../unstable/source-card/index';
import type { SuggestionGroupLabels } from '../unstable/suggestion-chip/index';
import type { ThinkingIndicatorLabels } from '../unstable/thinking-indicator/index';
import type { UsageMeterLabels } from '../unstable/usage-meter/index';
import type { ToolCallCardLabels } from '../unstable/tool-call-card/index';
import type { ResponseBlockLabels } from '../unstable/response-block/index';
import type { FeedbackBarLabels } from '../unstable/feedback-bar/index';
import type { ApprovalCardLabels } from '../unstable/approval-card/index';
import type { ModelSelectorLabels } from '../unstable/model-selector/index';
import type { InlineAssistLabels } from '../unstable/inline-assist/index';
import type { VoiceOrbLabels } from '../unstable/voice-orb/index';
import type { ChatLogLabels, ChatMessageLabels } from '../unstable/chat-message/index';
import type { PromptComposerLabels } from '../unstable/prompt-composer/index';
import type { TagLabels } from '../unstable/tag/index';
import type { RatingLabels } from '../unstable/rating/index';
import type { NotificationItemLabels } from '../unstable/notification-item/index';
import type { FileItemLabels } from '../unstable/file-item/index';
import type { CommentLabels } from '../unstable/comment/index';
import type { EventCardLabels } from '../unstable/event-card/index';
import type { MediaPlayerLabels } from '../unstable/media-player/index';
import type { LinkLabels } from '../unstable/link/index';
import type { CopyButtonLabels } from '../unstable/copy-button/index';
import type { CodeBlockLabels } from '../unstable/code-block/index';
import type { AnnouncementBarLabels } from '../unstable/announcement-bar/index';
import type { NewsletterSignupLabels } from '../unstable/newsletter-signup/index';
import type { SiteNavbarLabels } from '../unstable/site-navbar/index';

/**
 * The en-US strings of every unstable part that takes `labels`, keyed by component, shaped like
 * `enUS`: pass `labels={enUSUnstable.voiceOrb}`, or the entries to `NizivoConfig labels` next to
 * the stable ones (`labels={{ ...deDE, ...deDEUnstable }}`), whose type covers both.
 */
export const enUSUnstable: {
  aiBadge: AiBadgeLabels;
  thinkingIndicator: ThinkingIndicatorLabels;
  citation: CitationLabels;
  sourceCard: SourceCardLabels;
  suggestionGroup: SuggestionGroupLabels;
  usageMeter: UsageMeterLabels;
  toolCallCard: ToolCallCardLabels;
  responseBlock: ResponseBlockLabels;
  feedbackBar: FeedbackBarLabels;
  approvalCard: ApprovalCardLabels;
  modelSelector: ModelSelectorLabels;
  inlineAssist: InlineAssistLabels;
  voiceOrb: VoiceOrbLabels;
  chatMessage: ChatMessageLabels;
  chatLog: ChatLogLabels;
  promptComposer: PromptComposerLabels;
  tag: TagLabels;
  rating: RatingLabels;
  notificationItem: NotificationItemLabels;
  fileItem: FileItemLabels;
  comment: CommentLabels;
  eventCard: EventCardLabels;
  mediaPlayer: MediaPlayerLabels;
  link: LinkLabels;
  copyButton: CopyButtonLabels;
  codeBlock: CodeBlockLabels;
  announcementBar: AnnouncementBarLabels;
  newsletterSignup: NewsletterSignupLabels;
  siteNavbar: SiteNavbarLabels;
} = {
  aiBadge: { label: 'AI generated' },
  thinkingIndicator: { label: 'Thinking…' },
  citation: { source: 'Source {number}', sourceTitled: 'Source {number}: {title}' },
  sourceCard: { newTab: '(opens in a new tab)' },
  suggestionGroup: { label: 'Suggestions' },
  usageMeter: { label: 'AI credits', valueText: '{value} of {max} credits used' },
  toolCallCard: {
    running: 'Running',
    done: 'Done',
    failed: 'Failed',
    stepTodo: 'not started',
    stepRunning: 'in progress',
    stepDone: 'done',
    stepFailed: 'failed',
  },
  responseBlock: {
    name: 'Assistant',
    stop: 'Stop generating',
    retry: 'Retry',
    error: 'Something went wrong. Try again.',
  },
  feedbackBar: {
    prompt: 'Was this helpful?',
    thanksUp: 'Thanks — glad it helped.',
    thanksDown: 'Thanks. What went wrong?',
    up: 'Good answer',
    down: 'Bad answer',
    reasons: 'What went wrong',
  },
  approvalCard: { badge: 'Needs your approval', cancel: 'Cancel', edit: 'Edit first' },
  modelSelector: { label: 'Model' },
  inlineAssist: { label: 'Writing tools', ask: 'Ask AI…' },
  voiceOrb: {
    idle: 'Tap to talk',
    listening: 'Listening…',
    speaking: 'Speaking…',
    start: 'Start talking',
    stop: 'Stop',
  },
  chatMessage: { user: 'You', assistant: 'Assistant' },
  chatLog: { label: 'Conversation' },
  promptComposer: { label: 'Message', placeholder: 'Ask anything…', send: 'Send' },
  tag: { remove: 'Remove {label}' },
  rating: {
    label: 'Rated {value} out of {max}',
    labelWithCount: 'Rated {value} out of {max} from {count} reviews',
    count: '({count} reviews)',
  },
  notificationItem: { unread: 'Unread' },
  fileItem: {
    progress: 'Uploading {name}',
    cancel: 'Cancel upload of {name}',
    retry: 'Retry upload of {name}',
    done: 'Uploaded',
  },
  comment: { like: 'Like, {count}', reply: 'Reply' },
  eventCard: { going: 'going' },
  mediaPlayer: {
    play: 'Play',
    pause: 'Pause',
    skipBack: 'Skip back',
    skipForward: 'Skip forward',
    seek: 'Seek',
    position: '{current} of {duration}',
  },
  link: { newTab: '(opens in a new tab)' },
  copyButton: { copy: 'Copy', copied: 'Copied' },
  codeBlock: { versions: 'Versions' },
  announcementBar: { dismiss: 'Dismiss announcement', label: 'Announcement' },
  newsletterSignup: {
    email: 'Email',
    subscribe: 'Subscribe',
    success: 'Thanks — check your inbox to confirm.',
    missing: 'Enter your email address.',
    invalid: 'Enter an email address like name@example.com.',
  },
  siteNavbar: { label: 'Main', menu: 'Menu' },
};
