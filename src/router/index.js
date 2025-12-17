import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import OrderView from '../views/OrderView.vue';
import FinanceView from '../views/FinanceView.vue';
import AdminView from '../views/AdminView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/order',
    name: 'order',
    component: OrderView
  },
  {
    path: '/finance',
    name: 'finance',
    component: FinanceView
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
