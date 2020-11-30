<template>
  <div class="demo">
    <button @click="increment">+1</button>
    <button @click="decrement">-1</button>
    <p>count: {{ count }}</p>
    <router-link to="/">back</router-link>
  </div>
</template>
<script>
import { mapActions, mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      count: 'getCount'
    })
  },
  methods: {
    ...mapActions(['increment', 'decrement'])
  }
}
</script>
