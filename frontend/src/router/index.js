import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PostView from '../views/PostView.vue'
import AboutView from '../views/AboutView.vue'
import AdminView from '../views/AdminView.vue'
import UserView from '../views/UserView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/post/:slug', name: 'post', component: PostView, props: true },
    { path: '/u/:username', name: 'user', component: UserView, props: true },
    {
      path: '/u/:username/dashboard',
      name: 'user-dashboard',
      component: DashboardView,
      props: true,
    },
    { path: '/about', name: 'about', component: AboutView },
    { path: '/tools', name: 'tools', component: () => import('../views/ToolsView.vue') },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('../views/MessagesView.vue'),
    },
    {
      path: '/messages/:username',
      name: 'messages-user',
      component: () => import('../views/MessagesView.vue'),
      props: true,
    },
    { path: '/admin', name: 'admin', component: AdminView },
    { path: '/search', redirect: '/' },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const id = to.hash.replace(/^#/, '')
          const el = document.getElementById(id)
          if (el) {
            resolve({ el: to.hash, behavior: 'smooth', top: 72 })
          } else {
            resolve(false)
          }
        }, 350)
      })
    }
    return { top: 0 }
  },
})

export default router
