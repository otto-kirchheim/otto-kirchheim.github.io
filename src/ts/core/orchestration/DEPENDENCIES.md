# Login Init Dependency Graph

## Sequence (after successful login)

```
storage:user
  ├── ui:year-month
  └── feature:lifecycle
        └── ui:autoSaveIndicator
              └── data:selectYear
```

## Step Details

| Step | File | What happens |
|------|------|-------------|
| `storage:user` | `userLoginSuccess.ts` | Saves Benutzer/Rolle/Email/Version to localStorage |
| `ui:year-month` | `userLoginSuccess.ts` | Sets `#Jahr`/`#Monat` inputs |
| `feature:lifecycle` | `userLoginSuccess.ts` → `featureLifecycleRegistry.initializeAll()` | Mounts Admin tab if user is admin (lazy), shows `#admin`/`#Admin` nav elements |
| `ui:autoSaveIndicator` | `userLoginSuccess.ts` → `initAutoSaveIndicator()` | Starts the AutoSave status badge/indicator |
| `data:selectYear` | `userLoginSuccess.ts` → `selectYear()` | Fetches and populates year data from server/storage |

## Hook Bindings (registered in main.ts)

| Hook | Handler | Registered by |
|------|---------|--------------|
| `auth:failure` | `logoutUser` | `main.ts` |
| `network:reconnect` | `changeMonatJahr` | `main.ts` |
| `post-save` | `aktualisiereBerechnung` | `main.ts` |
| `pre-save:settings` | `saveEinstellungen` | `main.ts` |

## Logout Teardown

`logoutUser.ts` calls `featureLifecycleRegistry.teardownAll()` which unmounts the Admin tab.
All other cleanup (Storage.clear, UI resets) runs synchronously in the same function.
