import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PostView from '../views/PostView.vue'
import AboutView from '../views/AboutView.vue'
import AdminView from '../views/AdminView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/post/:slug', name: 'post', component: PostView, props: true },
    { path: '/about', name: 'about', component: AboutView },
    { path: '/admin', name: 'admin', component: AdminView },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
