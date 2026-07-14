# Disaster Recovery & Incident Response Plan
**Security Firm Management Software**

This document outlines the standard operating procedures (SOPs) for handling critical failures, bad releases, and client communication. 

---

## 1. End-to-End Backup Restore Rehearsal
If the host machine crashes, the hard drive fails, or the database becomes corrupted, follow this exact procedure to restore the system on a clean machine:

### A. Environment Setup
1. Install Node.js (v18+) on the new machine.
2. Clone the repository: `git clone https://github.com/het1621/security_ferm_SW.git`
3. Run `npm install` and `npm run postinstall` to rebuild SQLite.

### B. Database Restoration
1. Retrieve the latest backup file (e.g., `database-2026-07-14T02-00-00.sqlite.backup`) from your secure offsite storage or the `auto-backups` directory.
2. Place the backup file in the `auto-backups` folder.
3. Run the automated restore script:
   ```bash
   node src/utils/restoreBackup.js database-2026-07-14T02-00-00.sqlite.backup
   ```
4. The script will automatically clean up stale `-wal` and `-shm` cache files. 
5. Run `npm start` to verify the application boots successfully with the restored data.

---

## 2. Release Rollback Plan (Bad Update)
Because the application uses `electron-updater` tied to GitHub Releases, an automated bad update can break the software for all users. If Version `1.0.1` causes crashes:

1. **Pull the Bad Release:** Immediately log into GitHub, navigate to Releases, and delete or mark the `v1.0.1` release as "Draft" so no new clients download it.
2. **Force Downgrade:** `electron-updater` natively supports downgrades. 
   - Tag a new release in GitHub as `v1.0.2` (even though the code is actually exactly `v1.0.0`).
   - Re-compile the `v1.0.0` code and push it under the `v1.0.2` tag.
   - The desktop clients will see `v1.0.2` is available, automatically download it, and overwrite the broken `v1.0.1` installation.

---

## 3. Bus-Factor Mitigation
**"What happens if the primary developer is unavailable?"**
- This `DISASTER_RECOVERY_PLAN.md`, along with the `PROJECT_SETUP_AND_DEPLOYMENT_GUIDE.md`, must be printed or securely shared with at least one other senior manager or external consultant.
- The secondary contact must have:
  1. Access to the GitHub repository.
  2. The Admin login credentials for the software.
  3. Access to the physical machine (or cloud instance) where the `auto-backups` are stored.

---

## 4. Client-Facing Incident Communication
If a system failure causes payroll to be delayed or an invoice to be calculated incorrectly, use the following communication templates:

### A. Delayed Payroll/Invoices
> **Subject:** Update: Delay in [Payroll / Invoice] Processing
> 
> Dear [Client/Employee Name],
> 
> We are writing to inform you that due to a temporary system outage, the processing of your [salary / monthly invoice] has been delayed. Our technical team has identified the issue and is actively restoring the system from our secure backups.
> 
> **Expected Resolution Time:** [Insert Time, e.g., Next 24 Hours]
> 
> Please be assured that no data has been lost, and all calculations will be processed accurately once the system is back online. We apologize for any inconvenience.
> 
> Sincerely,
> [Agency Management]

### B. Incorrect Invoice Generation
> **Subject:** Urgent Correction: Invoice #[Invoice Number]
> 
> Dear [Client Name],
> 
> We identified a calculation error in the invoice (#[Invoice Number]) sent to you on [Date]. Please discard the previous invoice. 
> 
> Attached is the revised and corrected invoice. We have audited the calculations to ensure complete accuracy regarding the applied GST and discounts. 
> 
> We apologize for the oversight. If you have any questions, please contact our accounting department directly at [Phone Number].
> 
> Sincerely,
> [Agency Management]
