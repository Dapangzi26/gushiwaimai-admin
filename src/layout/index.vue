<script setup>
import SidebarMenu from './components/SidebarMenu.vue'
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <el-container class='app-layout'>
    <el-aside class='app-layout__aside' width='240px'>
      <SidebarMenu />
    </el-aside>
    <el-container>
      <el-header class='app-layout__header'>
        <AppHeader />
      </el-header>
      <el-main class='app-layout__main'>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
