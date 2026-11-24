(() => {
  // Set to the deployed Worker URL to enable shared messages.
  const endpoint = 'https://gia-corridor-guestbook.evaderingia2004.workers.dev';
  const avatars = ['🌙','🦉','🐈‍⬛','🦋','🐇','🦊','🕯️','🪶'];
  const names = ['夜行者','纸灯','拾影人','远窗','黑猫','雾中客','赤月','回声'];
  let sessionVisitor;
  function visitorId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  }
  async function identity() {
    let visitor = sessionVisitor;
    try { visitor = localStorage.getItem('gia-guest-id') || visitor; } catch {}
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitor || '')) {
      visitor = visitorId();
      try { localStorage.setItem('gia-guest-id',visitor); } catch {}
    }
    sessionVisitor = visitor;
    try {
      const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(visitor)));
      return {visitor,name:names[bytes[0]%8]+' '+String(bytes[1]*256+bytes[2]).padStart(5,'0'),avatar:bytes[3]%8};
    } catch {
      return {visitor,name:'匿名访客',avatar:0};
    }
  }
  async function api(path, data, token) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      let result;
      try {
        result = await fetch(endpoint+path,{signal:controller.signal,...(data ? {method:'POST',headers:{
          'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})
        },body:JSON.stringify(data)} : {})});
      } catch {
        throw new Error('暂时连不上留言服务。请稍后重试，或用系统浏览器打开此页。');
      }
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.error || '请求失败');
      return payload;
    } finally { clearTimeout(timer); }
  }
  window.openGuestbook = async root => {
    const find = selector => root.querySelector(selector);
    const status = find('.guest-status');
    const form = find('.guest-form');
    const list = find('.guest-messages');
    const submit = form.querySelector('button');
    const key = find('#guest-key');
    find('.guest-mode').textContent = endpoint ? '留言与站长回复会公开显示。' : '本地预览 · 留言仅保存在当前浏览器。';
    submit.disabled = true;
    let author;
    const draftKey = 'gia-guestbook-draft';
    const readDraft = () => JSON.parse(localStorage.getItem(draftKey) || '[]');
    const writeDraft = entries => localStorage.setItem(draftKey,JSON.stringify(entries));
    async function refresh() {
      const entries = endpoint ? (await api('/messages')).messages : readDraft();
      list.replaceChildren();
      if (!entries.length) list.textContent = '还没有留言。';
      for (const entry of entries) {
        const item = document.createElement('article');
        const label = document.createElement('strong');
        label.textContent = (avatars[entry.avatar] || '●') + ' ' + entry.name;
        const text = document.createElement('p');
        text.textContent = entry.body;
        item.append(label,text);
        if (entry.reply) {
          const reply = document.createElement('p');
          reply.className = 'guest-reply';
          reply.textContent = '胡萝卜 / GIA：' + entry.reply;
          item.append(reply);
        }
        const replyForm = document.createElement('form');
        replyForm.hidden = find('.guest-admin').open === false;
        const field = document.createElement('textarea');
        field.required = true;
        field.maxLength = 500;
        field.rows = 2;
        field.value = entry.reply || '';
        field.setAttribute('aria-label','回复 '+entry.name);
        const button = document.createElement('button');
        button.textContent = '发布回复';
        replyForm.append(field,button);
        replyForm.className = 'guest-reply-form';
        item.append(replyForm);
        replyForm.onsubmit = async event => {
          event.preventDefault();
          const body = field.value.trim();
          if (!body) return;
          button.disabled = true;
          try {
            if (endpoint) await api('/reply',{id:entry.id,body},key.value.trim());
            else writeDraft(readDraft().map(message => message.id===entry.id ? {...message,reply:body} : message));
            await refresh();
            status.textContent = '回复已发布。';
          } catch (error) { status.textContent = error.message; }
          finally { button.disabled = false; }
        };
        list.append(item);
      }
    }
    find('.guest-admin').ontoggle = event => {
      for (const reply of list.querySelectorAll('.guest-reply-form')) reply.hidden = !event.target.open;
    };
    form.onsubmit = async event => {
      event.preventDefault();
      const body = form.elements.message.value.trim();
      if (!body) return;
      submit.disabled = true;
      try {
        if (endpoint) await api('/messages',{visitor:author.visitor,body});
        else writeDraft([{id:visitorId(),name:author.name,avatar:author.avatar,body},...readDraft()]);
        form.reset();
        status.textContent = '留言已发布。';
        try { await refresh(); } catch { status.textContent = '留言已保存，列表暂时无法刷新。'; }
      } catch (error) { status.textContent = error.message; }
      finally { submit.disabled = false; }
    };
    try {
      author = await identity();
      find('.guest-identity').textContent = '你的匿名身份：'+avatars[author.avatar]+' '+author.name;
      submit.disabled = false;
      await refresh();
    } catch (error) { status.textContent = error.message; }
  };
})();

