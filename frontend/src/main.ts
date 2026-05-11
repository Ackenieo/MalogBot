import { createApp } from 'vue'
import App from './App.vue'
import pinia from './stores/pinia'
import router from './router'
import './styles/globals.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

app.config.errorHandler = (err, instance, info) => {
  console.error('[GlobalErrorHandler] Unhandled error:', err)
  console.error('[GlobalErrorHandler] Component:', instance?.$options?.name || 'Unknown')
  console.error('[GlobalErrorHandler] Info:', info)
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[GlobalErrorHandler] Unhandled promise rejection:', event.reason)
})

app.mount('#app')
