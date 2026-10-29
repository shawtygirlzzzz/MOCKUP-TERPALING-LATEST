
import {
  createRouter,
  createWebHistory,
} from "vue-router";

import LoginView from "../views/LoginView.vue";
import EmployeeView from "../views/EmployeeView.vue";
import HRView from "../views/HRView.vue";
import TemplateBuilderView from "../views/TemplateBuilderView.vue";

import { useOnboardingStore } from "../stores/onboarding";

// ==========================================
// 1. CREATE ROUTER
// ==========================================

const router = createRouter({
  history: createWebHistory(),

  routes: [
    // ======================================
    // LOGIN PAGE
    // ======================================

    {
      path: "/",
      name: "login",
      component: LoginView,
    },

    // ======================================
    // EMPLOYEE ONBOARDING DASHBOARD
    // ======================================

    {
      path: "/employee",
      name: "employee",
      component: EmployeeView,
      meta: {
        requiresAuth: true,
        role: "EMPLOYEE",
      },
    },

    // ======================================
    // HR DASHBOARD
    // ======================================

    {
      path: "/hr",
      name: "hr",
      component: HRView,
      meta: {
        requiresAuth: true,
        role: "HR",
      },
    },

    // ======================================
    // HR TEMPLATE BUILDER
    // ======================================

    {
      path: "/hr/template-builder",
      name: "template-builder",
      component: TemplateBuilderView,
      meta: {
        requiresAuth: true,
        role: "HR",
      },
    },

    // ======================================
    // UNKNOWN ROUTES
    // ======================================

    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

// ==========================================
// 2. NAVIGATION GUARD
// ==========================================

router.beforeEach((to) => {
  const store = useOnboardingStore();

  const user = store.user;

  // ----------------------------------------
  // A. USER IS NOT LOGGED IN
  // ----------------------------------------

  if (!user) {
    // Allow access to login page
    if (to.path === "/") {
      return true;
    }

    // Redirect all protected pages to login
    return "/";
  }

  // ----------------------------------------
  // B. USER IS ALREADY LOGGED IN
  // ----------------------------------------

  // Prevent logged-in users from
  // returning to the login page.
  if (to.path === "/") {
    return user.role === "HR"
      ? "/hr"
      : "/employee";
  }

  // ----------------------------------------
  // C. CHECK AUTHENTICATION
  // ----------------------------------------

  if (to.meta.requiresAuth && !user) {
    return "/";
  }

  // ----------------------------------------
  // D. CHECK ROLE PERMISSIONS
  // ----------------------------------------

  const requiredRole = to.meta.role;

  if (
    requiredRole === "HR" &&
    user.role !== "HR"
  ) {
    return "/employee";
  }

  if (
    requiredRole === "EMPLOYEE" &&
    user.role !== "EMPLOYEE"
  ) {
    return "/hr";
  }

  // ----------------------------------------
  // E. ALLOW NAVIGATION
  // ----------------------------------------

  return true;
});

// ==========================================
// 3. EXPORT ROUTER
// ==========================================

export default router;
