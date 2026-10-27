# 🍎 Keep Your SNAP

**Live app: https://golgothad.github.io/keep-your-snap/**

A free tool for people at risk of losing SNAP (Michigan Food Assistance) over paperwork or the work rule, not ineligibility.

- **Work-rule check:** plain-language screener for the expanded 2025 ABAWD / Time Limited Food Assistance rule (ages 18–64, no child under 14; veteran, homeless, and former-foster-youth exemptions ended). Not legal advice.
- **Hours log:** work, volunteering, and training, with a progress bar toward 80 hours a month and a behind-pace warning.
- **Deadlines:** renewal (redetermination), semi-annual report, interview reminders; in-app alerts, `.ics` calendar export with alarms, optional browser notifications.
- **Changes:** guide to Michigan change reporting (simplified vs. change reporters) for address, pay/hours, new or lost job, household members, housing/utility costs, child support, under-80-hours months and big lottery wins: whether it must be reported, the deadline, and proof to have ready. Logging a change creates a "report by" reminder; track "did I report it?" and a confirmation number. Optional income-limit check using RFT 250.
- **Upcoming deadlines** card at the top of every screen.
- **Sync & backup:** QR code / link sync between your devices (merge or replace) and a JSON backup file.

All data stays in your browser's localStorage. No accounts, no backend, no tracking.

## Sources
- MDHHS BAM 105, Rights and Responsibilities (eff. 11-1-2026): https://mdhhs-pres-prod.michigan.gov/olmweb/EXF/BP/Public/BAM/105.pdf
- MDHHS BAM 200, SNAP Simplified Reporting (eff. 11-1-2026): https://mdhhs-pres-prod.michigan.gov/olmweb/EXF/BP/Public/BAM/200.pdf
- MDHHS RFT 250, SNAP Income Limits (eff. 10-1-2026): https://mdhhs-pres-prod.michigan.gov/olmweb/EXF/RF/Public/RFT/250.pdf
- MDHHS BEM 620, Time Limited Food Assistance (eff. 11-1-2026): https://mdhhs-pres-prod.michigan.gov/olmweb/EXF/BP/Public/BEM/620.pdf
- MDHHS Work Requirements: https://www.michigan.gov/mdhhs/assistance-programs/food/learn-more/work-requirements
- USDA FNS SNAP Work Requirements: https://www.fns.usda.gov/snap/work-requirements
- NACo on USDA H.R. 1 guidance: https://www.naco.org/news/usda-issues-guidance-snap-abawd-work-requirement-changes-under-hr-1

Rules change; always confirm with MDHHS. Not affiliated with USDA or MDHHS.

## Tests
`node tests/logic.test.js` and `URL=http://127.0.0.1:PORT/ node tests/browser.js` (needs playwright-core and Chrome).
