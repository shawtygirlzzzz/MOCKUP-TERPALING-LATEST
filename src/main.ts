import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import App from './App.vue'
import router from './router'
import './styles.css'

export const themes = {
  light: { dark:false, colors:{primary:'#008842','on-primary':'#FFFFFF',secondary:'#A0C626',background:'#eef2f6',surface:'#FFFFFF','on-surface':'#212121',info:'#0284C7',success:'#00c853',warning:'#D97706',error:'#DC2626'} },
  lightblue: { dark:false, colors:{primary:'#0F9D9A','on-primary':'#FFFFFF',secondary:'#2563EB',background:'#F8FAFC',surface:'#FFFFFF','on-surface':'#0F172A',info:'#0284C7',success:'#16A34A',warning:'#D97706',error:'#DC2626'} },
  dark: { dark:true, colors:{primary:'#008842','on-primary':'#FFFFFF',secondary:'#A0C626',background:'#424242',surface:'#2A2A2A','on-surface':'#FFFFFF',info:'#03c9d7',success:'#00c853',warning:'#FDF101',error:'#f44336'} },
  darkblue: { dark:true, colors:{primary:'#00B4D8','on-primary':'#031726',secondary:'#38BDF8',background:'#0B132B',surface:'#1C2541','on-surface':'#F8FAFC',info:'#38BDF8',success:'#10B981',warning:'#F59E0B',error:'#EF4444'} }
}
const saved = localStorage.getItem('kotra-theme')
const vuetify = createVuetify({components,directives,icons:{defaultSet:'mdi',aliases,sets:{mdi}},theme:{defaultTheme:saved && saved in themes?saved:'lightblue',themes}})
createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')
