# Testing results

Test date in the existing evidence record: 11 October 2026.

Evidence IDs refer to the [evidence register](evidence-register.md). Results below were initially transcribed from the prior record. Original screenshots have now been visually reviewed: E01-E06 and E10 are attached in the screenshot gallery; E07-E09 remain pending credential redaction. No new live testing was performed.

| Test | Observed result in prior record | Assessment | Evidence |
|---|---|---|---|
| Container startup | OpenCanary and Cowrie shown running | Running state at capture time; not full functionality | E01 |
| HTTP, local 8081 | 302 redirect to /index.html; corresponding GET entry | Local response and logging recorded; landing page not verified | E02–E03 |
| FTP, local 2121 | Greeting and login rejection, code 530; matching event | Local interaction and event capture recorded | E04–E05 |
| MySQL, local 3307 | Three test login attempts rejected with error 1045; matching events | Local interaction and event capture recorded | E06–E07 |
| Telnet, local 2323 | Login prompt, rejected authentication and later events including blank values | Local interaction and event capture recorded | E08–E09 |
| Other modules | Startup mentions HTTPS, MongoDB, RDP and SIP | Client interaction not demonstrated | E03, E05 |
| Cowrie interaction | No client test documented in this record | Not verified | E01 supports startup only |

Authentication rejection does not itself mean a honeypot logging test failed. These observations do not demonstrate successful account access or external attacker detection. Service banners do not establish the actual installed server version.

## Recorded sequence

| Time (UTC, 11 October 2026) | Event |
|---|---|
| Approximately 01:38:30 | OpenCanary initialization |
| 01:40:34–01:40:35 | HTTP request and redirect |
| 01:42:20 | FTP login event |
| 01:43:58, 01:44:07, 01:44:12 | MySQL events |
| Approximately 01:46:55–01:49:20 | Telnet event sequence |

Sydney time was UTC+11. Use explicit timestamps and timezone fields rather than screenshot filenames to establish event timing.

## Template for future tests

- **Objective:**
- **Date and timezone:**
- **Environment and versions:**
- **Expected behaviour:**
- **Action performed:**
- **Observed response:**
- **Matching event and timestamp:**
- **Assessment:** confirmed / reported / not verified
- **Evidence file:**
- **Limitations and follow-up:**

