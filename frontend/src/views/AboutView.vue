<template>
  <section class="about">
    <p class="eyebrow">About</p>
    <h1>关于这本博客</h1>
    <p class="lede">
      「墨痕」是一个用 Vue 3 写的个人博客：前端负责阅读体验，后端负责文章 API 与发布。
    </p>
    <div class="about-grid">
      <div>
        <h2>前端</h2>
        <p>Vue 3、Vite、Vue Router。本地开发通过代理访问 API，线上通过环境变量指向后端地址。</p>
      </div>
      <div>
        <h2>后端</h2>
        <p>Express REST API，文章以 JSON 文件持久化。管理接口使用 Bearer Token 鉴权。</p>
      </div>
      <div>
        <h2>部署</h2>
        <p>前端部署到 Vercel（HTTPS 公网）；后端部署到 Render 等可常驻进程的平台。</p>
      </div>
    </div>
  </section>
</template>
