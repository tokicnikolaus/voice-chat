import { AxiosResponse } from 'axios'
import axios from '@/services/axios'

export default abstract class AuthApi {
  public static route = process.env.VUE_APP_AUTH_BASE_URI

  public static async login(
    username: string,
    password: string,
  ): Promise<AxiosResponse> {
    return await axios.post(`${this.route}/login`, {
      username: username,
      password: password,
    })
  }

  public static async refreshToken(
    refreshToken: string,
  ): Promise<AxiosResponse> {
    return await axios.post(`${this.route}/refresh-token`, {
      refresh_token: refreshToken,
    })
  }

  public static async logout(refreshToken: string): Promise<AxiosResponse> {
    return await axios.post(`${this.route}/logout`, {
      refresh_token: refreshToken,
    })
  }
}
