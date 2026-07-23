import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import pinia from './store'
import './styles/index.css'

createApp(App).use(pinia).use(router).use(ElementPlus, { locale: zhCn }).mount('#app')
