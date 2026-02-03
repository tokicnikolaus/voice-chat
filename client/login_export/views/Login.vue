<template>
  <v-container class="login pa-0" fill-height fluid>
    <v-col cols="12">
      <v-row align="center" justify="center">
        <v-col cols="12" class="text-center">
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-img
                :width="$vuetify.breakpoint.smAndUp ? '700px' : '400px'"
                :src="require('@/assets/FriendlyFireColored.png')"
                alt="Friendly Fire Logo"></v-img>
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="12" sm="8" md="4" class="px-8">
          <v-card class="elevation-12">
            <v-toolbar class="main-gradient-background" dark flat>
              <v-toolbar-title>{{ $t('login.login') }}</v-toolbar-title>
            </v-toolbar>
            <v-form @submit.prevent="login" method="POST" ref="form">
              <v-card-text class="text-center pb-0">
                <v-text-field
                  v-model="credential"
                  :rules="[required]"
                  :label="$t('entities.users.attributes.username')"
                  prepend-icon="person"></v-text-field>
                <v-text-field
                  v-model="password"
                  @click:append="showPassword = !showPassword"
                  :rules="[required]"
                  :append-icon="showPassword ? 'visibility' : 'visibility_off'"
                  :type="showPassword ? 'text' : 'password'"
                  :label="$t('login.password')"
                  prepend-icon="lock"></v-text-field>
                <span v-if="invalidCredentials" class="error-notice">
                  {{ $t('login.invalidCredentials') }}
                </span>
                <span v-if="insufficientPermissions" class="error-notice">
                  {{ $t('login.insufficientPermissions') }}
                </span>
                <span v-if="unexpectedError" class="error-notice">
                  {{ unexpectedError }}
                </span>
                <span v-if="banned" class="error-notice">
                  {{ $t('login.banned') }}
                </span>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  :loading="loggingIn || fetchingUser"
                  :disabled="loggingIn || fetchingUser"
                  color="primary"
                  class="px-8"
                  type="submit"
                  depressed
                  large>
                  <span>{{
                    !(loggingIn || fetchingUser)
                      ? $t('login.login')
                      : $t('login.loggingIn')
                  }}</span>
                </v-btn>
                <v-spacer></v-spacer>
              </v-card-actions>
            </v-form>
          </v-card>
        </v-col>
      </v-row>
    </v-col>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import AuthApi from '@/services/auth/AuthApi'
import User from '@/models/users/User'
import UserSetting from '@/models/users/UserSetting'

import required from '@/mixins/rules/required'
import updateTheme from '@/mixins/update-theme'
import updateLanguage from '@/mixins/update-language'
import { app } from '@/main'

export default Vue.extend({
  props: ['loggedIn'],

  mixins: [required],

  data: () => ({
    loggingIn: false,
    fetchingUser: false,
    showPassword: false,
    invalidCredentials: false,
    insufficientPermissions: false,
    unexpectedError: null,
    banned: false,
    credential: '',
    password: '',
  }),

  methods: {
    async login() {
      this.invalidCredentials = false
      this.insufficientPermissions = false
      this.unexpectedError = null
      this.banned = false

      const formValidation = (
        this.$refs.form as Vue & { validate: () => boolean }
      ).validate()
      if (!formValidation) {
        return
      }

      try {
        this.loggingIn = true
        await AuthApi.login(this.credential, this.password)
          .then(async (resp) => {
            const accessToken = resp.data.access_token
            const refreshToken = resp.data.refresh_token
            const now = new Date()
            const expiryDate = new Date(
              now.getTime() + resp.data.expires_in * 1000,
            )

            localStorage.setItem('access_token', accessToken)
            localStorage.setItem('refresh_token', refreshToken)
            localStorage.setItem('expiry_date', expiryDate.toString())

            this.$store.commit('setAuthenticated', true)

            this.fetchingUser = true
            await this.fetchUser(this.credential)
          })
          .catch((error) => {
            if (!error.response) {
              this.unexpectedError = error
            } else {
              if (error.response.status === 401) {
                this.invalidCredentials = true
              } else {
                if (error.response.data && error.response.data.message) {
                  this.unexpectedError = error.response.data.message
                } else {
                  this.unexpectedError = error.response
                }
              }
            }
          })
      } catch (error) {
        console.warn('Login API failed')
      } finally {
        this.loggingIn = false
      }
    },
    async fetchUser(username: string) {
      try {
        await User.api
          .findByUsername(username)
          .then(async (response) => {
            let user = response.data

            if (user.banned) {
              this.banned = true
              return
            }

            const hasPermissions = user.roles.some(function (role: string) {
              return ['admin', 'employee', 'manager'].includes(role)
            })

            if (!hasPermissions) {
              this.insufficientPermissions = true
              return
            }

            user = {
              id: user.id,
              credential: this.credential,
              initials: user.username.substring(0, 2),
              name: user.identity ? user.identity.name : null,
              email: user.email ? user.email.address : null,
              username: user.username,
              pidn: user.identity ? user.identity.pidn : null,
              roles: user.roles,
              avatar: user.avatar,
              keycloak_id: user.keycloak_id,
              settings: await this.fetchUserDashboardSettings(user.id),
            }

            localStorage.setItem('user', JSON.stringify(user))

            let params = {}

            const preferredArena = localStorage.getItem('preferred_arena')

            if (preferredArena) {
              params = {
                arena: preferredArena,
              }
            }

            const isAdminOrManager = user.roles.some((r: string) =>
              ['admin', 'manager'].includes(r),
            )
            updateTheme(user.settings.theme, app)
            updateLanguage(user.settings.language)
            await this.$router.push({
              name: `navigationDrawer.main.${
                isAdminOrManager ? 'admin' : 'employee'
              }Dashboard`,
              params: params,
            })
          })
          .catch((error) => {
            if (!error.response) {
              this.unexpectedError = error
            } else {
              if (error.response.data && error.response.data.message) {
                this.unexpectedError = error.response.data.message
              } else {
                this.unexpectedError = error.response
              }
            }
          })
      } catch (e) {
        console.warn(`User API failed.`)
        console.log(e)
        localStorage.clear()
        this.$store.commit('setAuthenticated', false)
      } finally {
        this.fetchingUser = false
      }
    },
    async fetchUserDashboardSettings(id: bigint) {
      const defaultSettings = {
        theme: process.env.VUE_APP_THEME || 'Classic',
        language: process.env.VUE_APP_I18N_LOCALE || 'en',
      }
      try {
        const response = await User.api.getSettingsByNamespace(id, 'dashboard')
        response.data.map((setting: UserSetting) => {
          if (setting.key === 'theme') {
            defaultSettings.theme = setting.value
          }
          if (setting.key === 'language') {
            defaultSettings.language = setting.value
          }
        })
      } catch (e) {
        console.warn(`User Settings API failed.`)
        console.log(e)
      }
      return defaultSettings
    },
  },
})
</script>

<style lang="scss">
.login {
  background: url('../assets/Background.png'),
    linear-gradient(
      180deg,
      var(--v-first-gradient-level-base) 12.88%,
      var(--v-second-gradient-level-base) 92.93%
    ),
    var(--v-third-gradient-level-base);
}

/* Removes Google Chrome auto finish input styling */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:active,
input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
  -webkit-text-fill-color: #000 !important;
}

.error-notice {
  font-size: 12px;
  color: rgb(255, 82, 82);
}
</style>
