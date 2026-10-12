import { h, toast, shrinkImage } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { draft, resetDraft, nav } from '../lib/state.js';

export function report() {
  if (!draft.pin) { location.hash = '#/'; return h('div'); }
  const root = h('div', {});
  const back = h('button', { class: 'iconbtn', 'aria-label': '뒤로', onClick: () => history.back() }, h('svg', { viewBox: '0 0 24 24' }, h('path', { d: 'M15 5l-7 7 7 7' })));
  root.append(h('div', { class: 'topbar' }, back, h('h1', {}, '신고하기')));

  const kindBtns = ['하자', '분실물'].map(k => h('button', { type: 'button', class: draft.kind === k ? 'on' : '', onClick: () => { draft.kind = k; kindBtns.forEach(b => b.classList.toggle('on', b.textContent === k)); where.placeholder = k === '하자' ? '예: 천장 누수, 창문 손잡이 파손' : '예: 검정 우산, 학생증 (분실 또는 습득)'; } }, k));
  const where = h('input', { type: 'text', maxlength: 40, style: 'width:100%;border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--surface);color:var(--ink);font:inherit', placeholder: '예: 천장 누수, 창문 손잡이 파손', value: draft.label.split(' · 메모: ')[1] || '' });
  const ta = h('textarea', { maxlength: 1000, placeholder: draft.kind === '분실물' ? '물건의 생김새, 분실/발견 시각 등을 적어 주세요' : '언제부터, 어떤 상태인지 자세히 적어 주세요', onInput: () => { draft.detail = ta.value; cnt.textContent = `${ta.value.length}/1000`; } });
  ta.value = draft.detail;
  const cnt = h('div', { class: 'counter' }, `${ta.value.length}/1000`);

  const photoBox = h('label', { class: 'photo' });
  const input = h('input', { type: 'file', accept: 'image/*' });
  const renderPhoto = () => { photoBox.replaceChildren(draft.photo ? h('img', { src: draft.photo, alt: '첨부한 사진' }) : h('div', {}, h('div', { style: 'font-size:28px' }, '📷'), h('div', {}, '사진 찍기 / 선택')), input); };
  input.addEventListener('change', async () => { const f = input.files[0]; if (!f) return; try { draft.photo = await shrinkImage(f); renderPhoto(); } catch (e) { toast(e.message); } });
  renderPhoto();

  const submit = h('button', { class: 'btn block', type: 'button' }, '신고 접수');
  submit.addEventListener('click', async () => {
    const detail = ta.value.trim();
    if (!detail) { toast('세부 내용을 입력해 주세요.'); ta.focus(); return; }
    submit.disabled = true; submit.textContent = '접수 중…';
    try {
      const memo = where.value.trim();
      const row = await api.create({ kind: draft.kind, detail, locationLabel: draft.label + (memo ? ' · ' + memo : ''), pin: draft.pin, photo: draft.photo, shot: draft.shot });
      resetDraft(); nav.tour = null; nav.justAdded = row.id; toast('접수되었어요. 접수현황에서 확인할 수 있어요.'); location.hash = '#/board';
    } catch (e) { toast(e.message); submit.disabled = false; submit.textContent = '신고 접수'; }
  });

  root.append(h('div', { class: 'form' },
    h('div', { class: 'seg' }, ...kindBtns),
    h('div', { class: 'card' }, h('span', { class: 'lbl' }, '핀한 위치'),
      h('div', { class: 'loc' }, draft.shot ? h('img', { src: draft.shot, alt: '핀한 3D 화면' }) : null,
        h('div', {}, h('b', {}, draft.label), h('small', {}, '3D 스캔에서 핀한 곳'), h('br'), h('button', { class: 'linkbtn', type: 'button', onClick: () => history.back() }, '위치 다시 정하기')))),
    h('div', {}, h('span', { class: 'lbl' }, '무엇인가요? (선택)'), where),
    h('div', {}, h('span', { class: 'lbl' }, '직접 찍은 사진 (선택)'), photoBox),
    h('div', {}, h('span', { class: 'lbl' }, '세부 내용'), ta, cnt),
    submit,
    h('p', { class: 'hint', style: 'margin:0' }, '신고 내용은 접수현황에서 모두에게 공개되며, 작성자 정보는 저장하지 않아요.'),
  ));
  return root;
}
