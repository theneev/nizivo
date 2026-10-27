---
'@nizivo/react': minor
---

The AI kit gains its answer and agent parts (unstable): `ResponseBlock`
(`@nizivo/react/unstable/response-block`) is one answer from thinking through streaming, with a Stop
button, to complete or an error with Retry, read once when complete; `ToolCallCard`
(`./unstable/tool-call-card`) shows an action the AI takes step by step, each step's status spoken;
`FeedbackBar` (`./unstable/feedback-bar`) is a thumbs up and down that toggle, with optional reasons;
`ApprovalCard` (`./unstable/approval-card`) asks before an action that cannot be undone, with focus on
Cancel and Escape to cancel. ResponseBlock and ToolCallCard are server parts. Their strings join the
en-US catalogue.
