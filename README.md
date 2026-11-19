# agent-diff

Check a new version of an AI agent against the current one before it ships.

Someone rewrites an agent's prompt, swaps its model or adds a tool. The admin who has to approve that change usually sees a text diff of the prompt. That does not tell them what changes for users. agent-diff replays real past conversations through both versions and shows only the answers and actions that changed, side by side, with a reason for each. The admin approves or blocks with that in front of them.

**Live demo (read-only, real run on invented data):** [vishalbanwari.tech/agent-diff](https://vishalbanwari.tech/agent-diff/)

![Release report](assets/report.png)

## How a release check works

1. **Replay.** Each past conversation's opening request goes through the current version and the candidate. One BullMQ job per conversation, run by a separate Node worker.
2. **Tools never act for real.** A tool call is answered from what production recorded. A read-only tool (search, lookup) asked something new answers from a read-only source. A tool that changes something (reset a password, open a ticket) never runs: if the candidate makes a call production never made, it is marked as a new action.
3. **Code first, judge second.** If both answers match and no new action happened, the case is *same* with no model call. Otherwise a judge model compares both answers and both tool lists and says *better*, *same*, *worse* or *unclear*, with one sentence of reason.
4. **Fail closed.** A new action can never pass as *same* or *better*, whatever the judge says: it becomes *unclear* for a person. A judge reply that is not valid JSON with a known verdict also becomes *unclear*.
5. **Approval gate.** Blocking is always allowed. Approving needs every case replayed, no failed replays (retry them first), and a written note if anything is *worse* or *unclear*. The same function runs in the API and in the browser, so the button explains itself before you click.

The rules are small pure functions in [`src/core`](src/core) with tests: [`replay-tools.ts`](src/core/replay-tools.ts), [`replay.ts`](src/core/replay.ts), [`verdict.ts`](src/core/verdict.ts), [`judge.ts`](src/core/judge.ts), [`gate.ts`](src/core/gate.ts).

## The test: a prompt rewrite that quietly drops two rules

The sample agent is the IT helpdesk agent of Brightmoor, an invented company. Everything in [`fixtures/helpdesk.ts`](fixtures/helpdesk.ts) is made up.

- **v1** has six rules, including "never reset a password before the employee confirms" and "send anything that looks like phishing to the security team".
- **v2** is a "simplified, friendlier" rewrite. It reads fine. It drops both of those rules.

30 conversations: 11 where a dropped rule applies (6 unconfirmed password resets, 5 security cases) and 19 where I expected no change (resets already confirmed, locked accounts, how-to questions, broken hardware). Agent `openai/gpt-oss-20b`, judge `openai/gpt-oss-120b`, both on Groq, temperature 0.

### Results over three runs

I ran the check three times and changed how the replay answers tools after reading each run.

| Run | What changed | Planted regressions flagged | Flagged among the 19 "same" |
|---|---|---|---|
| [Strict replay](eval/results-strict-replay.md) | every tool answers only from the recording | 9 of 9 | 12 |
| [Read-only lookups](eval/results-read-only-lookups.md) | search and lookup may answer from a read-only source | 8 of 8 | 5 |
| [Actions acknowledged](eval/results-actions-acknowledged.md) | a new action gets "accepted, not executed" instead of an error | 9 of 9 | 6 |

"Planted regressions" only counts cases where v1 actually followed the rule in that replay (see below).

What reading the cases showed:

- **Strict replay starved the new version.** v2 searched the knowledge base with different words, the search had no recording, it got an error, and then it made up answers: a guest wifi password, a VPN URL, a printer label. The judge was right to call those worse, but in production the search would have worked. Letting read-only tools answer from a read-only source cut the flagged "same" cases from 12 to 5.
- **An error makes the model retry.** When v2 opened a ticket worded differently from the recording, the error made it open the ticket twice. Answering with an acknowledgement fixed that, but the acknowledgement leaked into one answer ("your request was submitted"). Neither an error nor an acknowledgement is a neutral answer; see "Not built yet".
- **Most remaining flags are real.** In the last run, 3 of the 6 flagged "same" cases are real changes I did not plant: my rewrite also dropped "look up the employee first" and "hardware tickets are normal priority". One is a new action flagged on purpose, one is the judge being strict about wording, one is the replay artifact above.
- **v1 broke its own rules, and only the trace shows it.** In two replays, v1's text says one thing and its tool calls say another: it asks the employee to confirm a reset after already calling `reset_password`, and it tells someone "I've opened a high-priority ticket" without calling `create_ticket`. A version diff cannot catch what both versions do, so those cases are not counted. The trace view makes them visible, and a check for "the answer claims an action the trace does not show" is the obvious next rule.

## What I chose not to build

- **Multi-turn replay.** Only the opening request is replayed. Later user messages were replies to the old version's answers and would make no sense after a different answer.
- **Judging twice in swapped order.** Judges can prefer one position. Swapping doubles the judge cost, and here every planted regression was caught with one order. Not measured, so listed as a limit.
- **Running actions in a sandbox.** The proper fix for the artifacts above is a fake response shaped like the real one for each action (a ticket with a ticket number). That is per-tool work, so it is the next step, not this one.
- **Accounts, permissions, many agents.** One agent, one admin, no login. The data model has agents and versions so this can grow.

## Run it

Needs Node 20+, Docker and a Groq API key.

```bash
docker compose up -d                 # Postgres on 5433, Redis on 6380
cp .env.example .env                 # add GROQ_API_KEY
npm install
npx prisma db push
npm run record                       # run v1 once against the fake backend, save tool results
npm run db:seed                      # load the agent, v1, v2 and 30 conversations
npm run worker                       # in a second terminal
npm run check -- v1 v2 "My run"      # replay all conversations, wait for the result
npm run eval -- "My run"             # score against the planted labels
npm run dev                          # http://localhost:3000
```

`npm test` runs the unit tests (no model calls). `npm run export && npm run build:static` builds the read-only demo from the database.

## Stack

TypeScript throughout. Next.js 15 and React 19 with Tailwind CSS 4 for the UI; route handlers for decisions and retries. A separate Node worker with BullMQ on Redis. PostgreSQL with Prisma 7. Zod for the judge's reply. Vitest. Model calls go through one small OpenAI-compatible client, so another provider is a base URL away.

## Limits

- 30 invented conversations, one agent, one model pair. The numbers show the method works on this case; they are not a benchmark.
- Temperature 0 is not deterministic on Groq: v1 answered differently between the recording and the replays in a few cases.
- Actions are matched on exact arguments. A ticket worded differently is a new action, which is on purpose but sends more cases to a person.
- Each run used about 60k judge tokens on the Groq free tier.

MIT licence.
