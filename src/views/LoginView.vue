<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useOnboardingStore } from "../stores/onboarding";
const id = ref("EMP001"),
  password = ref("Welcome123!"),
  error = ref(""),
  router = useRouter(),
  store = useOnboardingStore();
function login() {
  if (!store.login(id.value, password.value)) {
    error.value = "Invalid Employee ID or password";
    return;
  }
  router.push(store.user?.role === "HR" ? "/hr" : "/employee");
}
</script>
<template>
  <v-card class="mx-auto mt-12 pa-6" max-width="480" rounded="xl" elevation="3"
    ><v-card-title class="text-h5">Welcome to Kotra Hub</v-card-title
    ><v-card-subtitle>Sign in with your IT-issued credentials</v-card-subtitle
    ><v-card-text
      ><v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert
      ><v-form @submit.prevent="login"
        ><v-text-field
          v-model="id"
          label="Employee ID"
          prepend-inner-icon="mdi-account"
        /><v-text-field
          v-model="password"
          type="password"
          label="Password"
          prepend-inner-icon="mdi-lock"
        /><v-btn type="submit" block color="primary" size="large"
          >Login</v-btn
        ></v-form
      ><v-divider class="my-5" />
      <p class="text-caption">
        Demo accounts: EMP001 / Welcome123! and HR001 / Welcome123!.
        Frontend-only mock authentication; do not use real credentials.
      </p></v-card-text
    ></v-card
  >
</template>
