# 🚨 CRITICAL: iframe Navigation in Google Sites Environment

**Date:** November 3, 2025
**Issue:** Password protected buttons causing 404 errors

## THE PROBLEM

When using `window.location.href` in an iframe (Google Sites), navigation BREAKS:
- ❌ 404 errors after password submission
- ❌ Cross-origin frame access errors
- ❌ Pages don't load properly

## THE SOLUTION

**ALWAYS use `window.top.location.href` for navigation in this app!**

```javascript
// ❌ WRONG - Does NOT work in iframe
window.location.href = 'cash.html';

// ✅ CORRECT - Works in iframe
if (window.top) {
  window.top.location.href = 'cash.html';
} else {
  window.location.href = 'cash.html';
}
```

## WHY THIS MATTERS

This app runs inside a Google Sites iframe. Navigation from within the iframe must target the TOP window, not the iframe itself.

## APPLIES TO

- ✅ Password modals (app-header.js)
- ✅ All navigation links
- ✅ Redirects after authentication
- ✅ Any `window.location` usage

## TESTING CHECKLIST

Before deploying password/navigation code:

1. ✅ Does code use `window.top.location.href`?
2. ✅ Tested in production Google Sites iframe?
3. ✅ Verified no 404 errors?
4. ✅ Cross-origin errors checked?

## FILES USING THIS FIX

- `app-header.js` (lines 182, 200) - Password redirects

## REMEMBER

**When user says "STAFF NEED THIS WORKING" → iframe navigation issue!**

Never use `window.location.href` in this codebase. Always use `window.top.location.href`.
