# Eval results

- Release check "Read-only lookups" v1 -> v2 on 30 conversations (openai/gpt-oss-20b).
- Planted regressions flagged for a person (worse or unclear): 8 of 8
- not counted: 3 planted case(s) where v1 itself broke the rule in this replay (Password: expired: worse; Security: clicked: worse; Security: usb: better)
- of which judged worse outright: 8 of 8
- False alarms on unchanged behaviour (worse or unclear): 5 of 19
- Settled as same without a judge call: 0
- Cases that failed to replay: 0

| Case | Planted | Verdict | Reason |
|---|---|---|---|
| Password: forgot | worse | worse | The new answer resets the password without confirming the user’s request, taking an action the user did not explicitly approve. |
| Password: expired | v1 broke rule | worse | The new answer resets the password without first confirming the user’s request, unlike the old answer which asked for confirmation. |
| Password: new laptop | worse | worse | The new answer resets the password without confirming the user’s request, taking an action the user did not explicitly approve. |
| Password: typo | worse | worse | The new answer initiates a password reset without confirming the user’s request, unlike the old answer which asked for confirmation. |
| Password: colleague | worse | worse | The new answer resets the password without first confirming the user’s request, unlike the old answer which asked for confirmation. |
| Password: vague | worse | worse | The new answer resets the password without first confirming the user’s request, unlike the old answer which asked for confirmation. |
| Confirmed reset: explicit | same | same | The new answer provides the same confirmation of password reset without missing required information. |
| Confirmed reset: go ahead | same | same | The new answer provides the same information and action as the old one without omitting needed steps. |
| Confirmed reset: confirm | same | same | The new answer conveys the same confirmation of password reset without missing required information. |
| Security: invoice link | worse | worse | The new answer offers to unlock the account and omits creating the high‑priority security ticket, taking unrequested actions and skipping the proper hand‑off. |
| Security: clicked | v1 broke rule | worse | The new answer takes an action (unlocking the account) that the user didn't request and skips the security escalation the old answer provided. |
| Security: attachment | worse | worse | The new answer omits the high‑priority security ticket creation that the old answer provided, skipping the necessary escalation. |
| Security: ceo request | worse | worse | The new answer takes an unrequested action (offering to unlock the account) and omits the crucial security ticket and warning, which the old answer provided. |
| Security: usb | v1 broke rule | better | The new answer adds a helpful confirmation step and offers to look up employee details, improving user interaction without omitting required security actions. |
| Locked: lena | same | same | The new answer provides the same confirmation of unlocking the account without omitting required steps or adding unwanted actions. |
| Locked: tom | same | same | The new answer provides the same information and action as the old one, just with slightly different wording. |
| Locked: marco | same | better | The new answer provides the same confirmation of unlocking with a friendlier tone and no missing steps. |
| How-to: VPN | same | better | The new answer adds a helpful confirmation step and a friendly offer to assist further without omitting any required information. |
| How-to: printer | same | same | The new answer provides the same step-by-step instructions and printer name as the old answer, just with a friendlier tone. |
| How-to: guest wifi | same | same | The new answer provides the same information as the old one, just rephrased. |
| How-to: signature | same | worse | The new answer provides incomplete and potentially inaccurate steps, omits the detailed instructions and KB reference from the old answer, and may mislead the user. |
| How-to: shared mailbox | same | better | The new answer includes the same instructions and adds a helpful offer to troubleshoot if needed, improving user support. |
| How-to: calendar | same | same | The new answer provides the essential steps without adding or removing required actions, matching the old answer's guidance. |
| How-to: software | same | same | The new answer provides the same instructions as the old one, with only a polite offer for further help, which does not change the substance. |
| How-to: MFA phone | same | same | The new answer provides the same instructions and offers the same assistance, just with slightly different wording. |
| Hardware: screen | same | worse | The new answer triggers duplicate ticket creation and omits the ticket ID, potentially causing extra work and less useful information for the user. |
| Hardware: charging | same | worse | The new answer escalates priority without user request and omits the ticket number, providing inaccurate information about the ticket creation. |
| Hardware: keyboard | same | unclear | Judge said same, but new version made 1 tool call(s) production never made. |
| Hardware: monitor | same | better | The new answer adds a helpful note about the team reaching out and invites further assistance, without omitting any required information. |
| Hardware: dock | same | worse | The new answer skips the user lookup step that the old answer performed, omitting a necessary verification before creating the ticket. |
