(() => {
  // Set to the deployed Worker URL to enable shared messages.
  const endpoint = 'https://gia-corridor-guestbook.evaderingia2004.workers.dev';
  const avatars = ['🌙','🦉','🐈‍⬛','🦋','🐇','🦊','🕯️','🪶'];
  const names = ['夜行者','纸灯','拾影人','远窗','黑猫','雾中客','赤月','回声'];
  async function identity() {
    let visitor = localStorage.getItem('gia-guest-id');
    if (!visitor) {
      visitor = crypto.randomUUID();
      localStorage.setItem('gia-guest-id',visitor);
    }
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(visitor)));
    return {visitor,name:names[bytes[0]%8]+' '+String(bytes[1]*256+bytes[2]).padStart(5,'0'),avatar:bytes[3]%8};
  }
  async function api(path, data, token) {
    const result = await fetch(endpoint+path,data ? {method:'POST',headers:{
      'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})
    },body:JSON.stringify(data)} : undefined);
    const payload = await result.json();
    if (!result.ok) throw new Error(payload.error || '请求失败');
    return payload;
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
        else writeDraft([{id:crypto.randomUUID(),name:author.name,avatar:author.avatar,body},...readDraft()]);
        form.reset();
        await refresh();
        status.textContent = '留言已发布。';
      } catch (error) { status.textContent = error.message; }
      finally { submit.disabled = false; }
    };
    try {
      author = await identity();
      find('.guest-identity').textContent = '你的匿名身份：'+avatars[author.avatar]+' '+author.name;
      await refresh();
      submit.disabled = false;
    } catch { status.textContent = '留言区暂时无法加载，请刷新后重试。'; }
  };
})();

