import Vue from 'vue'
import App from './app.vue'
import router from './router'
import store from './store'
import './config'

import('./dynamic').then(() => {
  new Vue({
    router,
    store,
    el: '#app',
    render: h => h(App),
  })
})
