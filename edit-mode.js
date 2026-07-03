/* ================================================================
   edit-mode.js — 포트폴리오 브라우저 인라인 편집기
   localStorage 기반 / 서버 불필요 / 모든 페이지 공유
================================================================ */
(function () {
  'use strict';

  /* ── 활성화 여부 (true = 활성, false = 비활성) ─────────────────── */
  const ENABLED = false;
  if (!ENABLED) return;

  const STORE_KEY = 'pe:' + location.pathname;
  const SKIP_SEL  = ['#nav', '#mob-menu', '#pe-wrap', 'script', 'style'];
  let   editing   = false;
  let   colorHandlers   = [];
  let   profHandlers    = [];
  let   iconImgHandlers = [];

  /* ── 편집 가능 요소 선택자 ─────────────────────────────────── */
  const EDITABLE_SEL = [
    'h1','h2','h3','h4',
    'p',
    '.hero-h1','.hero-desc','.hero-label','.hero-cat',
    '.hero-badge','.hero-side',
    '.card-title','.card-desc','.card-cat',
    '.card-link',
    '.about-h2',
    '.stat-n','.stat-lab','.stat-desc',
    '.contact-h2','.contact-sub','.contact-email',
    '.foot-logo','.foot-copy',
    '.nav-logo',
    '.proj-header-left h1',
    '#hero-cat','#hero-title',
    '#meta-year','#meta-duration','#meta-type',
    '#overview-desc',
    '.achievement-text',
    '.info-val','.info-label',
    '.tool-name',
    '.tool-icon',
    '.prof-label',
    '.hero-h2',
  ].join(',');

  /* ── rgb(r,g,b) → #rrggbb ──────────────────────────────────── */
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'none') return null;
    if (/^#/.test(rgb)) return rgb;
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return null;
    return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  }

  /* ── 저장 전 PE UI 요소 제거한 innerHTML 반환 ──────────────── */
  function cleanHTML(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('[data-pe-ui]').forEach(u => u.remove());
    return clone.innerHTML;
  }

  /* ── 요소에 안정적 ID 부여 ─────────────────────────────────── */
  function markAll() {
    const counts = {};
    document.body.querySelectorAll(EDITABLE_SEL).forEach(el => {
      if (SKIP_SEL.some(s => el.closest(s))) return;
      const base = (el.id
        ? '#' + el.id
        : (el.className && typeof el.className === 'string'
            ? el.className.trim().split(/\s+/)[0]
            : el.tagName.toLowerCase()));
      counts[base] = (counts[base] || 0);
      el.dataset.eid = base + ':' + counts[base]++;
    });
  }

  /* ── 컬러 스와치·프로피시언시 바에 인덱스 부여 ─────────────── */
  function markSpecial() {
    document.querySelectorAll('.color-swatch').forEach((el, i) => {
      el.dataset.swid = i;
      const hex = rgbToHex(el.style.background || el.style.backgroundColor);
      if (hex) el.title = hex;
    });
    document.querySelectorAll('.prof-fill').forEach((el, i) => {
      el.dataset.pfid = i;
    });
  }

  /* ── 저장된 수정사항 적용 ───────────────────────────────────── */
  function applyEdits() {
    try {
      const edits = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      Object.keys(edits).forEach(eid => {
        if (eid.startsWith('col:')) {
          const el = document.querySelector('[data-swid="' + eid.slice(4) + '"]');
          if (el) { el.style.background = edits[eid]; el.title = edits[eid]; }
        } else if (eid.startsWith('pct:')) {
          const el = document.querySelector('[data-pfid="' + eid.slice(4) + '"]');
          if (el) el.style.width = edits[eid];
        } else {
          const el = document.querySelector('[data-eid="' + eid + '"]');
          if (el) {
            el.innerHTML = edits[eid];
            /* 이미지로 교체된 tool-icon 복원 시 스타일 재적용 */
            if (el.classList.contains('tool-icon') && el.querySelector('img')) {
              el.style.position = 'relative';
              el.style.overflow = 'hidden';
              el.style.fontSize = '0';
            }
          }
        }
      });
    } catch (_) {}
  }

  /* ── 현재 상태 저장 ─────────────────────────────────────────── */
  function saveEdits() {
    const edits = {};
    document.querySelectorAll('[data-eid]').forEach(el => {
      edits[el.dataset.eid] = cleanHTML(el);
    });
    document.querySelectorAll('[data-swid]').forEach(el => {
      const hex = rgbToHex(el.style.background || el.style.backgroundColor);
      if (hex) edits['col:' + el.dataset.swid] = hex;
    });
    document.querySelectorAll('[data-pfid]').forEach(el => {
      if (el.style.width) edits['pct:' + el.dataset.pfid] = el.style.width;
    });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(edits)); } catch (err) {
      toast('저장 실패: 용량 초과 가능성');
    }
    updateDot();
  }

  /* ── 컬러 피커 ──────────────────────────────────────────────── */
  function openColorPicker(swatch) {
    const hex = rgbToHex(getComputedStyle(swatch).backgroundColor) || '#ffffff';
    const inp = document.createElement('input');
    inp.type  = 'color';
    inp.value = hex;
    inp.style.cssText = 'position:fixed;opacity:0;width:0;height:0;top:0;left:0;pointer-events:none;';
    document.body.appendChild(inp);
    inp.addEventListener('input', () => {
      swatch.style.background = inp.value;
      swatch.title = inp.value;
      saveEdits();
    });
    inp.addEventListener('change', () => inp.remove());
    inp.addEventListener('blur',   () => setTimeout(() => inp.remove(), 200));
    inp.click();
  }

  /* ── 프로피시언시 % 입력 ────────────────────────────────────── */
  function openPctInput(fill, container) {
    if (container.querySelector('.pe-pct-wrap')) return;
    const currentPct = parseFloat(fill.style.width) || 0;
    const origPos = container.style.position;
    container.style.position = 'relative';

    const wrap = document.createElement('div');
    wrap.className = 'pe-pct-wrap';
    wrap.setAttribute('data-pe-ui', '1');

    const inp = document.createElement('input');
    inp.type  = 'number';
    inp.min   = 0;
    inp.max   = 100;
    inp.value = Math.round(currentPct);

    const unit = document.createElement('span');
    unit.textContent = '%';

    wrap.appendChild(inp);
    wrap.appendChild(unit);
    container.appendChild(wrap);
    inp.focus();
    inp.select();

    function apply() {
      const val = Math.min(100, Math.max(0, parseInt(inp.value) || 0));
      fill.style.width = val + '%';
      saveEdits();
      wrap.remove();
      container.style.position = origPos;
    }
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); apply(); }
      if (e.key === 'Escape') { wrap.remove(); container.style.position = origPos; }
    });
    inp.addEventListener('blur', () => setTimeout(apply, 150));
  }

  /* ── 아이콘 이미지 파일 피커 ────────────────────────────────── */
  function openIconFilePicker(icon) {
    const inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;opacity:0;width:0;height:0;top:0;left:0;';
    document.body.appendChild(inp);

    inp.addEventListener('change', () => {
      const file = inp.files[0];
      inp.remove();
      if (!file) return;
      if (file.size > 512 * 1024) {
        toast('이미지가 너무 큽니다 (최대 512 KB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        /* PE UI 버튼은 tool-item(부모)에 있으므로 icon.innerHTML만 교체 */
        icon.innerHTML = '';
        icon.style.position = 'relative';
        icon.style.overflow = 'hidden';
        icon.style.fontSize = '0';
        icon.style.padding  = '0';

        const img = document.createElement('img');
        img.src = reader.result;
        img.alt = 'icon';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;';
        icon.appendChild(img);

        /* 이미지가 있으므로 contentEditable 비활성화 */
        icon.contentEditable = 'false';
        saveEdits();
        toast('아이콘 이미지 교체 완료');
      };
      reader.readAsDataURL(file);
    });

    inp.click();
  }

  /* ── 아이콘 업로드 버튼 연결/해제 ──────────────────────────── */
  function attachIconUploadBtns() {
    document.querySelectorAll('.tool-icon').forEach(icon => {
      const item = icon.closest('.tool-item') || icon.parentElement;
      if (!item || item.querySelector('.pe-icon-upload-btn')) return;

      const savedPos = getComputedStyle(item).position;
      if (savedPos === 'static') item.style.position = 'relative';

      const btn = document.createElement('button');
      btn.className = 'pe-icon-upload-btn';
      btn.setAttribute('data-pe-ui', '1');
      btn.title = '이미지로 교체';
      btn.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>`;
      item.appendChild(btn);

      const fn = e => {
        e.stopPropagation();
        e.preventDefault();
        if (!editing) return;
        openIconFilePicker(icon);
      };
      btn.addEventListener('click', fn);
      iconImgHandlers.push({ btn, fn, item, savedPos });
    });
  }

  function detachIconUploadBtns() {
    iconImgHandlers.forEach(({ btn, fn, item, savedPos }) => {
      btn.removeEventListener('click', fn);
      btn.remove();
      if (savedPos === 'static') item.style.position = '';
    });
    iconImgHandlers = [];
  }

  /* ── 특수 편집기 연결/해제 ──────────────────────────────────── */
  function attachSpecialEditors() {
    document.querySelectorAll('[data-swid]').forEach(swatch => {
      const fn = () => { if (editing) openColorPicker(swatch); };
      swatch.addEventListener('click', fn);
      colorHandlers.push({ el: swatch, fn });
    });
    document.querySelectorAll('.prof-item').forEach(item => {
      const fill = item.querySelector('.prof-fill');
      if (!fill) return;
      const fn = e => {
        if (!editing) return;
        e.stopPropagation();
        openPctInput(fill, item);
      };
      item.addEventListener('click', fn);
      profHandlers.push({ el: item, fn });
    });
    attachIconUploadBtns();
  }

  function detachSpecialEditors() {
    colorHandlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
    colorHandlers = [];
    profHandlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
    profHandlers = [];
    detachIconUploadBtns();
  }

  /* ── 편집 모드 진입 ─────────────────────────────────────────── */
  function startEdit() {
    editing = true;
    document.querySelectorAll('[data-eid]').forEach(el => {
      /* 이미지로 교체된 tool-icon은 텍스트 편집 제외 */
      if (el.classList.contains('tool-icon') && el.querySelector('img')) return;
      el.contentEditable = 'true';
      el.spellcheck = false;
      el.addEventListener('input', saveEdits);
    });
    attachSpecialEditors();
    document.body.classList.add('pe-on');
    btnEdit.innerHTML = '✓&nbsp;&nbsp;완료';
    btnEdit.classList.add('pe-active');
    toast('편집 모드 — 텍스트 / 아이콘 / 색상을 클릭해 수정하세요');
  }

  /* ── 편집 모드 종료 ─────────────────────────────────────────── */
  function stopEdit() {
    editing = false;
    saveEdits();
    document.querySelectorAll('[data-eid]').forEach(el => {
      el.contentEditable = 'false';
      el.removeEventListener('input', saveEdits);
    });
    detachSpecialEditors();
    document.body.classList.remove('pe-on');
    btnEdit.innerHTML = '&#9998;&nbsp;&nbsp;편집';
    btnEdit.classList.remove('pe-active');
    toast('저장 완료');
  }

  /* ── 초기화 ─────────────────────────────────────────────────── */
  function resetPage() {
    if (!confirm('이 페이지의 모든 수정사항을 초기화할까요?')) return;
    localStorage.removeItem(STORE_KEY);
    location.reload();
  }

  /* ── 변경사항 클립보드 내보내기 ─────────────────────────────── */
  function exportEdits() {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) { toast('변경사항 없음'); return; }

    let edits;
    try { edits = JSON.parse(raw); } catch (_) { toast('데이터 파싱 오류'); return; }

    const keys = Object.keys(edits);
    if (!keys.length) { toast('변경사항 없음'); return; }

    const lines = [`[${STORE_KEY}]`, ''];
    keys.forEach(k => {
      const val = edits[k];
      if (k.startsWith('col:') || k.startsWith('pct:')) {
        lines.push(`${k} → ${val}`);
      } else {
        const tmp = document.createElement('div');
        tmp.innerHTML = val;
        const text = (tmp.textContent || tmp.innerText || val).trim();
        lines.push(`${k} → ${text}`);
      }
    });

    const output = lines.join('\n');
    navigator.clipboard.writeText(output)
      .then(() => toast('클립보드에 복사됨 ✓'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = output;
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        toast('클립보드에 복사됨 ✓');
      });
  }

  function updateDot() {
    dot.style.opacity = localStorage.getItem(STORE_KEY) ? '1' : '0';
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'pe-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
  }

  /* ── CSS ────────────────────────────────────────────────────── */
  const css = document.createElement('style');
  css.textContent = `
    #pe-wrap {
      position: fixed; bottom: 22px; right: 22px; z-index: 99999;
      display: flex; align-items: center; gap: 6px;
      font-family: 'Space Grotesk', 'Inter', sans-serif;
    }
    .pe-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 9px 16px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(10,10,18,0.92); backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: rgba(237,237,235,0.62); font-size: 0.7rem; letter-spacing: 0.06em;
      cursor: pointer; transition: all 0.2s; white-space: nowrap;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .pe-btn:hover { background: rgba(22,22,34,0.96); color: #EDEDEB; border-color: rgba(255,255,255,0.18); }
    .pe-btn.pe-active { background: #C8965A !important; color: #0A0A0F !important; border-color: #C8965A !important; font-weight: 600; }
    #pe-reset { padding: 9px 11px; font-size: 1rem; line-height: 1; }
    #pe-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #C8965A; opacity: 0; transition: opacity 0.3s;
      box-shadow: 0 0 6px #C8965A;
    }

    /* 텍스트 편집 */
    body.pe-on [data-eid] {
      outline: 1px dashed rgba(200,150,90,0.3) !important;
      border-radius: 2px !important; min-height: 0.5em !important;
      cursor: text !important; transition: outline 0.15s;
    }
    body.pe-on [data-eid]:hover  { outline: 1px solid rgba(200,150,90,0.75) !important; }
    body.pe-on [data-eid]:focus  { outline: 2px solid #C8965A !important; background: rgba(200,150,90,0.06) !important; }
    body.pe-on [data-eid]:empty::before { content: attr(data-eid); opacity: 0.25; font-size: 0.65rem; font-style: italic; }

    /* 아이콘 텍스트 편집 */
    body.pe-on .tool-icon[data-eid] { cursor: text !important; }
    body.pe-on .tool-icon[data-eid]:hover { outline: 2px solid rgba(200,150,90,0.8) !important; }

    /* 아이콘 업로드 버튼 — tool-icon 48px 기준, column-center 배치 */
    .pe-icon-upload-btn {
      display: none;
      position: absolute; top: 0; left: calc(50% + 15px);
      width: 18px; height: 18px; border-radius: 50%;
      background: #C8965A; color: #0A0A0F;
      border: 1.5px solid rgba(10,10,18,0.5);
      cursor: pointer; z-index: 200;
      align-items: center; justify-content: center;
      padding: 0; transition: transform 0.15s, background 0.15s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    body.pe-on .pe-icon-upload-btn { display: flex; }
    .pe-icon-upload-btn:hover { background: #E0A860; transform: scale(1.15); }

    /* 컬러 스와치 편집 */
    body.pe-on [data-swid] {
      cursor: crosshair !important;
      outline: 2px solid rgba(200,150,90,0.3) !important;
      outline-offset: 2px !important;
      transition: transform 0.15s, outline 0.15s !important;
    }
    body.pe-on [data-swid]:hover { outline: 2px solid rgba(200,150,90,0.85) !important; transform: scale(1.2) !important; }

    /* 프로피시언시 바 편집 */
    body.pe-on .prof-item { cursor: pointer; }
    body.pe-on .prof-item:hover .prof-bar { outline: 1px dashed rgba(200,150,90,0.55) !important; border-radius: 4px; }

    /* % 입력 오버레이 */
    .pe-pct-wrap {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      background: rgba(10,10,18,0.96); border: 1px solid rgba(200,150,90,0.55);
      border-radius: 8px; padding: 6px 12px;
      display: flex; align-items: center; gap: 6px;
      z-index: 10000; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .pe-pct-wrap input {
      width: 52px; background: transparent; border: none;
      color: #EDEDEB; font-size: 15px; font-weight: 600;
      text-align: center; outline: none;
      font-family: 'Space Grotesk', sans-serif;
    }
    .pe-pct-wrap span { color: rgba(237,237,235,0.45); font-size: 12px; font-family: 'Space Grotesk', sans-serif; }

    /* 토스트 */
    .pe-toast {
      position: fixed; bottom: 70px; right: 22px; z-index: 99999;
      padding: 8px 18px; border-radius: 8px;
      background: rgba(22,22,34,0.95); backdrop-filter: blur(12px);
      color: rgba(237,237,235,0.7); font-size: 0.7rem; letter-spacing: 0.06em;
      font-family: 'Space Grotesk', sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      opacity: 0; transform: translateY(8px);
      transition: opacity 0.25s, transform 0.25s; pointer-events: none;
    }
    .pe-toast.show { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(css);

  /* ── 패널 HTML ──────────────────────────────────────────────── */
  const wrap = document.createElement('div');
  wrap.id = 'pe-wrap';
  wrap.innerHTML = `
    <div id="pe-dot" title="수정사항 있음"></div>
    <button class="pe-btn" id="pe-reset" title="수정사항 초기화">&#8635;</button>
    <button class="pe-btn" id="pe-export" title="변경사항 클립보드 복사">&#8679;&nbsp;&nbsp;내보내기</button>
    <button class="pe-btn" id="pe-edit">&#9998;&nbsp;&nbsp;편집</button>
  `;
  document.body.appendChild(wrap);

  const btnEdit   = wrap.querySelector('#pe-edit');
  const btnReset  = wrap.querySelector('#pe-reset');
  const btnExport = wrap.querySelector('#pe-export');
  const dot       = wrap.querySelector('#pe-dot');

  btnEdit.addEventListener('click', () => editing ? stopEdit() : startEdit());
  btnReset.addEventListener('click', resetPage);
  btnExport.addEventListener('click', exportEdits);

  /* ── 초기화 ─────────────────────────────────────────────────── */
  markAll();
  markSpecial();
  applyEdits();
  updateDot();

  /* ── Nav dots → nav-links 토글 ──────────────────────────────── */
  (function () {
    const dots     = document.querySelector('.nav-dots');
    const navLinks = document.querySelector('.nav-links');
    if (!dots || !navLinks) return;
    dots.addEventListener('click', function () {
      const hidden = getComputedStyle(navLinks).display === 'none';
      navLinks.style.display = hidden ? 'flex' : 'none';
      if (hidden) navLinks.style.alignItems = 'center';
    });
  })();

})();
