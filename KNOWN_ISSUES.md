# Known Issues & Tracked Follow-ups (v1.0.0)

All P0 (Critical) and P1 (High) bugs identified during the 12-stage QA and Security audit have been completely resolved and merged into Version 1.0.0.

The following are P2 (Medium) and P3 (Low) issues that are safe to ship with this release. They will be addressed in future minor updates (v1.1.0+).

## P2 (Medium) Issues
1. **[UI/UX] Mobile Responsiveness on Dashboard:** The main analytical charts on the dashboard sometimes overflow their containers when viewed on mobile screens smaller than 375px wide. *Status: Deferred to v1.1.0 frontend pass.*
2. **[Performance] Bulk Export Delay:** Exporting the master attendance list to CSV for the entire year takes roughly 4 seconds and blocks the UI thread momentarily. *Status: Safe to ship. Will move to WebWorker or background job in v1.1.0.*
3. **[Feature] Partial Payments on Invoices:** The system technically allows recording multiple partial payments, but the UI only displays the *latest* payment date rather than a full payment history ledger. *Status: Backlog.*

## P3 (Low) Issues
1. **[Cosmetic] PDF Font Scaling:** In the generated Salary Slip PDF, if an employee has a first and last name longer than 35 characters, the text does not dynamically scale down and may touch the table border. *Status: Accepted risk.*
2. **[Cosmetic] Dark Mode Contrast:** The "Settings" icon has low contrast when hovering in dark mode. *Status: Backlog.*

---
*Signed: Deepmind Automated QA Audit*
*Date: July 14, 2026*
