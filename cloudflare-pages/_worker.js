const names = ['夜行者','纸灯','拾影人','远窗','黑猫','雾中客','赤月','回声'];
const response = (data, status = 200, headers = {}) =>
  Response.json(data, {status, headers: {'Cache-Control':'no-store', ...headers}});

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);
    const allowed = [url.origin];
    if (origin && !allowed.includes(origin)) return response({error:'Origin denied'},403);
    const cors = origin ? {'Access-Control-Allow-Origin':origin,'Vary':'Origin',
      'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type, Authorization'} : {};
    const send = (data,status) => response(data,status,cors);
    if(request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
    const path = url.pathname.slice('/api'.length);
    try {
      if (path === '/messages' && request.method === 'GET') {
        const {results} = await env.DB.prepare(
          'SELECT id,name,avatar,body,created_at,reply FROM messages ORDER BY id DESC LIMIT 100'
        ).all();
        return send({messages:results});
      }
      if (request.method !== 'POST') return send({error:'找不到该页面'},404);
      if (path !== '/messages' && path !== '/reply') return send({error:'找不到该页面'},404);
      if (!request.headers.get('Content-Type')?.startsWith('application/json'))
        return send({error:'请求格式有误'},415);
      const reader = request.body?.getReader();
      if (!reader) return send({error:'请求内容为空'},400);
      const decoder = new TextDecoder();
      let raw = '', size = 0;
      while (true) {
        const {value,done} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) { await reader.cancel(); return send({error:'内容过长'},413); }
        raw += decoder.decode(value,{stream:true});
      }
      let input;
      try { input = JSON.parse(raw + decoder.decode()); } catch { return send({error:'请求格式有误'},400); }
      const body = typeof input?.body === 'string' ? input.body.trim() : '';
      if (!body || body.length > 500) return send({error:'请输入 1–500 字'},400);
      if (path === '/reply') {
        if (!env.ADMIN_TOKEN || request.headers.get('Authorization') !== 'Bearer ' + env.ADMIN_TOKEN)
          return send({error:'站长密钥有误'},401);
        if (!Number.isSafeInteger(input.id) || input.id < 1) return send({error:'留言编号有误'},400);
        const result = await env.DB.prepare('UPDATE messages SET reply=? WHERE id=?')
          .bind(body,input.id).run();
        return result.meta.changes ? send({ok:true}) : send({error:'留言不存在'},404);
      }
      const id = input.visitor;
      if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
        return send({error:'访客标识有误'},400);
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)));
      const name = names[hash[0] % names.length] + ' ' + String(hash[1] * 256 + hash[2]).padStart(5,'0');
      const avatar = hash[3] % 8;
      const ip = request.headers.get('CF-Connecting-IP') || id;
      const key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode((env.RATE_SECRET || env.ADMIN_TOKEN || '') + ':' + ip))),
        byte => byte.toString(16).padStart(2,'0')).join('');
      const now = Math.floor(Date.now()/1000);
      const [insert] = await env.DB.batch([
        env.DB.prepare('INSERT INTO messages(name,avatar,body) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM limits WHERE visitor=? AND last_post>?)')
          .bind(name,avatar,body,key,now-20),
        env.DB.prepare('INSERT INTO limits(visitor,last_post) VALUES(?,?) ON CONFLICT(visitor) DO UPDATE SET last_post=excluded.last_post WHERE last_post<=?').bind(key,now,now-20),
        env.DB.prepare('DELETE FROM limits WHERE last_post < ?').bind(now-86400)
      ]);
      return insert.meta.changes ? send({ok:true},201) : send({error:'留言太频繁，请稍后再试'},429);
    } catch { return send({error:'留言服务暂时不可用'},500); }
  }
};
