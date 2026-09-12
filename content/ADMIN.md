# Question management

`/admin` uses independent key authentication, not learner accounts. A random 256-bit `adm_` key signs an administrator in; the database stores its SHA-256 hash. Sessions use a separate HttpOnly, Secure, SameSite=Strict cookie for 12 hours. CSRF checks and entry rate limits apply to the API. Keys never enter a URL, browser storage, source control, or a reusable list response.

The first owner enters with a generated bootstrap key whose hash is configured as the secret `ADMIN_BOOTSTRAP_HASH`. Bootstrap can create the fixed owner row only once; replacing the owner's key does not reactivate the bootstrap key. Keep the owner key safe. Personal keys and invitation keys are shown once when generated.

Administrators issue single-use `inv_` invitation keys valid for seven days. Editors can only invite for subjects they manage. The owner can optionally authorize registration of new subjects. Registrants enter a display name and comma/newline-separated subject names; the server checks them against the invitation, atomically consumes the invitation, and returns a new personal login key. Owner and editor permissions are checked on every write, including both source and destination subjects when moving a question. Disabling an editor revokes their sessions and unused invitations.

The catalog overlays D1 records on the 305 document questions and 48 practice questions, preserving stable IDs. Draft and archived questions do not appear in newly loaded public catalogs or new draws. Editing uses optimistic revisions. New subjects appear in the learner's scope selection. Chinese is the base version; English is optional and falls back to Chinese when omitted.

New practice sessions save complete question/answer snapshots for grading and later review. Older sessions use their unchanged original built-in content. Editing or archiving a question does not change an existing saved attempt's answer. Random draws use current published content for the next occurrence. Exams sample up to three questions per format; mock interviews use up to six short answers and two code tasks, so small subject banks are usable as they grow.

Read mode defaults to a spacious centered question with the sidebar collapsed and overview panels hidden. The learner can open the directory or toggle the study overview. Practice saves remain answer/pause/finish driven; no periodic save loop is introduced.
