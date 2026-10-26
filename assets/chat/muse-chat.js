/*!
 * MUSE 홈페이지 챗봇 위젯
 * 사용법 (각 페이지 </body> 직전):
 *   <script src="assets/chat/muse-chat.js" defer></script>
 * 엔드포인트는 아래 DEFAULT_ENDPOINT 를 수정하거나, 태그에 data-endpoint="..." 로 덮어쓸 수 있다.
 */
(function () {
  "use strict";
  if (window.__museChatLoaded) return;
  window.__museChatLoaded = true;

  var script = document.currentScript;
  // Supabase 대시보드 > Project Settings > General 의 Reference ID 로 교체
  var DEFAULT_ENDPOINT = "https://ztvzisteidksesebsfyy.supabase.co/functions/v1/chat";
  var ENDPOINT = (script && script.dataset.endpoint) || window.MUSE_CHAT_ENDPOINT || DEFAULT_ENDPOINT;
  var SUGGESTIONS = [
    "MUSE는 어떤 제품인가요?",
    "어떤 하드웨어로 동작하나요?",
    "Virtual Try-On은 어떻게 작동하나요?",
    "개인정보는 어떻게 처리되나요?",
  ];
  var GREETING =
    "안녕하세요, **MUSE** 안내 챗봇입니다.\n제품, 하드웨어, AI 기술에 대해 궁금한 점을 물어보세요.";

  // ───────────────────────── storage (실패해도 동작) ─────────────────────────
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  var visitorId = lsGet("muse_chat_visitor") || uuid();
  lsSet("muse_chat_visitor", visitorId);

  var state = { conversationId: null, messages: [], open: false };
  try {
    var saved = JSON.parse(ssGet("muse_chat_state") || "null");
    if (saved && Array.isArray(saved.messages)) state = Object.assign(state, saved);
  } catch (e) {}
  function persist() {
    ssSet("muse_chat_state", JSON.stringify({
      conversationId: state.conversationId,
      messages: state.messages.slice(-40),
      open: state.open,
    }));
  }

  // ───────────────────────── styles (DESIGN.md: Editorial Muse) ─────────────────────────
  var css = `
  .mc-root{--mc-surface:#faf9f6;--mc-low:#f4f3f1;--mc-container:#efeeeb;--mc-on:#1a1c1a;--mc-on-var:#444748;
    --mc-outline:#c4c7c7;--mc-primary:#000;--mc-sec:#6050af;--mc-sec-fixed:#e6deff;--mc-on-sec-fixed:#483795;
    --mc-error:#ba1a1a;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
    color:var(--mc-on);position:fixed;right:24px;bottom:24px;z-index:2147483000;font-size:14px;line-height:22px;letter-spacing:.01em}
  .mc-root *{box-sizing:border-box}
  .mc-launcher{width:56px;height:56px;border-radius:999px;border:0;background:var(--mc-primary);color:#fff;cursor:pointer;
    display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.18);transition:transform .2s ease}
  .mc-launcher:hover{transform:translateY(-2px)}
  .mc-launcher:focus-visible,.mc-root button:focus-visible,.mc-root textarea:focus-visible,.mc-root input:focus-visible{outline:2px solid var(--mc-sec);outline-offset:2px}
  .mc-launcher svg{width:26px;height:26px}
  .mc-panel{position:absolute;right:0;bottom:72px;width:380px;height:min(600px,calc(100vh - 120px));background:var(--mc-surface);
    border:1px solid var(--mc-outline);border-radius:16px;box-shadow:0 20px 48px rgba(0,0,0,.16);display:flex;flex-direction:column;
    overflow:hidden;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .2s ease,transform .2s ease}
  .mc-root.mc-open .mc-panel{opacity:1;transform:none;pointer-events:auto}
  .mc-header{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 14px 20px;border-bottom:1px solid var(--mc-container)}
  .mc-title{font-family:"Playfair Display",Georgia,serif;font-size:22px;line-height:28px;font-weight:500}
  .mc-sub{font-size:11px;line-height:14px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mc-on-var);margin-top:2px}
  .mc-icon-btn{width:36px;height:36px;border-radius:999px;border:0;background:transparent;color:var(--mc-on-var);cursor:pointer;display:flex;align-items:center;justify-content:center}
  .mc-icon-btn:hover{background:var(--mc-container)}
  .mc-icon-btn svg{width:20px;height:20px}
  .mc-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
  .mc-msg{max-width:85%;padding:10px 14px;border-radius:14px;white-space:normal;word-break:break-word}
  .mc-msg p{margin:0}.mc-msg p+p,.mc-msg ul+p,.mc-msg p+ul{margin-top:8px}
  .mc-msg ul{margin:0;padding-left:18px}
  .mc-user{align-self:flex-end;background:var(--mc-primary);color:#fff;border-bottom-right-radius:4px}
  .mc-bot{align-self:flex-start;background:var(--mc-low);border:1px solid var(--mc-container);border-bottom-left-radius:4px}
  .mc-error{align-self:flex-start;color:var(--mc-error);font-size:12px;line-height:18px}
  .mc-typing{display:inline-flex;gap:4px;padding:4px 0}
  .mc-typing span{width:6px;height:6px;border-radius:50%;background:var(--mc-on-var);opacity:.4;animation:mc-blink 1.2s infinite}
  .mc-typing span:nth-child(2){animation-delay:.2s}.mc-typing span:nth-child(3){animation-delay:.4s}
  @keyframes mc-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
  .mc-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;font-size:12px;line-height:18px;color:var(--mc-on-var)}
  .mc-src{background:var(--mc-container);border-radius:6px;padding:0 6px;font-size:11px}
  .mc-fb{border:0;background:transparent;cursor:pointer;padding:2px;color:var(--mc-on-var);border-radius:6px;display:inline-flex}
  .mc-fb svg{width:16px;height:16px}.mc-fb:hover{background:var(--mc-container)}
  .mc-fb[aria-pressed="true"]{color:var(--mc-sec)}
  .mc-chips{display:flex;flex-wrap:wrap;gap:8px}
  .mc-chip{border:1px solid rgba(96,80,175,.25);background:var(--mc-sec-fixed);color:var(--mc-on-sec-fixed);border-radius:999px;
    padding:6px 12px;font:inherit;font-size:12px;line-height:18px;cursor:pointer}
  .mc-chip:hover{background:#d9cfff}
  .mc-footer{border-top:1px solid var(--mc-container);padding:12px 12px 10px}
  .mc-form{display:flex;align-items:flex-end;gap:8px;background:#fff;border:1px solid var(--mc-outline);border-radius:12px;padding:6px 6px 6px 12px}
  .mc-form:focus-within{border-color:var(--mc-sec)}
  .mc-input{flex:1;border:0;outline:0;resize:none;font:inherit;background:transparent;color:var(--mc-on);max-height:120px;padding:6px 0}
  .mc-send{width:36px;height:36px;border-radius:10px;border:0;background:var(--mc-primary);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .mc-send:disabled{opacity:.35;cursor:default}
  .mc-send svg{width:18px;height:18px}
  .mc-foot-row{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11px;line-height:14px;color:var(--mc-on-var)}
  .mc-link{border:0;background:none;padding:0;font:inherit;font-weight:600;color:var(--mc-sec);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
  .mc-lead{display:none;flex-direction:column;gap:10px;padding:20px;overflow-y:auto;flex:1}
  .mc-root.mc-lead-mode .mc-lead{display:flex}
  .mc-root.mc-lead-mode .mc-body,.mc-root.mc-lead-mode .mc-footer{display:none}
  .mc-lead h3{font-family:"Playfair Display",Georgia,serif;font-size:22px;line-height:28px;font-weight:500;margin:0}
  .mc-lead p{margin:0 0 4px;color:var(--mc-on-var);font-size:13px}
  .mc-lead label{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mc-on-var)}
  .mc-lead input,.mc-lead textarea{width:100%;margin-top:4px;border:1px solid var(--mc-outline);border-radius:10px;padding:10px 12px;font:inherit;background:#fff;color:var(--mc-on)}
  .mc-lead textarea{min-height:90px;resize:vertical}
  .mc-btn-row{display:flex;gap:8px;margin-top:4px}
  .mc-btn{flex:1;border-radius:10px;padding:10px 14px;font:inherit;font-weight:600;cursor:pointer;border:1px solid var(--mc-primary)}
  .mc-btn-primary{background:var(--mc-primary);color:#fff}.mc-btn-ghost{background:transparent;color:var(--mc-on)}
  .mc-btn:disabled{opacity:.5;cursor:default}
  .mc-lead-status{font-size:13px;min-height:20px}
  @media (max-width:640px){
    .mc-root{right:16px;bottom:16px}
    .mc-panel{position:fixed;left:16px;right:16px;bottom:84px;width:auto;height:calc(100dvh - 116px)}
  }
  @media (prefers-reduced-motion:reduce){.mc-panel,.mc-launcher{transition:none}.mc-typing span{animation:none}}
  `;
  var style = document.createElement("style");
  style.id = "muse-chat-style";
  style.textContent = css;
  document.head.appendChild(style);

  // ───────────────────────── icons ─────────────────────────
  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v11H4V10h3Zm0 0 4-7a2 2 0 0 1 3 1.7V9h5.2a2 2 0 0 1 2 2.3l-1.3 8A2 2 0 0 1 18 21H7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V3h3v11h-3Zm0 0-4 7a2 2 0 0 1-3-1.7V15H4.8a2 2 0 0 1-2-2.3l1.3-8A2 2 0 0 1 6 3h11"/></svg>',
  };

  // ───────────────────────── DOM ─────────────────────────
  var root = document.createElement("div");
  root.className = "mc-root";
  root.innerHTML =
    '<div class="mc-panel" role="dialog" aria-label="MUSE 챗봇" aria-modal="false">' +
      '<div class="mc-header"><div><div class="mc-title">MUSE</div><div class="mc-sub">AI 안내 · 공개 자료 기반</div></div>' +
        '<div style="display:flex;gap:2px">' +
          '<button class="mc-icon-btn mc-reset" type="button" aria-label="새 대화" title="새 대화">' + ICON.reset + "</button>" +
          '<button class="mc-icon-btn mc-close" type="button" aria-label="닫기" title="닫기">' + ICON.close + "</button>" +
        "</div></div>" +
      '<div class="mc-body" aria-live="polite"></div>' +
      '<div class="mc-footer">' +
        '<form class="mc-form"><textarea class="mc-input" rows="1" maxlength="1000" placeholder="MUSE에 대해 물어보세요" aria-label="메시지"></textarea>' +
          '<button class="mc-send" type="submit" aria-label="보내기" disabled>' + ICON.send + "</button></form>" +
        '<div class="mc-foot-row"><span>AI 답변은 부정확할 수 있어요</span><button class="mc-link mc-open-lead" type="button">문의 남기기</button></div>' +
      "</div>" +
      '<form class="mc-lead" novalidate>' +
        "<h3>문의 남기기</h3><p>도입, 데모, 협업 문의를 남겨 주시면 MUSE 팀이 이메일로 연락드립니다.</p>" +
        '<label>이메일 *<input name="email" type="email" autocomplete="email" required maxlength="200"></label>' +
        '<label>이름<input name="name" autocomplete="name" maxlength="100"></label>' +
        '<label>회사 / 소속<input name="company" autocomplete="organization" maxlength="200"></label>' +
        '<label>문의 내용<textarea name="message" maxlength="2000"></textarea></label>' +
        '<div class="mc-lead-status" role="status"></div>' +
        '<div class="mc-btn-row"><button class="mc-btn mc-btn-ghost mc-close-lead" type="button">돌아가기</button>' +
          '<button class="mc-btn mc-btn-primary" type="submit">보내기</button></div>' +
      "</form>" +
    "</div>" +
    '<button class="mc-launcher" type="button" aria-label="MUSE 챗봇 열기" aria-expanded="false">' + ICON.chat + "</button>";

  function mount() {
    document.body.appendChild(root);
    render();
    if (state.open) setOpen(true);
  }

  var $ = function (sel) { return root.querySelector(sel); };
  var body = $(".mc-body");
  var input = $(".mc-input");
  var sendBtn = $(".mc-send");
  var launcher = $(".mc-launcher");
  var busy = false;

  // ───────────────────────── markdown (최소) ─────────────────────────
  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  function md(text) {
    var out = [], list = null, para = [];
    function flushPara() { if (para.length) { out.push("<p>" + para.join("<br>") + "</p>"); para = []; } }
    function flushList() { if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; } }
    text.split("\n").forEach(function (line) {
      var m = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
      if (m) { flushPara(); (list = list || []).push("<li>" + inline(m[1]) + "</li>"); }
      else if (!line.trim()) { flushPara(); flushList(); }
      else { flushList(); para.push(inline(line.replace(/^#+\s*/, ""))); }
    });
    flushPara(); flushList();
    return out.join("");
  }

  // ───────────────────────── render ─────────────────────────
  function bubble(m, i) {
    var el = document.createElement("div");
    if (m.role === "error") { el.className = "mc-error"; el.textContent = m.content; return el; }
    el.className = "mc-msg " + (m.role === "user" ? "mc-user" : "mc-bot");
    if (m.role === "user") { el.textContent = m.content; return el; }
    if (!m.content) { el.innerHTML = '<span class="mc-typing"><span></span><span></span><span></span></span>'; return el; }
    el.innerHTML = md(m.content);
    if (m.done && (m.id || (m.sources && m.sources.length))) {
      var meta = document.createElement("div");
      meta.className = "mc-meta";
      (m.sources || []).slice(0, 3).forEach(function (s) {
        var tag = document.createElement("span");
        tag.className = "mc-src";
        tag.textContent = s.replace(/^.*\//, "").replace(/\.(html|md)$/, "");
        meta.appendChild(tag);
      });
      if (m.id) {
        var spacer = document.createElement("span"); spacer.style.flex = "1"; meta.appendChild(spacer);
        [[1, ICON.up, "도움이 됐어요"], [-1, ICON.down, "도움이 안 됐어요"]].forEach(function (f) {
          var b = document.createElement("button");
          b.type = "button"; b.className = "mc-fb"; b.innerHTML = f[1];
          b.setAttribute("aria-label", f[2]); b.title = f[2];
          b.setAttribute("aria-pressed", String(m.feedback === f[0]));
          b.addEventListener("click", function () { sendFeedback(i, f[0]); });
          meta.appendChild(b);
        });
      }
      el.appendChild(meta);
    }
    return el;
  }

  function render() {
    body.innerHTML = "";
    body.appendChild(bubble({ role: "assistant", content: GREETING }, -1));
    state.messages.forEach(function (m, i) { body.appendChild(bubble(m, i)); });
    if (!state.messages.length) {
      var chips = document.createElement("div");
      chips.className = "mc-chips";
      SUGGESTIONS.forEach(function (q) {
        var c = document.createElement("button");
        c.type = "button"; c.className = "mc-chip"; c.textContent = q;
        c.addEventListener("click", function () { ask(q); });
        chips.appendChild(c);
      });
      body.appendChild(chips);
    }
    body.scrollTop = body.scrollHeight;
  }

  function updateLast() {
    var last = body.lastElementChild;
    var i = state.messages.length - 1;
    var fresh = bubble(state.messages[i], i);
    if (last) body.replaceChild(fresh, last); else body.appendChild(fresh);
    body.scrollTop = body.scrollHeight;
  }

  function setOpen(open) {
    state.open = open;
    root.classList.toggle("mc-open", open);
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "MUSE 챗봇 닫기" : "MUSE 챗봇 열기");
    launcher.innerHTML = open ? ICON.close : ICON.chat;
    if (open) setTimeout(function () { input.focus(); }, 50);
    persist();
  }

  // ───────────────────────── network ─────────────────────────
  function post(payload) {
    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ visitorId: visitorId }, payload)),
    });
  }

  async function ask(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    if (!ENDPOINT) { console.error("[muse-chat] data-endpoint 가 설정되지 않았습니다."); return; }
    busy = true; sendBtn.disabled = true;
    input.value = ""; autosize();

    state.messages.push({ role: "user", content: text });
    var bot = { role: "assistant", content: "", done: false };
    state.messages.push(bot);
    render();

    try {
      var res = await post({
        action: "chat",
        conversationId: state.conversationId,
        message: text,
        pageUrl: location.pathname + location.hash,
      });
      if (!res.ok || !res.body) {
        var err = {};
        try { err = await res.json(); } catch (e) {}
        throw new Error(err.error || "연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = "";
      var pending = false;
      while (true) {
        var r = await reader.read();
        if (r.done) break;
        buf += decoder.decode(r.value, { stream: true });
        var events = buf.split("\n\n");
        buf = events.pop();
        events.forEach(function (evt) {
          var line = evt.split("\n").find(function (l) { return l.indexOf("data: ") === 0; });
          if (!line) return;
          var data = JSON.parse(line.slice(6));
          if (data.type === "meta") state.conversationId = data.conversationId;
          else if (data.type === "text") bot.content += data.text;
          else if (data.type === "replace") bot.content = data.text;
          else if (data.type === "done") { bot.done = true; bot.id = data.messageId; bot.sources = data.sources; }
          else if (data.type === "error") throw new Error(data.error);
        });
        // 토큰마다 DOM을 다시 그리지 않도록 프레임 단위로 묶음
        if (!pending) {
          pending = true;
          requestAnimationFrame(function () { pending = false; updateLast(); });
        }
      }
      bot.done = true;
      if (!bot.content) throw new Error("답변을 받지 못했습니다. 다시 시도해 주세요.");
    } catch (e) {
      if (!bot.content) state.messages.pop();
      state.messages.push({ role: "error", content: e.message || String(e) });
    } finally {
      busy = false;
      sendBtn.disabled = !input.value.trim();
      persist();
      render();
    }
  }

  async function sendFeedback(i, value) {
    var m = state.messages[i];
    if (!m || !m.id) return;
    var prev = m.feedback;
    m.feedback = value;
    render(); persist();
    try {
      var res = await post({ action: "feedback", messageId: m.id, value: value });
      if (!res.ok) throw new Error();
    } catch (e) {
      m.feedback = prev; render(); persist();
    }
  }

  // ───────────────────────── lead form ─────────────────────────
  var leadForm = $(".mc-lead");
  var leadStatus = $(".mc-lead-status");
  function field(n) { return leadForm.elements.namedItem(n); }
  function setLeadMode(on) {
    root.classList.toggle("mc-lead-mode", on);
    leadStatus.textContent = "";
    if (on) field("email").focus();
  }
  $(".mc-open-lead").addEventListener("click", function () { setLeadMode(true); });
  $(".mc-close-lead").addEventListener("click", function () { setLeadMode(false); });
  leadForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = field("email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      leadStatus.style.color = "var(--mc-error)";
      leadStatus.textContent = "올바른 이메일을 입력해 주세요.";
      return;
    }
    var submit = leadForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      var res = await post({
        action: "lead",
        conversationId: state.conversationId,
        email: email,
        name: field("name").value,
        company: field("company").value,
        message: field("message").value,
      });
      var data = {};
      try { data = await res.json(); } catch (err) {}
      if (!res.ok) throw new Error(data.error || "전송에 실패했습니다.");
      leadForm.reset();
      leadStatus.style.color = "var(--mc-sec)";
      leadStatus.textContent = "문의가 접수되었습니다. 곧 연락드릴게요!";
    } catch (err) {
      leadStatus.style.color = "var(--mc-error)";
      leadStatus.textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  });

  // ───────────────────────── events ─────────────────────────
  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }
  launcher.addEventListener("click", function () { setOpen(!state.open); });
  $(".mc-close").addEventListener("click", function () { setOpen(false); launcher.focus(); });
  $(".mc-reset").addEventListener("click", function () {
    if (busy) return;
    state.messages = []; state.conversationId = null;
    persist(); setLeadMode(false); render(); input.focus();
  });
  $(".mc-form").addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener("input", function () { autosize(); sendBtn.disabled = busy || !input.value.trim(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.open) { setOpen(false); launcher.focus(); }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
