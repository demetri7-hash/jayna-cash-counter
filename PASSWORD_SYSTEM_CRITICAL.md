# 🔒 PASSWORD SYSTEM - CRITICAL INFO

**Date:** November 3, 2025
**Issue:** ALL password systems must use CALLBACK pattern for iframe compatibility

## THE WORKING PATTERN (from commit 8033531)

```javascript
function requirePasswordFor(featureName, callback) {
  // Show modal, validate password
  // When valid: Close modal, THEN execute callback
  window.managerPasswordCallback = callback;
  showPasswordModal();
}

function submitPassword() {
  if (passwordValid) {
    closeModal();
    // Navigation happens OUTSIDE modal = NO iframe sandbox errors
    window.managerPasswordCallback();
  }
}
```

## FILES WITH PASSWORD PROTECTION

**FIXED:**
- ✅ app-header.js (CASH, MANAGER buttons) - Uses callback pattern

**NEED FIXING (all have their own requirePasswordFor):**
- ⚠️ boh.html - FOH Checklist Editor, FOH Manager Watchdog, Delete Session
- ⚠️ cash.html - Has requirePasswordFor function
- ⚠️ catering.html - Scheduling, Manager Logs
- ⚠️ cogs.html - Manager Logs
- ⚠️ foh-checklists.html - FOH Checklist Editor, FOH Manager Watchdog, Delete Session (+ requirePasswordForFeature)
- ⚠️ index.html - Generate Reports, Tip Pool, Weekly Cashbox, Manager Dashboard, Catering, Manage Pending Orders
- ⚠️ manager.html - Scheduling, Manager Logs
- ⚠️ orders-prep.html - Manage Pending Orders

## PASSWORDS IN USE

1. **jaynacash** - CASH page access
2. **JaynaGyro2025!** - MANAGER page access
3. **Watchdog passwords** - From foh_watchdog_passwords table (is_active=true)
4. **Master password** - From manager_passwords table (SYSTEM_MASTER_PASSWORD)
5. **Custom passwords** - From localStorage customPasswords array

## THE FIX FOR ALL PAGES

Replace this pattern:
```javascript
❌ window.location.href = 'page.html'; // From inside modal
```

With this pattern:
```javascript
✅ function accessPage() {
  window.location.href = 'page.html';
}
requirePasswordFor('Page', accessPage); // Pass callback
```

## WHY THIS MATTERS

Google Sites embeds app in sandboxed iframe. Navigation from within modal context triggers:
- `SecurityError: The operation is insecure`
- `Unsafe JavaScript attempt to initiate navigation`
- Blocked frame with origin errors

**Solution:** Modal validates → closes → **THEN** callback executes navigation in normal context.

## ACTION ITEMS

1. Check each HTML file's requirePasswordFor implementation
2. Ensure it uses callback pattern (not direct navigation)
3. Test all password-protected features in Google Sites iframe
4. Update all pages to use unified password system if possible

## PASSWORDS TO CHECK

- All pages check manager_passwords table for SYSTEM_MASTER_PASSWORD
- foh-checklists.html has ADDITIONAL watchdog password system
- Some pages use localStorage for custom passwords

## REMEMBER

**ALWAYS use callbacks for navigation after password validation!**
Never navigate directly from password modal in iframe environment.
