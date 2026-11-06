import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import './style.css'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    // Pick up new hashed chunks after Cloudflare Pages deploys.
    window.setInterval(() => {
      registration.update().catch(() => {})
    }, 60 * 60 * 1000)
  },
})

createApp(App).use(router).mount('#app')
