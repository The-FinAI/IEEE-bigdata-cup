# Task 3 site deployment

The `/task3/` pages build in one of two modes.

**`development` (the default).** No configuration needed. The upload links render
as "under verification" and every phase row shows as pending. This is what the
site does today.

**`final`.** The upload links and the leaderboard feed are published. The build
**fails** rather than emit a link it has not validated: every URL must be a root
`*.hf.space` HTTPS address, the two Spaces must differ, and the leaderboard feed
must sit on the scoring Space's own origin at `/api/leaderboard`.

To switch, set these four **repository variables** (Settings → Secrets and
variables → Actions → Variables). They are not secrets; they are public
endpoints. The workflow already passes them through.

| Variable | Value |
| --- | --- |
| `FINREASON_TASK3_SITE_MODE` | `final` |
| `NEXT_PUBLIC_FINREASON_TASK3_SCORING_SPACE_URL` | root URL of the scoring Space |
| `NEXT_PUBLIC_FINREASON_TASK3_TEST_SPACE_URL` | root URL of the test Space |
| `NEXT_PUBLIC_FINREASON_TASK3_LEADERBOARD_API_URL` | the scoring Space's `/api/leaderboard` |

## Before switching to `final`

The Spaces currently in use were created under a personal Hugging Face account
rather than the organisation that owns this site. Moving them to the
organisation changes all three URLs, so decide that first — the values above are
the only thing that needs updating afterwards.

Setting `final` while the development and test datasets do not yet exist is
supported: the hub keeps reporting those phases as pending, and only practice
is actually scored.

Note what `final` does *not* hide. The submit page renders a reachable link to
the receipt-only Space, labelled "opens when the test set is released", and
that Space serves its upload form to anyone who follows it. The form is not a
way in: the Space reports `Phase test — pending` and refuses the upload,
because the phase gate lives in the Space and not in the link. Do not read the
clickable link as an open phase.
