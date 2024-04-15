import { createApp } from 'vue'
import App from './renderer/App.vue'

// Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'

import { createRouter, createWebHashHistory } from 'vue-router';
import Editor from './renderer/components/Editor.vue';

const vuetify = createVuetify({
  components: {
    Editor
  },
 // directives,
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#1867C0',
          secondary: '#5CBBF6',
        },
      },
    },
  },
});

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Conversations',
        component: () => import('@/views/Conversations.vue'),
      },
    ],
  },
  {
    path: '/questions',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Questions',
        component: () => import('@/views/Questions.vue'),
      },
    ],
  },
  {
    path: '/documents',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Documents',
        component: () => import('@/views/Documents.vue'),
      },
    ],
  },
  {
    path: '/tuning',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Tunings',
        component: () => import('@/views/Tuning.vue'),
      },
    ],
  },
  {
    path: '/addons',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Addons',
        component: () => import('@/views/Addons.vue'),
      },
    ],
  },
  {
    path: '/settings',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
      },
    ],
  },
  {
    path: '/authorize',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Authorize',
        component: () => import('@/views/Authorize.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

createApp(App)
  .use(vuetify)
  .use(router)
  .use({
    install(app) { app.config.globalProperties.$api = window.purpleCore; }
  })
  .mount('#app')
