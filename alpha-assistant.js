/* Alfa mentor: offline, deterministic onboarding helper; no external AI calls. */
(() => {
  "use strict";
  const IMAGE = "./assets/alfa-mentor.webp";
  const welcome = [
    "Привет! Рада приветствовать тебя в компании АЛЬФАПРОМ!",
    "Меня зовут Альфа, и я буду твоим наставником на этапе знакомства с компанией.",
    "АЛЬФАПРОМ занимается подбором и поставкой пищевого и упаковочного оборудования для предприятий.",
    "Наша задача — не просто продать оборудование, а помочь клиенту найти решение, которое действительно подходит под его производство.",
    "Впереди у тебя много новой информации, но не переживай — мы будем разбираться во всём постепенно.",
    "Я познакомлю тебя с нашей компанией, расскажу об оборудовании, покажу, как устроены рабочие процессы и где искать необходимую информацию.",
    "А если что-то покажется сложным, ничего страшного. Мы обязательно к этому вернёмся.",
    "Ну что, добро пожаловать в команду!",
    "Давай знакомиться!"
  ].join("\n\n");

  let panel, launcher, messages, actions, input;
  let modules = [], openModule = null, initialized = false;
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  // Reveal mentor replies in order; a new action completes the previous reply.
  const replyQueue = [];
  let replyTimer = null;
  function followReply(change) {
    const atBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 70;
    change();
    if (atBottom) messages.scrollTop = messages.scrollHeight;
  }
  function completeReply(reply) {
    reply.bubble.hidden = false;
    reply.words.textContent = reply.text;
    reply.cursor.remove();
    reply.bubble.setAttribute("aria-busy", "false");
    for (const child of reply.bubble.children) child.hidden = false;
  }
  function finishReplies() {
    clearTimeout(replyTimer);
    replyTimer = null;
    followReply(() => {
      for (const reply of replyQueue) completeReply(reply);
      replyQueue.length = 0;
    });
  }
  function typeReply() {
    const reply = replyQueue[0];
    if (!reply) { replyTimer = null; return; }
    followReply(() => {
      reply.bubble.hidden = false;
      const word = reply.tokens[reply.index++];
      reply.words.textContent += word;
    });
    if (reply.index === reply.tokens.length) {
      followReply(() => completeReply(reply));
      replyQueue.shift();
      replyTimer = replyQueue.length ? setTimeout(typeReply, 300) : null;
      return;
    }
    const word = reply.tokens[reply.index - 1].trim();
    const pause = /[.!?…][»")]*$/.test(word) ? 230 : /[,;:—]$/.test(word) ? 120 : 45;
    replyTimer = setTimeout(typeReply, pause);
  }
  function say(text, from = "mentor") {
    if (from !== "mentor") finishReplies();
    const bubble = make("div", "alpha-message " + from);
    const words = make("span", "", "");
    bubble.appendChild(words);
    messages.appendChild(bubble);
    if (from !== "mentor" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.textContent = text;
    } else {
      const cursor = make("span", "", " ▍");
      cursor.setAttribute("aria-hidden", "true");
      cursor.title = "Альфа печатает…";
      bubble.appendChild(cursor);
      bubble.setAttribute("aria-busy", "true");
      bubble.hidden = replyQueue.length > 0;
      replyQueue.push({bubble, words, cursor, text, tokens: text.match(/\S+\s*/g) || [text], index: 0});
      if (replyTimer === null) replyTimer = setTimeout(typeReply, 250);
    }
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }
  function buttons(items) {
    actions.replaceChildren();
    for (const [title, fn] of items) {
      const b = make("button", "", title);
      b.type = "button";
      b.addEventListener("click", () => { finishReplies(); fn(); });
      actions.appendChild(b);
    }
  }
  function defaultButtons() {
    buttons([
      ["👋 Познакомиться", introduce],
      ["📚 Найти обучение", showModules],
      ["📝 Как учиться", explainLearning],
      ["📈 Мой прогресс", showProgress]
    ]);
  }
  function introduce() {
    say("Познакомиться с Альфой", "employee");
    say(welcome);
    defaultButtons();
  }
  function showModules(term = "") {
    const matching = modules.filter(m => m.title.toLocaleLowerCase("ru").includes(term.toLocaleLowerCase("ru")));
    if (!modules.length) {
      say("Пока в Академии нет доступных обучающих модулей. Когда их добавят, я помогу тебе с навигацией.");
      defaultButtons();
      return;
    }
    const bubble = say(term ? "Вот что я нашла по твоему запросу:" : "Выбери оборудование — открою его учебный модуль:");
    const list = make("div", "alpha-modules");
    for (const mod of matching.slice(0, 15)) {
      const button = make("button", "alpha-module-link", mod.title + " · " + mod.progress + "%");
      button.type = "button";
      button.addEventListener("click", () => navigate(mod));
      list.appendChild(button);
    }
    if (!matching.length) {
      say("Такого названия среди загруженных учебных модулей я не нашла. Попробуй другое слово или открой полный список.");
    } else {
      list.hidden = bubble.getAttribute("aria-busy") === "true";
      bubble.appendChild(list);
      if (matching.length > 15) say("Показала первые 15 разделов. Напиши название оборудования, чтобы уточнить поиск.");
    }
    buttons([["Показать все разделы", () => showModules()], ["Как учиться", explainLearning], ["Вернуться", defaultButtons]]);
  }
  function navigate(mod) {
    if (typeof openModule !== "function") {
      say("Сейчас не могу открыть раздел. Попробуй выбрать его в меню Академии.");
      return;
    }
    const didOpen = openModule(mod.id);
    if (didOpen === false) {
      say("Раздел сейчас недоступен. Попробуй выбрать его в меню Академии.");
      return;
    }
    say("Открыть «" + mod.title + "»", "employee");
    say("Готово! Я открыла раздел «" + mod.title + "». Сначала ознакомься с теорией, затем переходи к тесту. Если шаг заблокирован, нужно завершить предыдущий.");
    toggle(false);
    launcher.focus();
  }
  function explainLearning() {
    say("Как устроено обучение?", "employee");
    say("В меню Академии выбери нужную категорию оборудования. Изучай шаги по порядку: теория отмечается кнопкой «Я изучил(а) этот шаг», затем можно проходить тест. Следующий шаг может открываться только после завершения предыдущего. Прогресс отображается в личном кабинете.");
    buttons([["Найти учебный модуль", () => showModules()], ["Мой прогресс", showProgress], ["Вернуться", defaultButtons]]);
  }
  function showProgress() {
    say("Покажи мой прогресс", "employee");
    if (!modules.length) {
      say("Пока нечего считать: учебные модули не загружены.");
    } else {
      const total = Math.round(modules.reduce((sum,m) => sum + m.progress, 0) / modules.length);
      const completed = modules.filter(m => m.progress === 100).length;
      say("Средний прогресс по доступным модулям: " + total + "%. Полностью завершено: " + completed + " из " + modules.length + ". Подробности можно посмотреть в личном кабинете.");
    }
    buttons([["Найти обучение", () => showModules()], ["Вернуться", defaultButtons]]);
  }
  function ask(text) {
    const question = text.trim().slice(0, 220);
    if (!question) return;
    say(question, "employee");
    input.value = "";
    const normalized = question.toLocaleLowerCase("ru").replace(/ё/g,"е");
    const match = modules.find(m => { const title = m.title.toLocaleLowerCase("ru").replace(/ё/g,"е"); return normalized.includes(title) || (normalized.length > 3 && title.includes(normalized)); });
    if (match) {
      say("В Академии есть раздел «" + match.title + "». Открыть его?");
      buttons([["Открыть «" + match.title + "»", () => navigate(match)], ["Другие разделы", () => showModules()]]);
    } else if (/привет|знаком|кто ты|альфа|добро пожаловать/.test(normalized)) {
      say(welcome);
      defaultButtons();
    } else if (/прогресс|процент|заверш|прошел|прошла/.test(normalized)) {
      showProgress();
    } else if (/тест|вопрос|обуч|шаг|учит|изуч|как начать/.test(normalized)) {
      explainLearning();
    } else if (/оборуд|модул|раздел|найт|поиск|категор/.test(normalized)) {
      showModules();
    } else if (/помо|ошибк|не работает|доступ|парол/.test(normalized)) {
      say("Я могу помочь с навигацией по Академии. Если возникла техническая ошибка или нет доступа, обратись к администратору Академии. Пароли и личные данные мне отправлять не нужно.");
      defaultButtons();
    } else {
      say("Пока я пробная интерактивная наставница: знаю, как устроена навигация по Академии, как проходить шаги и где находятся учебные разделы. На свободные вопросы об оборудовании без проверенных материалов пока не отвечаю. Попробуй написать название раздела или выбери кнопку ниже.");
      defaultButtons();
    }
  }
  function toggle(show) {
    const visible = show === undefined ? panel.hidden : show;
    panel.hidden = !visible;
    launcher.setAttribute("aria-expanded", String(visible));
    if (visible) { input.focus(); messages.scrollTop = messages.scrollHeight; }
  }
  function mount({ name, modules: loadedModules, onNavigate }) {
    modules = Array.isArray(loadedModules) ? loadedModules.map(m => ({
      id:String(m.id),title:String(m.title || ""),progress:Number(m.progress) || 0
    })) : [];
    openModule = onNavigate;
    if (initialized) return;
    initialized = true;
    const host = make("div", "alpha-assistant");
    launcher = make("button", "alpha-launcher");
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Открыть помощника Альфу");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "alpha-panel");
    const launchPhoto = make("img","alpha-photo");
    launchPhoto.src = IMAGE; launchPhoto.alt = "";
    launcher.append(launchPhoto, make("span","", "Спросить Альфу"));
    panel = make("section", "alpha-panel");
    panel.id = "alpha-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Интерактивный наставник Альфа");
    const head = make("header", "alpha-head");
    const photo = make("img","alpha-photo"); photo.src = IMAGE; photo.alt="Альфа, наставница";
    const title = make("div", "alpha-title");
    title.append(make("strong", "", "Альфа"),make("small","","Наставница · Академия АЛЬФАПРОМ"));
    const close = make("button", "alpha-close", "×"); close.type="button"; close.setAttribute("aria-label","Свернуть Альфу");
    head.append(photo,title,close);
    messages = make("div","alpha-messages"); messages.setAttribute("aria-live","polite");messages.setAttribute("role","log");
    actions = make("div","alpha-actions");
    const form = make("form","alpha-input-wrap");
    input = make("input","alpha-input");input.placeholder="Спроси об Академии…";input.setAttribute("aria-label","Вопрос Альфе");input.maxLength=220;
    const send = make("button","alpha-send","➤"); send.type="submit";send.setAttribute("aria-label","Отправить вопрос");
    form.append(input,send);
    const note = make("div","alpha-disclaimer","Пробная версия с готовыми ответами, без подключения ИИ. Не вводи пароли и персональные данные.");
    panel.append(head,messages,actions,form,note);
    host.append(launcher,panel);document.body.appendChild(host);
    launcher.addEventListener("click",()=>toggle());
    close.addEventListener("click",()=>{toggle(false);launcher.focus();});
    form.addEventListener("submit",e=>{e.preventDefault();ask(input.value);});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){toggle(false);launcher.focus();}});
    const first = String(name || "").trim().split(/\s+/)[0] || "";
    say("Привет" + (first && first.indexOf("@") === -1 ? ", " + first : "") + "! Я Альфа, твоя наставница. Помогу освоиться в Академии. С чего начнём?");
    defaultButtons();
    // Show the first welcome once per tab; afterwards the launcher remains available.
    if (!sessionStorage.getItem("alpha-welcome-seen")) {
      sessionStorage.setItem("alpha-welcome-seen", "1");
      toggle(true);
    }
  }
  window.AlphaAssistant = {mount, updateModules(next) {
    modules = Array.isArray(next) ? next.map(m=>({
      id:String(m.id),title:String(m.title || ""),progress:Number(m.progress) || 0
    })) : [];
  }};
})();
