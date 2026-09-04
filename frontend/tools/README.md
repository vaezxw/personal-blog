# Cursor Agent 本机 Relay

生产网站运行在 Cloudflare Pages，不能直接访问你电脑上的 `agent.cmd`。这个 Relay 运行在本机 `127.0.0.1`，负责启动已经登录的 Cursor CLI，并把 `stream-json` 输出转换成网站使用的 SSE 流。

## Windows 启动

在项目目录执行：

```powershell
node frontend/tools/cursor-agent-relay.mjs `
  --cli "C:\Users\xiaowang.zhu\AppData\Local\cursor-agent\agent.cmd" `
  --workspace "E:\code\studio-site" `
  --origins "https://mohhen-blog.pages.dev,http://localhost:5173"
```

启动后终端会显示一次 `Pairing token`。在网站“我的 → AI 模型 → Cursor Agent（本机额度）”中填入 Relay 地址和这个令牌，然后点击检查连接。

默认使用 `ask` 模式，只读访问本地工作区；如果确实需要 Cursor Agent 执行经过你确认的操作，可以启动时加 `--mode agent`。Relay 始终只监听 `127.0.0.1`，网站请求还必须带配对令牌。

Relay 会对启动命令中指定的固定工作区自动传递 Cursor CLI 的 `--trust`，避免每次对话弹出 Workspace Trust Required。它不会使用 `--yolo`，仍然保留 `ask` 模式和沙箱限制；只有你明确用 `--mode agent` 启动时，Agent 才会按 Cursor CLI 的权限执行工作区操作。

环境变量可通过重复的 `--env KEY=VALUE` 传给 Cursor CLI，例如：

```powershell
node frontend/tools/cursor-agent-relay.mjs --env HTTPS_PROXY=http://127.0.0.1:7890
```

不要把 Cursor 登录 Cookie、Session 或账号密码写入网站；Relay 使用你本机已经登录的 Cursor CLI，因此请求会计入该 Cursor 账号的用量规则。
