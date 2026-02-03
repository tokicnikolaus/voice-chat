# App.vue – show login without layout

When the user is on the login path or not authenticated, render only the router view (no app bar, no drawer).

```html
<template v-if="login() || !$store.getters.authenticated">
  <router-view />
</template>
<template v-else>
  <!-- your main layout: nav, drawer, router-view, etc. -->
</template>
```

Method:

```js
methods: {
  login() {
    return this.$router.currentRoute.path === '/'
  },
}
```

Ensure your Vuex store has:
- `authenticated` getter (e.g. true when `access_token` is present or a dedicated state).
- `setAuthenticated` mutation (used by Login.vue after successful login).
