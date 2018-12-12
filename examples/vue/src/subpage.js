import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

import('./lib/dynamic.named').then(module => {
  new Vue({
    render: h => h('div', [
      h('div', [module.default]),
      h(App)
    ])
  }).$mount('#app')
})
