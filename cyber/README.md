# NeuroAIQ Handover: Cyber Security Section

Team B58, CSE3CAP Capstone. Security testing and threat-detection planning for the NeuroAIQ engagement.

Prepared: 13 October 2026 (Australia/Melbourne).

## What this section is

This is the security-testing evidence that sits behind the client-facing **Website Security Plan**. While the website rebuild was in progress, the team stood up a small honeypot lab to practise detecting and logging hostile interaction with exposed services. The lab is a local, self-contained environment. It was never attached to the client's live site or to neuroaiq.com.au.

Two honeypots were run in the lab:

- **OpenCanary** (container `neuroaiq-opencanary`): emulates common services (HTTP, FTP, MySQL, Telnet and others) and logs any interaction with them.
- **Cowrie** (container `neuroaiq-cowrie`): an SSH/Telnet honeypot that records session activity.

The purpose is defensive: show that the team can recognise the signals a real attacker would leave, and log them in a way that holds up as evidence. None of this requires the client to run a honeypot. It supports the detection and monitoring thinking in the Security Plan.

## Contents

| Item | Path | What it is |
|---|---|---|
| Lab documentation | [`honeypot-lab-docs/`](honeypot-lab-docs/README.md) | The full write-up: lab setup, testing results, troubleshooting, evidence register and remaining work |
| Screenshot evidence | [`honeypot-lab-docs/evidence/screenshots/`](honeypot-lab-docs/evidence/screenshots/README.md) | E01 to E06 and E10, visually reviewed, credentials excluded |
| Demonstration video | `evidence/video/opencanary-honeypot-demo.mp4` | A 6m32s screen recording of OpenCanary capturing local HTTP, FTP, MySQL and Telnet interaction |

## The demonstration video

`opencanary-honeypot-demo.mp4` is the recommended single piece of evidence for a reviewer short on time. It shows, in one pass, a local client touching the published loopback ports and OpenCanary producing the matching event output. It lines up with the recorded sequence in [`testing-results.md`](honeypot-lab-docs/docs/testing-results.md):

- OpenCanary initialisation
- HTTP request and 302 redirect on local 8081
- FTP login rejection (530) on local 2121
- MySQL rejected logins (error 1045) on local 3307
- Telnet login prompt and event sequence on local 2323

The video is kept as a separate media file, not committed into the documentation repository, to keep that repository small and text-first. The screenshots in the gallery are the primary stills; the video is the moving-picture version of the same events.

## How to read the evidence

The documentation is deliberate about what it does and does not claim. Three labels run through it:

- **Recorded observation:** captured in the evidence record.
- **User reported:** stated but not independently measured here.
- **Not verified:** evidence is absent or insufficient.

Keep those labels when extending this section. A banner on a service does not prove the installed version, a rejected login does not prove a failed test, and a file listing does not prove a file's contents. The write-up says so in each place, and a client reviewer will trust it more for being plain about the gaps.

## What is deliberately not here

- No credentials. E07 to E09 were reviewed but held back pending redaction, because they contain password or authentication material.
- No payloads, disk images or archive-generation code. The `.gitignore` blocks `*.zip`, `*.iso`, `*.img` and similar so they are never committed by accident.
- No claim of external reachability. Every binding in the lab is loopback. Laptop-to-VM and public access were not established, and the docs say so.

## Remaining work

Listed in full in [`remaining-work.md`](honeypot-lab-docs/docs/remaining-work.md). The headline items are verifying Cowrie interaction with a timestamped event, recording the Proxmox topology and versions, redacting and adding E07 to E09, and resolving the outstanding troubleshooting notes.
