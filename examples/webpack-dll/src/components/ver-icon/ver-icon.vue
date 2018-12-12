<template>
  <div class="svg-icon">
    <div class="label">{{label}}</div>
    <div class="ver">{{ver}}</div>
  </div>
</template>
<script>
export default {
  name: 'ver-icon',
  props: ['label', 'ver']
}
</script>
<style lang="stylus" scoped>
$border-radius = 4px
.svg-icon
  display flex
  line-height 20px
  font-family: Verdana, sans-serif
  font-size 12px
  color #fff
  text-shadow 1px 1px #333
  div
    background #333
    border-radius $border-radius 0 0 $border-radius
    padding: 0 8px
    &.ver
      background #007ec6
      border-radius 0 $border-radius $border-radius 0
</style>
