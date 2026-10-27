// @nizivo/react/locales/en-US: every built-in string, by component (ARCHITECTURE.md §16.4). The
// English defaults the components already use, as one plain object; the imports are types only, so
// this module is the strings and nothing else. NO directive.
//
// Not here: strings React Aria renders from its own catalogues (the overlays' visually hidden
// "Dismiss" buttons, MenuLabels, Select's "Select an item"), which `labels` cannot set. `dialog`,
// `drawer` and `popover` are the labels of their Close parts; KpiTile and TrendCard pass theirs to
// Metric, so `kpiTile`, `trendCard` and `metric` hold the same strings.
import type { AlertDismissLabels } from '../alert/index';
import type { AppShellLabels } from '../app-shell/index';
import type { AvatarGroupLabels } from '../avatar/index';
import type { BannerDismissLabels } from '../banner/index';
import type { BulkActionBarLabels } from '../bulk-action-bar/index';
import type { BreadcrumbLabels } from '../breadcrumb/index';
import type { ButtonLabels } from '../button/index';
import type { ChipGroupLabels } from '../chip-group/index';
import type { DialogLabels } from '../dialog/index';
import type { DrawerLabels } from '../drawer/index';
import type { FileUploadLabels } from '../file-upload/index';
import type { FormLabels } from '../form/index';
import type { MetricLabels } from '../metric/index';
import type { MobileTabBarLabels, MobileTabBarMoreLabels } from '../mobile-tab-bar/index';
import type { PageIndicatorLabels } from '../page-indicator/index';
import type { PaginationLabels } from '../pagination/index';
import type { PasswordInputLabels } from '../password-input/index';
import type { PopoverLabels } from '../popover/index';
import type { QuantityStepperLabels } from '../quantity-stepper/index';
import type { CommandMenuLabels } from '../unstable/command-menu/index';
import type { DateRangePickerLabels } from '../unstable/date-range-picker/index';
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
import type { RankedListLabels } from '../ranked-list/index';
import type { SearchFieldLabels } from '../search-field/index';
import type { SidebarLabels } from '../sidebar/index';
import type { TableSelectionLabels } from '../table-selection/index';
import type { ToasterLabels } from '../toast/index';

/**
 * The en-US strings of every component that takes `labels`, keyed by component: pass
 * `labels={enUS.pagination}` or a catalogue of the same shape for another locale
 * (`const deDE: typeof enUS = { … }`). Count-bearing strings (`avatarGroup`) may be plural
 * objects in other locales (`PluralLabel` from `@nizivo/react/i18n`).
 */
export const enUS: {
  alertDismiss: AlertDismissLabels;
  appShell: AppShellLabels;
  avatarGroup: AvatarGroupLabels;
  bannerDismiss: BannerDismissLabels;
  breadcrumb: BreadcrumbLabels;
  bulkActionBar: BulkActionBarLabels;
  button: ButtonLabels;
  chipGroup: ChipGroupLabels;
  dialog: Pick<DialogLabels, 'close'>;
  drawer: Pick<DrawerLabels, 'close'>;
  fileUpload: FileUploadLabels;
  form: FormLabels;
  kpiTile: MetricLabels;
  metric: MetricLabels;
  mobileTabBar: MobileTabBarLabels;
  mobileTabBarMore: MobileTabBarMoreLabels;
  pageIndicator: PageIndicatorLabels;
  pagination: PaginationLabels;
  passwordInput: PasswordInputLabels;
  popover: Pick<PopoverLabels, 'close'>;
  quantityStepper: QuantityStepperLabels;
  dateRangePicker: DateRangePickerLabels;
  commandMenu: CommandMenuLabels;
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
  rankedList: RankedListLabels;
  searchField: SearchFieldLabels;
  sidebar: SidebarLabels;
  tableSelection: TableSelectionLabels;
  toaster: ToasterLabels;
  trendCard: MetricLabels;
} = {
  alertDismiss: { dismiss: 'Dismiss' },
  appShell: { skip: 'Skip to content' },
  avatarGroup: { overflow: '+{count}', more: '{count} more' },
  bannerDismiss: { dismiss: 'Dismiss' },
  breadcrumb: { nav: 'Breadcrumb' },
  bulkActionBar: { selected: '{count} selected' },
  button: { pending: 'Loading…' },
  chipGroup: { unavailable: 'Unavailable' },
  dialog: { close: 'Close' },
  drawer: { close: 'Close' },
  fileUpload: {
    prompt: 'Drop files here or {browse}',
    browse: 'browse',
    release: 'Release to add files',
    summary: '{complete} of {total} uploaded',
    wrongType: '{name} is not an accepted file type.',
    tooLarge: '{name} is larger than {max}.',
    tooMany: '{name} was not added: choose one file.',
    list: 'Chosen files',
    remove: 'Remove {name}',
    retry: 'Retry',
    cancel: 'Cancel',
    uploading: 'Uploading {name}',
    complete: 'Uploaded',
    failed: 'Upload failed',
  },
  form: { summaryTitle: 'There is a problem' },
  kpiTile: { loading: 'Loading {label}', empty: 'No data', error: 'Could not load {label}' },
  metric: { loading: 'Loading {label}', empty: 'No data', error: 'Could not load {label}' },
  mobileTabBar: { nav: 'Primary' },
  mobileTabBarMore: { more: 'More', close: 'Close' },
  pageIndicator: { position: '{current} of {count}' },
  pagination: {
    nav: 'Pagination',
    previous: 'Previous page',
    next: 'Next page',
    page: 'Page {page}',
  },
  passwordInput: { toggle: 'Show password' },
  popover: { close: 'Close' },
  quantityStepper: { decrement: 'Decrease quantity', increment: 'Increase quantity' },
  dateRangePicker: {
    placeholder: 'Select dates',
    range: '{start} – {end}',
    cancel: 'Cancel',
    apply: 'Apply',
    presets: 'Presets',
    today: 'Today',
    yesterday: 'Yesterday',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
    thisQuarter: 'This quarter',
    yearToDate: 'Year to date',
  },
  commandMenu: {
    label: 'Command menu',
    placeholder: 'Search',
    empty: 'No results',
    navigate: 'Navigate',
    open: 'Open',
  },
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
  rankedList: { loading: 'Loading {label}', empty: 'No data', error: 'Could not load {label}' },
  searchField: { label: 'Search', clear: 'Clear search' },
  sidebar: { nav: 'Primary' },
  tableSelection: { selectAll: 'Select all rows' },
  toaster: { region: 'Notifications (F8)', dismiss: 'Dismiss' },
  trendCard: { loading: 'Loading {label}', empty: 'No data', error: 'Could not load {label}' },
};
