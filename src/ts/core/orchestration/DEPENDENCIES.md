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
| `feature:lifecycle` | `userLoginSuccess.ts` → `featureLifecycleRegistry.initializeAll()` | Mounts Admin tab if user is admin (lazy), shows `#admin`/`#Admin` nav elements. Bereitschaft/EWT/Neben are **not** mounted here — `aktivierteTabs` isn't known yet at this point (it lives on `vorgabenU.Einstellungen`, fetched later in `data:selectYear`) |
| `ui:autoSaveIndicator` | `userLoginSuccess.ts` → `initAutoSaveIndicator()` | Starts the AutoSave status badge/indicator |
| `data:selectYear` | `userLoginSuccess.ts` → `selectYear()` → `loadUserDaten.ts` | Fetches and populates year data from server/storage; also calls `syncFeatureTabs(aktivierteTabs)` (`core/orchestration/syncFeatureTabs.ts`), which mounts/unmounts the Bereitschaft/EWT/Neben Preact tab content via `featureLifecycleRegistry` — re-evaluated on every year/month change, not just login |

## Hook Bindings (registered in main.ts)

| Hook | Handler | Registered by |
|------|---------|--------------|
| `auth:failure` | `logoutUser` | `main.ts` |
| `network:reconnect` | `changeMonatJahr` | `main.ts` |
| `pre-save:settings` | `saveEinstellungen` | `main.ts` |

### Event Subscriptions

| Event Channel | Subscriber | Registered by |
|---------------|-----------|--------------|
| `data:changed` | `aktualisiereBerechnung` | `features/Berechnung/index.ts` |

## Logout Teardown

`logoutUser.ts` calls `featureLifecycleRegistry.teardownAll()` which unmounts the Admin tab and, if
currently mounted, Bereitschaft/EWT/Neben. It also calls `resetFeatureTabSync()`
(`core/orchestration/syncFeatureTabs.ts`) so the next login's `syncFeatureTabs` call doesn't think a
feature is still mounted when `teardownAll()` just unmounted it independently of that module's own tracking.
All other cleanup (Storage.clear, UI resets) runs synchronously in the same function.
