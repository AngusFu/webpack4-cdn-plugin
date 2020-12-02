import Vue from 'vue'
import Vuex from 'vuex'

const modules = {}

const files = require.context('./modules', false, /\.js$/)

files
  .keys()
  .forEach(
    key => (modules[key.replace(/(\.\/|\.js)/g, '')] = files(key).default)
  )

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'

export default new Vuex.Store({
  modules,
  strict: debug
})
