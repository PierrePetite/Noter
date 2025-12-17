import { createRouter, createWebHistory } from 'vue-router';
import apiClient from '../api/client';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/setup',
      name: 'Setup',
      component: () => import('../views/SetupView.vue'),
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      redirect: '/notes',
    },
    {
      path: '/notes',
      name: 'Notes',
      component: () => import('../views/NotesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notes/:id',
      name: 'NoteEditor',
      component: () => import('../views/NoteEditorView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/import',
      name: 'Import',
      component: () => import('../views/ImportView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('../views/AdminView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
});

// Setup-Check beim App-Start
let setupChecked = false;

router.beforeEach(async (to, from, next) => {
  // Setup-Check nur einmal durchführen
  if (!setupChecked && to.name !== 'Setup') {
    try {
      const response = await apiClient.get('/setup/status');
      if (response.data.data.setupRequired) {
        setupChecked = true;
        return next('/setup');
      }
    } catch (error) {
      console.error('Setup check failed:', error);
    }
    setupChecked = true;
  }

  // Auth-Check
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return next('/login');
  }

  // Admin-Check
  if (to.meta.requiresAdmin) {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      return next('/login');
    }

    try {
      const user = JSON.parse(userJson);
      if (!user.isAdmin) {
        console.warn('Access denied: Admin rights required');
        return next('/notes'); // Redirect to notes if not admin
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return next('/login');
    }
  }

  // Wenn eingeloggt und auf Login/Setup -> redirect zu Home
  if ((to.name === 'Login' || to.name === 'Setup') && localStorage.getItem('token')) {
    return next('/');
  }

  next();
});

export default router;
