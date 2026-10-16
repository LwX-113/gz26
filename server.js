require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const COZE_PAT = process.env.COZE_PAT;
const COZE_BOT_ID = process.env.COZE_BOT_ID;

app.get('/api/health', (req, res) => {
    res.json({ ok: true, hasToken: !!COZE_PAT, hasBotId: !!COZE_BOT_ID });
});

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    console.log('\n[收到请求] 用户说:', message);

    if (!COZE_PAT || !COZE_BOT_ID) {
        return res.json({ code: -1, data: { reply: '后端缺少配置' } });
    }

    try {
        const chatResponse = await fetch('https://api.coze.cn/open_api/v2/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${COZE_PAT}`
            },
            body: JSON.stringify({
                bot_id: COZE_BOT_ID,
                user: 'local_user',
                query: message,
                stream: false
            })
        });

        const text = await chatResponse.text();
        console.log('[Coze原始文本返回]:', text);

        let chatData = null;
        try {
            chatData = JSON.parse(text);
        } catch (e) {
            console.error('[JSON解析失败]:', e.message);
            return res.json({ code: -1, data: { reply: '扣子返回数据格式异常' } });
        }

        if (!chatData) {
            return res.json({ code: -1, data: { reply: '扣子返回为空' } });
        }

        // 尝试多种可能的路径找 messages
        let messages = null;
        if (chatData.messages && chatData.messages.length > 0) {
            messages = chatData.messages;
        } else if (chatData.data && chatData.data.messages && chatData.data.messages.length > 0) {
            messages = chatData.data.messages;
        }

        let reply = '';
        if (messages) {
            const msg = messages.find(m => m.type === 'answer');
            if (msg && msg.content) {
                reply = msg.content;
            }
        }

        if (!reply) {
            reply = `智能体未返回内容（错误码：${chatData.code || '无'}，${chatData.msg || 'success'}）`;
        }

        console.log('[成功回复] AI说:', reply);
        res.json({ code: 0, data: { reply } });

    } catch (error) {
        console.error('[后端报错]', error.message);
        res.json({ code: -1, data: { reply: '请求扣子失败：' + error.message } });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n✅ 后端服务已启动: http://localhost:${PORT}`);
});