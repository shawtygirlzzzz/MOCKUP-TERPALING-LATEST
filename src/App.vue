
<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTheme } from "vuetify";
import { useOnboardingStore } from "./stores/onboarding";

// ==========================================
// 1. STORES AND ROUTER
// ==========================================

const store = useOnboardingStore();

const router = useRouter();
const route = useRoute();

const theme = useTheme();

// ==========================================
// 2. UI STATE
// ==========================================

const drawer = ref(true);
const notificationsOpen = ref(false);
const search = ref("");

const currentTheme = ref(
  theme.global.name.value
);

// ==========================================
// 3. THEME OPTIONS
// ==========================================

const themeOptions = [
  {
    title: "Light Blue",
    value: "lightblue",
  },
  {
    title: "Light",
    value: "light",
  },
  {
    title: "Dark Blue",
    value: "darkblue",
  },
  {
    title: "Dark",
    value: "dark",
  },
];

function changeTheme(value: string): void {
  theme.global.name.value = value;
  currentTheme.value = value;

  localStorage.setItem(
    "kotra-theme",
    value
  );
}

// ==========================================
// 4. NOTIFICATIONS
// ==========================================

const notice = computed(() => {
  if (store.user?.role === "HR") {
    return `${store.pending.length} employee submission(s) awaiting HR verification`;
  }

  if (store.current?.status === "COMPLETED") {
    return "Your HR Induction has been approved by HR.";
  }

  if (
    store.current?.status ===
    "CHANGES_REQUESTED"
  ) {
    return "HR requested changes to your Letter of Undertaking.";
  }

  if (
    store.current?.status ===
    "PENDING_HR"
  ) {
    return "Your Letter of Undertaking is pending HR verification.";
  }

  return "Complete your HR Induction checklist to begin onboarding.";
});

// ==========================================
// 5. SIDEBAR MENU
// ==========================================

interface MenuItem {
  title: string;
  icon: string;
  to?: string;
  role?: "HR" | "EMPLOYEE";
  disabled?: boolean;
}

const menu = computed<MenuItem[]>(() => {
  const dashboardPath =
    store.user?.role === "HR"
      ? "/hr"
      : "/employee";

  const items: MenuItem[] = [
    {
      title: "Dashboard",
      icon: "mdi-view-dashboard-outline",
      to: dashboardPath,
    },
    {
      title: "Onboarding",
      icon: "mdi-clipboard-check-outline",
      to: dashboardPath,
    },
    {
      title: "Template Builder",
      icon: "mdi-file-document-edit-outline",
      to: "/hr/template-builder",
      role: "HR",
    },
    {
      title: "Requisitions",
      icon: "mdi-clipboard-text-outline",
      disabled: true,
    },
    {
      title: "Organization",
      icon: "mdi-sitemap-outline",
      disabled: true,
    },
    {
      title: "Inventory",
      icon: "mdi-cart-arrow-down",
      disabled: true,
    },
    {
      title: "Procurement",
      icon: "mdi-cart-outline",
      disabled: true,
    },
    {
      title: "Finance",
      icon: "mdi-finance",
      disabled: true,
    },
    {
      title: "Support",
      icon: "mdi-headset",
      disabled: true,
    },
  ];

  return items.filter(
    (item) =>
      !item.role ||
      item.role === store.user?.role
  );
});

// ==========================================
// 6. ACTIVE SIDEBAR ITEM
// ==========================================

const activeMenu = computed(() => {
  if (
    route.path.startsWith(
      "/hr/template-builder"
    )
  ) {
    return "Template Builder";
  }

  if (
    route.path === "/hr" ||
    route.path === "/employee"
  ) {
    return "Onboarding";
  }

  return "Dashboard";
});

// ==========================================
// 7. NAVIGATION
// ==========================================

function navigate(item: MenuItem): void {
  if (item.disabled || !item.to) {
    return;
  }

  if (
    item.role &&
    item.role !== store.user?.role
  ) {
    return;
  }

  router.push(item.to);
}

function navigateDashboard(): void {
  router.push(
    store.user?.role === "HR"
      ? "/hr"
      : "/employee"
  );
}

function navigateOnboarding(): void {
  navigateDashboard();
}

