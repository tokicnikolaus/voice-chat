/**
 * Snippets to add to your Vue Router (src/router/index.ts).
 * - Import Login and add the route.
 * - Add helper functions and the beforeEach guard logic below.
 */

// 1) Route for login (add to your routes array):
/*
{
  path: '/',
  name: 'login.login',
  component: Login,
  meta: {
    title: 'FF | Login',
    auth: false,
  },
},
*/

// 2) Helper functions (add before creating the router):
/*
function visiting(route: string, location: string) {
  return route === location
}

function tokenSet(token: string) {
  return localStorage.getItem(token) !== null
}

function preferredArena() {
  return localStorage.getItem('preferred_arena')
}

function getUser() {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isRole(roles: Array<string>) {
  const user = getUser()
  if (!user) return false
  const userRoles = user.roles || []
  return userRoles.some((r: string) => roles.includes(r))
}
*/

// 3) In router.beforeEach (after any updateToken call):
/*
  if (!tokenSet('access_token') && to.matched.some((m) => m.meta.auth)) {
    next('/')
  } else if (tokenSet('access_token') && visiting(to.path, '/')) {
    next(
      `/${preferredArena() ? preferredArena() + '/' : ''}${
        isRole(['admin', 'manager']) ? 'admin' : 'employee'
      }-dashboard`
    )
  } else {
    next()
  }
*/
