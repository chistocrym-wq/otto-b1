# Preview 20: admin user journey analytics

Owner-requested isolated preview. Base: main at 684f943a1b5ae63d0065cbf341d338f5a68daf40. Do not merge or publish to production. PR 19 is independent and must not be modified.

Implementation acceptance:
- Protected admin user timeline; distinguish observation, hypothesis and user feedback.
- Separate approximate learning/reference time and practice time; show seconds and unavailable data honestly.
- Explicit route and result events; technical failures without answer text, audio, OTP, URLs with query parameters, or credentials.
- Preview-only analytics storage, separate from existing progress/accounts/payments; collection requires tester opt-in.
- Events before collection started cannot be reconstructed. Empty records are not proof of inactivity.
- No production schema migrations, settings changes, real payments, or messages to learners.

Status: implementation in progress. This document alone is not evidence of functional completion or deployment.