// ==========================================
// 8. LOGOUT
// ==========================================

function logout(): void {
  store.logout();

  router.push("/");
}

// ==========================================
// 9. USER AVATAR INITIALS
// ==========================================

const userInitials = computed(() => {
  if (!store.user) return "";

  return store.user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
});
</script>

<template>
  <v-app>
    <!-- ================================= -->
    <!-- TOP NAVIGATION BAR -->
    <!-- ================================= -->

    <v-app-bar
      elevation="1"
      height="70"
      class="hub-toolbar"
    >
      <!-- SIDEBAR TOGGLE -->

      <v-btn
        icon="mdi-menu-open"
        variant="text"
        size="small"
        class="mx-2"
        title="Toggle sidebar"
        @click="drawer = !drawer"
      />

      <!-- KOTRA HUB LOGO -->

      <div
        class="hub-logo"
        role="button"
        tabindex="0"
        @click="navigateDashboard"
        @keydown.enter="navigateDashboard"
      >
        <span class="hub-logo-mark">
          ✥
        </span>

        <span>
          KOTRA <b>HUB</b>
        </span>
      </div>

      <!-- SEARCH BAR -->

      <v-text-field
        v-if="store.user"
        v-model="search"
        class="hub-search ml-6"
        density="compact"
        hide-details
        variant="outlined"
        rounded="lg"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search apps, services, actions..."
        @keyup.enter="navigateOnboarding"
      />

      <v-spacer />

      <!-- ================================= -->
      <!-- THEME SWITCHER -->
      <!-- ================================= -->

      <v-menu>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-palette-outline"
            variant="text"
            title="Change theme"
          />
        </template>

        <v-list>
          <v-list-item
            v-for="item in themeOptions"
            :key="item.value"
            :title="item.title"
            :active="
              currentTheme === item.value
            "
            @click="
              changeTheme(item.value)
            "
          />
        </v-list>
      </v-menu>

      <!-- HELP -->

      <v-btn
        icon="mdi-help-circle-outline"
        variant="text"
        title="Help"
      />

      <!-- ================================= -->
      <!-- NOTIFICATIONS -->
      <!-- ================================= -->

      <v-menu
        v-if="store.user"
        v-model="notificationsOpen"
        :close-on-content-click="false"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-bell-outline"
            variant="text"
            title="Notifications"
          />
        </template>

        <v-card
          width="340"
          class="pa-4"
        >
          <div
            class="text-subtitle-1 font-weight-bold mb-2"
          >
            Notifications
          </div>

          <p class="text-body-2 mb-3">
            {{ notice }}
          </p>

          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            @click="
              notificationsOpen = false;
              navigateOnboarding();
            "
          >
            Open Onboarding
          </v-btn>
        </v-card>
      </v-menu>

      <!-- APPLICATIONS -->

      <v-btn
        v-if="store.user"
        icon="mdi-apps"
        variant="text"
        title="Applications"
      />

      <!-- ================================= -->
      <!-- USER PROFILE -->
      <!-- ================================= -->

      <v-menu v-if="store.user">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="mx-3"
            icon
          >
            <v-avatar
              color="primary"
              size="39"
            >
              {{ userInitials }}
            </v-avatar>
          </v-btn>
        </template>

        <v-list>
          <v-list-item
            :title="store.user.name"
            :subtitle="store.user.id"
          />

          <v-divider />

          <v-list-item
            prepend-icon="mdi-logout"
            title="Logout"
            @click="logout"
          />
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- ================================= -->
    <!-- SIDEBAR -->
    <!-- ================================= -->

    <v-navigation-drawer
      v-if="store.user"
      :rail="!drawer"
      :width="210"
      permanent
      class="hub-sidebar"
    >
      <v-list
        nav
        density="comfortable"
      >
        <v-list-item
          v-for="item in menu"
          :key="item.title"
          :title="item.title"
          :prepend-icon="item.icon"
          :active="
            activeMenu === item.title
          "
          :disabled="item.disabled"
          rounded="lg"
          @click="navigate(item)"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- ================================= -->
    <!-- MAIN CONTENT -->
    <!-- ================================= -->

    <v-main>
      <v-container
        fluid
        class="hub-content"
      >
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>
