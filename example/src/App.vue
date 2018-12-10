<template>
  <div id="app">
    <img alt="Vue logo" :src="img">
    <div>
      <button @click="changeImage">change image</button>
      <button @click="loadNamedChunk">load named chunk</button>
      <button @click="loadDynamicChunk">load dynamic chunk</button>
      <button @click="loadExtraCSS">load extra css</button>
    </div>
    <HelloWorld msg="Welcome to Your Vue.js App"/>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
import logo from './assets/logo.png'

export default {
  name: 'app',
  components: {
    HelloWorld
  },
  data () {
    return {
      img: logo
    }
  },
  methods: {
    changeImage () {
      // Just test
      import('./assets/test.svg').then(mod => {
        this.img = mod.default
      })
    },
    loadNamedChunk() {
      import('./lib/dynamic.named.js'/* webpackChunkName: "chunk-foo" */).then(module => {
        alert(module.default)
      })
    },
    loadDynamicChunk () {
      import('./lib/dynamic.js').then(module => {
        alert(module.default)
      })
    },
    loadExtraCSS () {
      import('./test.css')
    }
  }
}
</script>

<style>
body {
  background: url('./assets/backgroud.png') no-repeat 0 0;
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
