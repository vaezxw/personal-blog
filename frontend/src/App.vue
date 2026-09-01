<template>
  <div class="shell">
    <header class="site-header">
      <RouterLink class="brand" to="/">墨痕</RouterLink>
      <nav class="nav">
        <RouterLink to="/">文章</RouterLink>
        <RouterLink to="/about">关于</RouterLink>
        <RouterLink to="/admin">管理</RouterLink>
      </nav>
    </header>
    <main class="main">
      <RouterView />
    </main>
    <footer class="site-footer">
      <p>墨痕 · 个人博客 · 用 Vue 3 构建</p>
    </footer>
  </div>
</template>

<script setup>
</script>
