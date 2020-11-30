const routes = [
  {
    path: '/',
    component: () => import('src/view/index/index.vue')
  },
  {
    path: '/count',
    component: () => import('src/view/count/count.vue')
  }
]

export default routes
