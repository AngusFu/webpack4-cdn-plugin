<template>
  <div class="demo">
    <div class="demo-logo vue">
      <ver-icon label="vue" ver="v2.5.17"></ver-icon>
    </div>
    <div class="demo-logo webpack">
      <ver-icon label="webpack" ver="v4.16.5"></ver-icon>
    </div>
    <div class="demo-logo" style="text-align: center">
      <router-link to="count">
        <p><img :src="image" v-if="image" width="50" /></p>
        <p>vuex demo counter</p>
      </router-link>
    </div>
  </div>
</template>

<style lang="stylus" scoped>
.vue
  background-image url('~src/assets/images/vue.png')
.webpack
  background-image url('~src/assets/images/webpack.svg')
</style>

<script>
import image from '../../assets/images/image.png'

export default {
  data () {
    return {
      image
    }
  }
}
</script>
