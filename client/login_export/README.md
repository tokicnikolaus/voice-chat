# Login export – copy to your frontend

This folder contains everything needed to reuse the login flow from this dashboard in another Vue/Vuetify frontend.

## What’s inside

| Path in this folder | Copy to (in your project) |
|---------------------|---------------------------|
| `views/Login.vue` | `src/views/Login.vue` |
| `services/auth/AuthApi.ts` | `src/services/auth/AuthApi.ts` |
| `services/axios.example.ts` | `src/services/axios.ts` (merge with your existing axios if you have one) |
| `mixins/rules/required.ts` | `src/mixins/rules/required.ts` |
| `locales/en.login.json` | Merge the keys into your `src/locales/en.json` (and other locales) |
| `assets/FriendlyFireColored.png` | `src/assets/FriendlyFireColored.png` |
| `assets/Background.png` | `src/assets/Background.png` |

See `router-example.ts` and `App-excerpt.md` for **snippets** to add to your router and App.vue (not full files).

## Env

- `VUE_APP_AUTH_BASE_URI` – base URL for auth API (e.g. `https://api.example.com/auth`).
- Backend login endpoint: `POST {VUE_APP_AUTH_BASE_URI}/login` with body `{ username, password }`.
- Response: `{ access_token, refresh_token, expires_in }`.

## Dependencies of Login.vue

- **Vuex**: `setAuthenticated` mutation and `authenticated` getter.
- **Vuetify**: `v-container`, `v-card`, `v-form`, `v-text-field`, `v-btn`, etc.
- **vue-i18n**: `$t('login.*')`, `$t('entities.users.attributes.username')`, `$t('validation.required')`.
- **Optional (full flow)**: `User` model API (`findByUsername`), `UserSetting`, `updateTheme`, `updateLanguage`, `@/main`.  
  If you don’t have these, you can simplify Login.vue: after storing tokens and `setAuthenticated(true)`, redirect to `/dashboard` (or your home) and skip `fetchUser` / user settings.

## Router

- Add a route for `/` (or `/login`) with `component: Login` and `meta: { auth: false }`.
- In `beforeEach`: if no token and route has `meta.auth === true` → `next('/')`; if token and path is login → `next('/dashboard')` (or your default).

Full guard and helper snippets are in `router-example.ts`.

## App.vue

When on the login path, render only `<router-view />` (no app bar / drawer). Example:

```html
<template v-if="$router.currentRoute.path === '/' || !$store.getters.authenticated">
  <router-view />
</template>
<template v-else>
  <!-- your main layout with nav, etc. -->
</template>
```

Details in `App-excerpt.md`.
