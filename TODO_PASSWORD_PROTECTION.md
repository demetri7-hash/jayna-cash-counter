# TODO: Complete Password Protection for Manager Logs Links

## What Was Completed (Oct 26, 2025)

✅ **index.html** - DONE
- Manager Logs link uses password protection
- Added `accessManagerLogs()` function
- Updated `submitManagerPassword()` to support custom passwords from `localStorage.customPasswords`

✅ **catering.html** - DONE
- Manager Logs link uses password protection
- Added complete password protection system (all functions)
- Supports custom passwords from `localStorage.customPasswords`

## What Still Needs to Be Done

⚠️ **Remaining Pages Need Password Protection:**

### 1. manager.html
**Location:** Line ~820-821
**Current code:**
```html
<a href="managerlogs.html" style="...">MANAGER LOGS</a>
```

**Need to:**
1. Add password protection functions before `</script>` (line ~3372)
2. Update link to: `<a href="javascript:void(0)" onclick="requirePasswordFor('Manager Logs', accessManagerLogs)" style="..." cursor: pointer;">MANAGER LOGS</a>`

### 2. boh.html
**Location:** Line ~464-466
**Current code:**
```html
<a href="managerlogs.html" style="...">MANAGER LOGS</a>
```

**Need to:**
1. Add password protection functions before `</script>`
2. Update link (same as above)

### 3. foh-checklists.html
**Location:** Line ~464-466
**Current code:**
```html
<a href="managerlogs.html" style="...">MANAGER LOGS</a>
```

**Need to:**
1. Add password protection functions before `</script>`
2. Update link (same as above)

### 4. cogs.html
**Location:** Line ~282-284
**Current code:**
```html
<a href="managerlogs.html" style="...">MANAGER LOGS</a>
```

**Need to:**
1. Add password protection functions before `</script>`
2. Update link (same as above)

---

## Password Protection Code to Add

Add this code before `</script>` in each remaining file:

```javascript
    // ==================== PASSWORD PROTECTION FOR MANAGER LOGS ====================
    const ADMIN_PASSWORD = 'JaynaGyro2025!';

    function isManagerSessionValid() {
      const sessionExpiry = localStorage.getItem('managerSession');
      if (!sessionExpiry) return false;
      const now = new Date().getTime();
      const expiryTime = parseInt(sessionExpiry);
      if (now > expiryTime) {
        localStorage.removeItem('managerSession');
        return false;
      }
      return true;
    }

    function setManagerSession() {
      const now = new Date().getTime();
      const expiryTime = now + (60 * 60 * 1000); // 1 hour from now
      localStorage.setItem('managerSession', expiryTime.toString());
    }

    function accessManagerLogs() {
      window.location.href = 'managerlogs.html';
    }

    function requirePasswordFor(featureName, callback) {
      if (isManagerSessionValid()) {
        callback();
        return;
      }
      showManagerPasswordModal(featureName, callback);
    }

    function showManagerPasswordModal(featureName, callback) {
      const modalHTML = `
        <div id="passwordModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; justify-content: center; align-items: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: white; padding: 30px; border-radius: 0; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 400px; width: 90%; text-align: center;">
            <h3 style="margin: 0 0 20px 0; color: #d32f2f;">Manager Access Required</h3>
            <p style="margin: 0 0 15px 0; line-height: 1.4;"><strong>${featureName}</strong> requires manager authorization.</p>
            <p style="margin: 0 0 20px 0; color: #666;">This feature contains sensitive information and management tools.</p>
            <p style="margin: 0 0 15px 0;">Enter manager password:</p>
            <input type="password" id="passwordInput" style="width: 80%; padding: 10px; border: 2px solid #ddd; border-radius: 0; font-size: 16px; text-align: center; margin-bottom: 20px;" placeholder="Manager Password">
            <div>
              <button onclick="submitManagerPassword()" style="background: #4a4a4a; color: white; border: none; padding: 10px 20px; border-radius: 0; margin: 0 10px; cursor: pointer; font-size: 16px;">Access ${featureName}</button>
              <button onclick="cancelManagerPassword()" style="background: #D32F2F; color: white; border: none; padding: 10px 20px; border-radius: 0; margin: 0 10px; cursor: pointer; font-size: 16px;">Cancel</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      document.getElementById('passwordInput').focus();
      window.managerPasswordCallback = callback;
      document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') submitManagerPassword();
      });
    }

    function submitManagerPassword() {
      const password = document.getElementById('passwordInput').value;
      const modal = document.getElementById('passwordModal');
      const customPasswords = JSON.parse(localStorage.getItem('customPasswords') || '[]');
      const validPasswords = [ADMIN_PASSWORD, ...customPasswords];

      if (validPasswords.includes(password)) {
        setManagerSession();
        modal.remove();
        alert('Manager access granted for 1 hour');
        window.managerPasswordCallback();
      } else {
        alert('Incorrect manager password. Access denied.');
        modal.remove();
      }
    }

    function cancelManagerPassword() {
      document.getElementById('passwordModal').remove();
    }
    // ==================== END PASSWORD PROTECTION ====================
```

---

## Testing Checklist

After completing all 4 files, test:

1. ✅ Click "MANAGER LOGS" from index.html → should show password modal
2. ✅ Click "MANAGER LOGS" from catering.html → should show password modal
3. ⚠️ Click "MANAGER LOGS" from manager.html → should show password modal
4. ⚠️ Click "MANAGER LOGS" from boh.html → should show password modal
5. ⚠️ Click "MANAGER LOGS" from foh-checklists.html → should show password modal
6. ⚠️ Click "MANAGER LOGS" from cogs.html → should show password modal

**Test passwords:**
- Default: `JaynaGyro2025!`
- Custom: Add via `localStorage.setItem('customPasswords', JSON.stringify(['test123']))`

---

## ALSO FIX: Manager Button in managerlogs.html

⚠️ **INCONSISTENT MANAGER BUTTON:**

**Current (WRONG) in managerlogs.html:**
```html
<a href="manager.html" class="menu-btn" style="...">Manager</a>
```

**Should be (like all other pages):**
```html
<button class="menu-btn" onclick="requirePasswordFor('Tip Pool Calculator', showTipPool)" style="background: var(--gray-900) !important; color: white !important; border-color: var(--gray-900) !important;">Manager</button>
```

**Or if tip pool doesn't make sense on managerlogs.html, should link to:**
```html
<a href="manager.html" class="menu-btn" style="background: var(--gray-900) !important; color: white !important; border-color: var(--gray-900) !important; text-decoration: none;">Manager</a>
```

**Decision:** Check what the Manager button does on other pages (FOH, BOH, Catering) and make managerlogs.html consistent.

---

## Current Status

**Safe to deploy:** Yes - index.html and catering.html are protected, other pages have direct links (no password yet, but won't break)

**Next session:**
1. Fix Manager button in managerlogs.html to be consistent
2. Complete password protection for remaining 4 files carefully, one at a time, testing after each change.
