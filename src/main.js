import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/tailwind.css'
import './assets/motion.css'

const app=createApp(App)
app.config.errorHandler=(error)=>{console.error(error);import('./composables/useToast').then(({toast})=>toast(error.message??'Ошибка операции'))}
app.use(router).mount('#app')
