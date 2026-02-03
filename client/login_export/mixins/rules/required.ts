import i18n from '../../i18n'
import VueI18n from 'vue-i18n'

const required = {
  computed: {
    required(): (v: string) => true | VueI18n.TranslateResult {
      return (v: string) => !!v || i18n.t('validation.required')
    },
  },
}

export default required
