/**
 * Automatically load each component
 * Each component has a separate folder and must have a name option
 */
import Vue from 'vue'

const files = require.context('./', true, /\.vue$/)

files.keys().forEach(key => {
  const component = files(key).default
  Vue.component(component.name, component)
})
