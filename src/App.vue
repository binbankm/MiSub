<script setup>
import { onMounted } from 'vue';
import { useThemeStore } from './stores/theme';
import { useSessionStore } from './stores/session';
import { useToastStore } from './stores/toast';
import { storeToRefs } from 'pinia';

import Dashboard from './components/Dashboard.vue';
import Login from './components/Login.vue';
import Header from './components/Header.vue';
import Toast from './components/Toast.vue';
import Footer from './components/Footer.vue';

const themeStore = useThemeStore();
const { theme } = storeToRefs(themeStore);
const { initTheme } = themeStore;

const sessionStore = useSessionStore();
const { sessionState, initialData } = storeToRefs(sessionStore);
const { checkSession, login, logout } = sessionStore;

const toastStore = useToastStore();
const { toast: toastState } = storeToRefs(toastStore);

onMounted(() => {
  initTheme();
  checkSession();
});
</script>

<template>
  <div 
    :class="theme" 
    class="min-h-screen flex flex-col text-gray-800 dark:text-gray-200 transition-all duration-500"
  >
    <!-- 背景装饰 -->
    <div class="fixed inset-0 -z-10">
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900"></div>
      <div class="absolute top-0 left-0 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob"></div>
      <div class="absolute top-0 right-0 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div class="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
    </div>

    <Header :is-logged-in="sessionState === 'loggedIn'" @logout="logout" />

    <main 
      class="flex-grow relative z-10"
      :class="{ 
        'flex items-center justify-center': sessionState !== 'loggedIn',
        'overflow-y-auto': sessionState === 'loggedIn' 
      }"
    >
      <div v-if="sessionState === 'loading'" class="text-center">
        <div class="loading-spinner mx-auto mb-4"></div>
        <p class="text-gray-500 dark:text-gray-400 font-medium">正在加载...</p>
      </div>
      
      <Dashboard v-else-if="sessionState === 'loggedIn' && initialData" :data="initialData" />
      
      <Login v-else :login="login" />
    </main>
    
    <Toast :show="toastState.id" :message="toastState.message" :type="toastState.type" />
    <Footer />
  </div>
</template>

<style>
:root.dark {
  color-scheme: dark;
}
:root.light {
  color-scheme: light;
}

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
</style>