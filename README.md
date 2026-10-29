# Kotra Hub Onboarding — Dashboard UI

Vue 3 + Vuetify 3 + TypeScript + Pinia frontend prototype. Updated shell based on provided Kotra Hub dashboard screenshots, with sidebar, toolbar, notification menu, theme switcher and responsive cards. Four themes are adapted from the supplied theme reference files: Light, Light Blue, Dark, Dark Blue.

## Run

```bash
npm install
npm run dev
```

Employee: `EMP001` / `Welcome123!`; HR: `HR001` / `Welcome123!`.

Employee → Get Started → Letter of Undertaking → fill four property acknowledgments → Submit to HR. Log out and log in as HR → Review Checklist → Verify & Approve. Log back in as employee → approval acknowledgment on dashboard and notification bell.

**Prototype only:** Local browser storage is used, so use the same browser profile to test both roles. No real authentication, notification delivery, attendance proof or legally verified signatures. Disabled sidebar modules are visual placeholders. Only HR Induction is functional. Production integration requires server-side authentication, approvals, audit logs, and access enforcement.
