/* ═══════════════════════════════════════════════════════════
   FEITICEIROS & MALDIÇÕES — script.js
   Sistema completo: Ficha, Maldição, Campanha, Temas
═══════════════════════════════════════════════════════════ */
'use strict';

/* ──────────────── ESTADO GLOBAL DA FICHA ATUAL ──────────────── */
let FICHA = freshFicha();
let FICHA_ID = null; // ID da ficha sendo editada

function freshFicha() {
  return {
    nome:'',idade:'',altura:'',peso:'',nivel:1,grau:'IV',
    aparencia:'',personalidade:'',ideais:'',ligacoes:'',complicacoes:'',dominio:'',
    'attr-forca':10,'attr-destreza':10,'attr-constituicao':10,
    'attr-inteligencia':10,'attr-sabedoria':10,'attr-presenca':10,
    'bonus-percepcao':0,'bonus-deslocamento':0,
    origem:'',cla:'',especializacao:'','mod-atributo-pe':0,
    'pv-current':0,'pe-current':0,'alma-current':0,
    'tecnica-nome':'','tecnica-desc':'',
    feiticos:[],itens:[],condicoes:[],
    shikigamis:[],
    'anotacoes-campanha':'','anotacoes-missoes':'','anotacoes-combate':'',
    portrait:null,
  };
}

function freshShikigami() {
  return {
    id:Date.now(),
    nome:'',tipo:'',grau:'IV',nivel:1,afinidade:'',vinculo:'',estado:'Ativo',
    aparencia:'',desc:'',
    comportamento:'Controlado pelo usuário',
    'acao-padrao':'Ação padrão','acao-bonus':'Ação bônus','reacao':'Reação','movimento':'9m',
    resistencias:'',imunidades:'',fraquezas:'',vulnerabilidades:'',
    'attr-forca':10,'attr-destreza':10,'attr-constituicao':10,
    'attr-inteligencia':10,'attr-sabedoria':10,'attr-presenca':10,
    'pv-current':0,'pe-current':0,
    habilidades:[],buffs:[],debuffs:[],
    'metodo-invocacao':'','energia-necessaria':0,'max-invocacoes':1,'invocacoes-atuais':0,
    'distancia-maxima':30,'campo-obediencia':'Completa',
    portrait:null,
    expanded:false,
  };
}

let MALDICAO = freshMaldicao();
let MALDICAO_ID = null;

function freshMaldicao() {
  return {
    'm-nome':'','m-grau':'Grau 4','m-tipo':'Maldição','m-ameaca':'Média','m-inteligencia-nivel':'Instintiva',
    'm-aparencia':'','m-comportamento':'','m-origem':'','m-dominio':'',
    'm-forca':12,'m-destreza':10,'m-constituicao':14,'m-inteligencia':8,'m-sabedoria':10,'m-presenca':10,
    'm-pv-current':0,
    'm-imunidades':'','m-resistencias':'','m-vulnerabilidades':'','m-sentidos':'',
    'm-anotacoes':'',
    habilidades:[],acoes:[],portrait:null,
  };
}

let CAMPANHA = freshCampanha();
let CAMPANHA_ID = null;

function freshCampanha() {
  return {
    nome:'',desc:'',img:null,
    personagens:[],maldicoes:[],eventos:[],arquivos:[],anotacoes:'',
  };
}

/* ──────────────── TABELA DE MODIFICADORES ──────────────── */
function calcMod(v) {
  if(v<=1)return -5;if(v<=3)return -4;if(v<=5)return -3;if(v<=7)return -2;
  if(v<=9)return -1;if(v<=11)return 0;if(v<=13)return 1;if(v<=15)return 2;
  if(v<=17)return 3;if(v<=19)return 4;if(v<=21)return 5;if(v<=23)return 6;
  if(v<=25)return 7;if(v<=27)return 8;if(v<=29)return 9;return 10;
}
const fmtMod = m => m>=0?`+${m}`:`${m}`;

function calcTreinamento(n){if(n<=4)return 2;if(n<=8)return 3;if(n<=12)return 4;if(n<=16)return 5;return 6;}

function calcPVMax(spec,nivel,modCon){
  const base={Lutador:12,'Especialista em Combate':12,'Especialista em Técnica':10,Controlador:10,Suporte:10,Restringido:16};
  const perN={Lutador:6,'Especialista em Combate':6,'Especialista em Técnica':5,Controlador:5,Suporte:5,Restringido:7};
  if(!spec||!base[spec])return 0;
  return Math.max(1,(base[spec]+modCon)+Math.max(0,(nivel-1)*(perN[spec]+modCon)));
}
function calcPEMax(spec,nivel,modAttr){
  const b={Lutador:4,'Especialista em Combate':4,'Especialista em Técnica':6,Controlador:5,Suporte:5,Restringido:0};
  if(!spec||!b.hasOwnProperty(spec)||spec==='Restringido')return 0;
  const somaMod=['Especialista em Técnica','Controlador','Suporte'].includes(spec)?Number(modAttr):0;
  return b[spec]+(nivel-1)*b[spec]+somaMod;
}
function getDV(spec){return{Lutador:'d10','Especialista em Combate':'d10','Especialista em Técnica':'d8',Controlador:'d8',Suporte:'d8',Restringido:'d12'}[spec]||'—';}

/* Calcula PV de maldição baseado no grau */
function calcMaldicaoPV(grau,modCon){
  const mult={['Grau 4']:1,['Grau 3']:2,['Grau 2']:4,['Grau 1']:8,['Grau Especial']:16};
  return Math.max(1,(mult[grau]||1)*(10+modCon));
}

/* Calcula PV de Shikigami */
function calcShikigamiPV(nivel,modCon){
  return Math.max(1,10+modCon+(nivel-1)*(5+modCon));
}

/* Calcula PE de Shikigami */
function calcShikigamiPE(nivel,modAttr){
  return Math.max(0,4+(nivel-1)*2+modAttr);
}

/* ──────────────── UTILIDADES ──────────────── */
const $ = id => document.getElementById(id);
function setText(id,val){const e=$(id);if(e)e.textContent=val;}
function escHtml(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function clearFields(...ids){ids.forEach(id=>{const e=$(id);if(e)e.value=e.type==='number'?'0':'';})}

let toastT=null;
function showToast(msg){
  const t=$('toast');if(!t)return;
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2600);
}

/* ──────────────── NAVEGAÇÃO ENTRE PÁGINAS ──────────────── */
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=$(id);if(pg)pg.classList.add('active');
  window.scrollTo(0,0);
}

function initNavigation(){
  document.body.addEventListener('click',e=>{
    const btn=e.target.closest('[data-page]');
    if(!btn)return;
    const page=btn.dataset.page;
    const action=btn.dataset.action;

    if(action==='new-char'){
      FICHA=freshFicha();FICHA_ID=null;
      resetFichaUI();
      showToast('Arrasa ദ്ദി◝ ⩊ ◜.ᐟ');
    }
    if(action==='new-maldicao'){
      MALDICAO=freshMaldicao();MALDICAO_ID=null;
      resetMaldicaoUI();
      showToast('Adoro monstros sabia? (˵˃ ᗜ ˂˵)');
    }
    if(action==='new-campanha'){
      CAMPANHA=freshCampanha();CAMPANHA_ID=null;
      resetCampanhaUI();
    }

    if(page==='page-feiticeiros-lista')renderListaFeiticeiros();
    if(page==='page-maldicoes-lista')renderListaMaldicoes();
    if(page==='page-campanhas')renderListaCampanhas();
    showPage(page);
  });
}

/* ──────────────── ABAS DA FICHA ──────────────── */
function initTabs(){
  // Abas de feiticeiro
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.nav-btn[data-tab]').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('#page-ficha .tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      const el=$('tab-'+btn.dataset.tab);
      if(el)el.classList.add('active');
      if(btn.dataset.tab==='status')updateStatusPanel();
    });
  });

  // Abas de maldição
  document.querySelectorAll('.nav-btn[data-mtab]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.nav-btn[data-mtab]').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('#page-maldicao-form .tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      const el=$('tab-'+btn.dataset.mtab);
      if(el)el.classList.add('active');
      if(btn.dataset.mtab==='m-status')updateMaldicaoStatus();
    });
  });

  // Abas de campanha
  document.querySelectorAll('.camp-tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.camp-tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.ctab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      const el=$(btn.dataset.ctab);if(el)el.classList.add('active');
    });
  });
}

/* ──────────────── RECALCULAR FICHA ──────────────── */
function recalcular(){
  const nivel=Math.max(1,Math.min(20,parseInt(FICHA.nivel)||1));
  const modFor=calcMod(FICHA['attr-forca']);
  const modDes=calcMod(FICHA['attr-destreza']);
  const modCon=calcMod(FICHA['attr-constituicao']);
  const modInt=calcMod(FICHA['attr-inteligencia']);
  const modSab=calcMod(FICHA['attr-sabedoria']);
  const modPre=calcMod(FICHA['attr-presenca']);

  atualizarMod('forca',modFor);atualizarMod('destreza',modDes);atualizarMod('constituicao',modCon);
  atualizarMod('inteligencia',modInt);atualizarMod('sabedoria',modSab);atualizarMod('presenca',modPre);

  const bt=calcTreinamento(nivel);
  const defesa=10+modDes+Math.floor(nivel/2);
  const atencao=10+(parseInt(FICHA['bonus-percepcao'])||0);
  const desl=9+(parseInt(FICHA['bonus-deslocamento'])||0);
  const spec=FICHA.especializacao;
  const modPE=parseInt(FICHA['mod-atributo-pe'])||0;
  const pvMax=calcPVMax(spec,nivel,modCon);
  const peMax=calcPEMax(spec,nivel,modPE);

  setText('val-defesa',defesa);setText('val-atencao',atencao);
  setText('val-iniciativa',fmtMod(modDes));setText('val-alma',pvMax);
  setText('val-deslocamento',desl+'m');setText('val-treinamento','+'+bt);
  setText('cs-defesa',defesa);setText('cs-iniciativa',fmtMod(modDes));
  setText('cs-atencao',atencao);setText('cs-deslocamento',desl+'m');
  setText('cs-treinamento','+'+bt);setText('cs-dv',getDV(spec));
  setText('pv-max-note',spec||'selecione especialização');
  setText('pe-max-note',spec||'selecione especialização');

  atualizarRecurso('pv',pvMax);atualizarRecurso('pe',peMax);atualizarRecurso('alma',pvMax);

  setText('sidebar-name',FICHA.nome||'— sem nome —');
  setText('sidebar-level',`Nível ${nivel} · Grau ${FICHA.grau||'IV'}`);

  const mostraPE=['Especialista em Técnica','Controlador','Suporte'].includes(spec);
  const rowPE=$('mod-pe-row');if(rowPE)rowPE.style.display=mostraPE?'flex':'none';
}

function atualizarMod(attr,mod){
  const el=$('mod-'+attr);if(!el)return;
  el.textContent=fmtMod(mod);
  el.classList.toggle('negative',mod<0);
}

function atualizarRecurso(tipo,maximo){
  const elMax=$(tipo+'-max'),elCur=$(tipo+'-current'),elFill=$(tipo+'-fill');
  if(elMax)elMax.textContent=maximo;
  let atual=parseInt(FICHA[tipo+'-current'])||0;
  if(atual>maximo)atual=maximo;
  FICHA[tipo+'-current']=atual;
  if(elCur)elCur.textContent=atual;
  const pct=maximo>0?Math.max(0,Math.min(100,(atual/maximo)*100)):0;
  if(elFill){elFill.style.width=pct+'%';elFill.classList.toggle('low',pct<=25);}
}

/* ──────────────── RECALCULAR MALDIÇÃO ──────────────── */
function recalcularMaldicao(){
  const grau=MALDICAO['m-grau']||'Grau 4';
  const modCon=calcMod(parseInt(MALDICAO['m-constituicao'])||10);
  const modDes=calcMod(parseInt(MALDICAO['m-destreza'])||10);
  const pvMax=calcMaldicaoPV(grau,modCon);
  const defesa=10+modDes;

  // Atualiza mods
  ['forca','destreza','constituicao','inteligencia','sabedoria','presenca'].forEach(attr=>{
    const el=$('m-mod-'+attr);
    if(el){const m=calcMod(parseInt(MALDICAO['m-'+attr])||10);el.textContent=fmtMod(m);}
  });

  setText('m-val-pv',pvMax);
  setText('m-val-defesa',defesa);
  setText('m-val-iniciativa',fmtMod(modDes));
  setText('m-pv-max',pvMax);

  // PV atual
  let pvAtual=parseInt(MALDICAO['m-pv-current'])||0;
  if(pvAtual>pvMax)pvAtual=pvMax;
  MALDICAO['m-pv-current']=pvAtual;
  const pvEl=$('m-pv-current');if(pvEl)pvEl.textContent=pvAtual;
  const pvFill=$('m-pv-fill');
  if(pvFill){const pct=pvMax>0?Math.max(0,Math.min(100,(pvAtual/pvMax)*100)):0;pvFill.style.width=pct+'%';pvFill.classList.toggle('low',pct<=25);}

  setText('m-sidebar-name',MALDICAO['m-nome']||'— sem nome —');
  setText('m-sidebar-level',grau);
}

/* ──────────────── BIND CAMPOS DA FICHA ──────────────── */
function bindFichaFields(){
  document.querySelectorAll('[data-save]').forEach(el=>{
    const key=el.dataset.save;
    const h=()=>{
      let v=el.type==='number'?(parseInt(el.value)||0):el.value;
      if(key.startsWith('attr-')){v=Math.max(1,Math.min(30,parseInt(el.value)||1));el.value=v;}
      FICHA[key]=v;recalcular();scheduleAutoSave();
      if(key==='nome')setText('sidebar-name',v||'— sem nome —');
    };
    el.addEventListener('input',h);el.addEventListener('change',h);
  });
}

function bindMaldicaoFields(){
  document.querySelectorAll('[data-msave]').forEach(el=>{
    const key=el.dataset.msave;
    const h=()=>{
      let v=el.type==='number'?(parseInt(el.value)||0):el.value;
      if(['m-forca','m-destreza','m-constituicao','m-inteligencia','m-sabedoria','m-presenca'].includes(key)){
        v=Math.max(1,Math.min(30,parseInt(el.value)||1));el.value=v;
        // Sync input
        const inp=$('m-attr-'+key.replace('m-',''));if(inp)inp.value=v;
      }
      MALDICAO[key]=v;recalcularMaldicao();
    };
    el.addEventListener('input',h);el.addEventListener('change',h);
  });
}

/* ──────────────── BOTÕES +/- ATRIBUTOS ──────────────── */
function initAttrButtons(){
  // Atributos ficha
  document.querySelectorAll('.attr-btn[data-attr]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const a=btn.dataset.attr;const key='attr-'+a;
      const inp=$('attr-'+a);
      let v=parseInt(FICHA[key])||10;
      v=btn.classList.contains('attr-plus')?Math.min(30,v+1):Math.max(1,v-1);
      FICHA[key]=v;if(inp)inp.value=v;recalcular();scheduleAutoSave();
    });
  });

  // Atributos maldição
  document.querySelectorAll('.attr-btn[data-mattr]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const key=btn.dataset.mattr; // 'm-forca' etc
      const attr=key.replace('m-','');
      const inp=$('m-attr-'+attr);
      let v=parseInt(MALDICAO[key])||10;
      v=btn.classList.contains('attr-plus')?Math.min(30,v+1):Math.max(1,v-1);
      MALDICAO[key]=v;if(inp)inp.value=v;recalcularMaldicao();
    });
  });
}

/* ──────────────── BOTÕES +/- RECURSOS ──────────────── */
function initResourceButtons(){
  // Recursos ficha
  document.querySelectorAll('.res-btn[data-res]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const t=btn.dataset.res;
      const nivel=parseInt(FICHA.nivel)||1;
      const modCon=calcMod(parseInt(FICHA['attr-constituicao'])||10);
      const modPE=parseInt(FICHA['mod-atributo-pe'])||0;
      const spec=FICHA.especializacao;
      let mx=0;
      if(t==='pv')mx=calcPVMax(spec,nivel,modCon);
      else if(t==='pe')mx=calcPEMax(spec,nivel,modPE);
      else mx=calcPVMax(spec,nivel,modCon);
      let v=parseInt(FICHA[t+'-current'])||0;
      if(btn.classList.contains('res-minus'))v=Math.max(0,v-1);
      else v=Math.min(mx,v+1);
      FICHA[t+'-current']=v;atualizarRecurso(t,mx);scheduleAutoSave();
    });
  });

  // PV da maldição
  document.querySelectorAll('.res-btn[data-mres]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const grau=MALDICAO['m-grau']||'Grau 4';
      const modCon=calcMod(parseInt(MALDICAO['m-constituicao'])||10);
      const mx=calcMaldicaoPV(grau,modCon);
      let v=parseInt(MALDICAO['m-pv-current'])||0;
      if(btn.classList.contains('res-minus'))v=Math.max(0,v-1);
      else v=Math.min(mx,v+1);
      MALDICAO['m-pv-current']=v;recalcularMaldicao();
    });
  });
}

/* ──────────────── ORIGEM ──────────────── */
function initOrigemCards(){
  document.querySelectorAll('.origin-card').forEach(card=>{
    card.addEventListener('click',()=>{
      document.querySelectorAll('.origin-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      const o=card.dataset.origin;FICHA.origem=o;
      const cs=$('clan-section');
      if(o==='Herdado')cs.classList.remove('hidden');
      else{cs.classList.add('hidden');FICHA.cla='';document.querySelectorAll('.clan-card').forEach(c=>c.classList.remove('selected'));}
      const disp=$('origin-selected-display');
      if(disp){disp.classList.remove('hidden');setText('origin-selected-info',o);}
      if(o==='Restringido'&&!FICHA['bonus-deslocamento']){FICHA['bonus-deslocamento']=3;const e=$('bonus-deslocamento');if(e)e.value=3;}
      recalcular();scheduleAutoSave();
    });
  });
  document.querySelectorAll('.clan-card').forEach(card=>{
    card.addEventListener('click',()=>{
      document.querySelectorAll('.clan-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      FICHA.cla=card.dataset.clan;
      const cc=$('selected-clan-container');if(cc)cc.classList.remove('hidden');
      setText('clan-selected-info',card.dataset.clan);
      scheduleAutoSave();
    });
  });
}

/* ──────────────── ESPECIALIZAÇÃO ──────────────── */
const SPEC_DESC={
  'Lutador':'Combate físico. Dado: d10. Corpo Treinado (ataque d8+). Reflexo Evasivo (RD).',
  'Especialista em Combate':'Estilos de combate e Arte do Combate. Dado: d10.',
  'Especialista em Técnica':'Domínio da energia amaldiçoada. Soma Mod ao PE. Dado: d8.',
  'Controlador':'Invoca e controla Shikigamis/Marionetes. Dado: d8.',
  'Suporte':'Cura e apoio a aliados. Dado: d8.',
  'Restringido':'Físico anormal, sem PE. Exclusivo para Origem Restringido. Dado: d12.',
};

function initSpecCards(){
  document.querySelectorAll('.spec-card').forEach(card=>{
    card.addEventListener('click',()=>{
      document.querySelectorAll('.spec-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      const spec=card.dataset.spec;FICHA.especializacao=spec;
      const box=$('spec-info-box');if(box)box.classList.remove('hidden');
      setText('spec-info-icon',card.querySelector('.spec-glyph').textContent);
      setText('spec-info-name',spec);
      setText('spec-info-stats',card.querySelector('.spec-pv-pe').textContent);
      setText('spec-info-details',SPEC_DESC[spec]||'');
      recalcular();
      const nivel=parseInt(FICHA.nivel)||1;
      const modCon=calcMod(parseInt(FICHA['attr-constituicao'])||10);
      const modPE=parseInt(FICHA['mod-atributo-pe'])||0;
      if(!FICHA['pv-current'])FICHA['pv-current']=calcPVMax(spec,nivel,modCon);
      if(!FICHA['pe-current'])FICHA['pe-current']=calcPEMax(spec,nivel,modPE);
      scheduleAutoSave();
    });
  });
}

/* ──────────────── CONDIÇÕES ──────────────── */
const CONDICOES=['Abalado','Amedrontado','Cego','Confuso','Desorientado','Enjoado','Exposto','Caído','Agarrado','Incapacitado','Inconsciente','Invisível','Paralisado','Surpreso','Envenenado','Exausto','Morrendo','Concentração'];

function initCondicoes(){
  const grid=$('conditions-grid');if(!grid)return;
  CONDICOES.forEach(c=>{
    const chip=document.createElement('div');
    chip.className='condition-chip'+(FICHA.condicoes?.includes(c)?' active':'');
    chip.textContent=c;chip.dataset.cond=c;
    chip.addEventListener('click',()=>{
      chip.classList.toggle('active');
      if(!FICHA.condicoes)FICHA.condicoes=[];
      if(chip.classList.contains('active')){if(!FICHA.condicoes.includes(c))FICHA.condicoes.push(c);}
      else FICHA.condicoes=FICHA.condicoes.filter(x=>x!==c);
      scheduleAutoSave();
    });
    grid.appendChild(chip);
  });
}

/* ──────────────── FEITIÇOS ──────────────── */
let feiticoImgPreview=null;
function initFeiticos(){
  $('btn-add-feitico')?.addEventListener('click',()=>$('feitico-form')?.classList.toggle('hidden'));
  $('btn-cancel-feitico')?.addEventListener('click',()=>{$('feitico-form')?.classList.add('hidden');feiticoImgPreview=null;});
  $('f-img')?.addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{feiticoImgPreview=ev.target.result;};r.readAsDataURL(f);
  });
  $('btn-confirm-feitico')?.addEventListener('click',()=>{
    const nome=$('f-nome')?.value.trim();if(!nome){showToast('Informe o nome!');return;}
    FICHA.feiticos.push({id:Date.now(),nome,custo:$('f-custo')?.value||'0',alcance:$('f-alcance')?.value.trim(),dano:$('f-dano')?.value.trim(),tipo:$('f-tipo')?.value,desc:$('f-desc')?.value.trim(),obs:$('f-obs')?.value.trim(),img:feiticoImgPreview});
    renderFeiticos();clearFields('f-nome','f-custo','f-alcance','f-dano','f-desc','f-obs');$('f-img').value='';feiticoImgPreview=null;$('feitico-form')?.classList.add('hidden');scheduleAutoSave();showToast(`"${nome}" adicionado!`);
  });
  renderFeiticos();
}

function renderFeiticos(){
  const list=$('feiticos-list');if(!list)return;list.innerHTML='';
  if(!FICHA.feiticos.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Nenhum feitiço adicionado.</div>';return;}
  FICHA.feiticos.forEach((f,i)=>{
    const el=document.createElement('div');el.className='item-entry';
    el.innerHTML=`${f.img?`<div style="width:80px;height:80px;flex-shrink:0;"><img src="${escHtml(f.img)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`:'<div style="width:80px;height:80px;flex-shrink:0;background:var(--bg-card);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:2rem;border:1px solid var(--border-faint);">✨</div>'}<div class="item-entry-main"><div class="item-entry-name">${escHtml(f.nome)}</div><div class="item-entry-meta">${f.custo} PE · Alcance: ${escHtml(f.alcance)||'—'} · Dano: ${escHtml(f.dano)||'—'}</div>${f.desc?`<div class="item-entry-desc">${escHtml(f.desc)}</div>`:''}</div><span class="item-entry-type">${escHtml(f.tipo)}</span><button class="item-remove-btn" data-idx="${i}">✕</button>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.item-remove-btn').forEach(b=>{b.addEventListener('click',()=>{const n=FICHA.feiticos[parseInt(b.dataset.idx)]?.nome||'feitiço';FICHA.feiticos.splice(parseInt(b.dataset.idx),1);renderFeiticos();scheduleAutoSave();showToast(`"${n}" removido.`);});});
}

/* ──────────────── INVENTÁRIO ──────────────── */
let itemImgPreview=null;
function initInventario(){
  $('btn-add-item')?.addEventListener('click',()=>$('item-form')?.classList.toggle('hidden'));
  $('btn-cancel-item')?.addEventListener('click',()=>{$('item-form')?.classList.add('hidden');itemImgPreview=null;});
  $('i-img')?.addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{itemImgPreview=ev.target.result;};r.readAsDataURL(f);
  });
  $('btn-confirm-item')?.addEventListener('click',()=>{
    const nome=$('i-nome')?.value.trim();if(!nome){showToast('Informe o nome!');return;}
    FICHA.itens.push({id:Date.now(),nome,categoria:$('i-categoria')?.value,qtd:parseInt($('i-qtd')?.value)||1,peso:parseFloat($('i-peso')?.value)||0,desc:$('i-desc')?.value.trim(),img:itemImgPreview});
    renderItens();clearFields('i-nome','i-desc');$('i-img').value='';itemImgPreview=null;$('item-form')?.classList.add('hidden');scheduleAutoSave();showToast(`"${nome}" adicionado!`);
  });
  renderItens();
}

function renderItens(){
  const list=$('itens-list');if(!list)return;list.innerHTML='';
  let total=0;
  if(!FICHA.itens.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Inventário vazio.</div>';}
  else{
    FICHA.itens.forEach((item,i)=>{
      total+=(item.peso||0)*(item.qtd||1);
      const el=document.createElement('div');el.className='item-entry';
      el.innerHTML=`${item.img?`<div style="width:80px;height:80px;flex-shrink:0;"><img src="${escHtml(item.img)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`:'<div style="width:80px;height:80px;flex-shrink:0;background:var(--bg-card);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:2rem;border:1px solid var(--border-faint);">📦</div>'}<div class="item-entry-main"><div class="item-entry-name">${escHtml(item.nome)}</div><div class="item-entry-meta">Qtd: ${item.qtd} · Espaços: ${item.peso} </div>${item.desc?`<div class="item-entry-desc">${escHtml(item.desc)}</div>`:''}</div><span class="item-entry-type">${escHtml(item.categoria)}</span><button class="item-remove-btn" data-idx="${i}">✕</button>`;
      list.appendChild(el);
    });
    list.querySelectorAll('.item-remove-btn').forEach(b=>{b.addEventListener('click',()=>{const n=FICHA.itens[parseInt(b.dataset.idx)]?.nome||'item';FICHA.itens.splice(parseInt(b.dataset.idx),1);renderItens();scheduleAutoSave();showToast(`"${n}" removido.`);});});
  }
  setText('total-weight',total.toFixed(1)+' ');
}

/* ──────────────── HABILIDADES DA MALDIÇÃO ──────────────── */
function initMaldicaoHabilidades(){
  $('btn-add-m-hab')?.addEventListener('click',()=>$('m-hab-form')?.classList.toggle('hidden'));
  $('btn-cancel-m-hab')?.addEventListener('click',()=>$('m-hab-form')?.classList.add('hidden'));
  $('btn-confirm-m-hab')?.addEventListener('click',()=>{
    const nome=$('mh-nome')?.value.trim();if(!nome){showToast('Informe o nome!');return;}
    MALDICAO.habilidades.push({id:Date.now(),nome,tipo:$('mh-tipo')?.value,dano:$('mh-dano')?.value.trim(),desc:$('mh-desc')?.value.trim()});
    renderMaldicaoHabilidades();clearFields('mh-nome','mh-dano','mh-desc');$('m-hab-form')?.classList.add('hidden');showToast('Habilidade adicionada!');
  });
  renderMaldicaoHabilidades();
}
function renderMaldicaoHabilidades(){
  const list=$('m-hab-list');if(!list)return;list.innerHTML='';
  if(!MALDICAO.habilidades.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Nenhuma habilidade.</div>';return;}
  MALDICAO.habilidades.forEach((h,i)=>{
    const el=document.createElement('div');el.className='item-entry';
    el.innerHTML=`<div class="item-entry-main"><div class="item-entry-name">${escHtml(h.nome)}</div><div class="item-entry-meta">${escHtml(h.tipo)} · ${escHtml(h.dano)||'—'}</div>${h.desc?`<div class="item-entry-desc">${escHtml(h.desc)}</div>`:''}</div><button class="item-remove-btn" data-idx="${i}">✕</button>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.item-remove-btn').forEach(b=>{b.addEventListener('click',()=>{MALDICAO.habilidades.splice(parseInt(b.dataset.idx),1);renderMaldicaoHabilidades();showToast('Removido.');});});
}

/* ──────────────── AÇÕES DA MALDIÇÃO ──────────────── */
function initMaldicaoAcoes(){
  $('btn-add-m-acao')?.addEventListener('click',()=>$('m-acao-form')?.classList.toggle('hidden'));
  $('btn-cancel-m-acao')?.addEventListener('click',()=>$('m-acao-form')?.classList.add('hidden'));
  $('btn-confirm-m-acao')?.addEventListener('click',()=>{
    const nome=$('ma-nome')?.value.trim();if(!nome){showToast('Informe o nome!');return;}
    MALDICAO.acoes.push({id:Date.now(),nome,tipo:$('ma-tipo')?.value,alcance:$('ma-alcance')?.value.trim(),dano:$('ma-dano')?.value.trim(),desc:$('ma-desc')?.value.trim()});
    renderMaldicaoAcoes();clearFields('ma-nome','ma-alcance','ma-dano','ma-desc');$('m-acao-form')?.classList.add('hidden');showToast('Ação adicionada!');
  });
  renderMaldicaoAcoes();
}
function renderMaldicaoAcoes(){
  const list=$('m-acoes-list');if(!list)return;list.innerHTML='';
  if(!MALDICAO.acoes.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Nenhuma ação.</div>';return;}
  MALDICAO.acoes.forEach((a,i)=>{
    const el=document.createElement('div');el.className='item-entry';
    el.innerHTML=`<div class="item-entry-main"><div class="item-entry-name">${escHtml(a.nome)}</div><div class="item-entry-meta">${escHtml(a.tipo)} · Alcance: ${escHtml(a.alcance)||'—'} · Dano: ${escHtml(a.dano)||'—'}</div>${a.desc?`<div class="item-entry-desc">${escHtml(a.desc)}</div>`:''}</div><button class="item-remove-btn" data-idx="${i}">✕</button>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.item-remove-btn').forEach(b=>{b.addEventListener('click',()=>{MALDICAO.acoes.splice(parseInt(b.dataset.idx),1);renderMaldicaoAcoes();showToast('Removido.');});});
}

/* ──────────────── STATUS PANELS ──────────────── */
function updateStatusPanel(){
  const nivel=parseInt(FICHA.nivel)||1;
  const modCon=calcMod(parseInt(FICHA['attr-constituicao'])||10);
  const modDes=calcMod(parseInt(FICHA['attr-destreza'])||10);
  const modPE=parseInt(FICHA['mod-atributo-pe'])||0;
  const spec=FICHA.especializacao;
  const bt=calcTreinamento(nivel);
  const pvMax=calcPVMax(spec,nivel,modCon);
  const peMax=calcPEMax(spec,nivel,modPE);
  const desl=9+(parseInt(FICHA['bonus-deslocamento'])||0);
  setText('st-nome',FICHA.nome||'—');setText('st-nivel',nivel);setText('st-grau',FICHA.grau||'IV');
  setText('st-origem',FICHA.origem||'—');setText('st-spec',spec||'—');
  ['forca','destreza','constituicao','inteligencia','sabedoria','presenca'].forEach(a=>{const v=parseInt(FICHA['attr-'+a])||10;setText('st-'+a,`${v} (${fmtMod(calcMod(v))})`);});
  setText('st-pv',pvMax);setText('st-pe',spec==='Restringido'?'— (Estamina)':peMax);
  setText('st-def',10+modDes+Math.floor(nivel/2));setText('st-init',fmtMod(modDes));
  setText('st-desl',desl+'m');setText('st-alma',pvMax);
  setText('st-tecnica',FICHA['tecnica-nome']||'—');
  setText('st-feiticos',FICHA.feiticos.length);setText('st-itens',FICHA.itens.length);setText('st-treino','+'+bt);
}

function updateMaldicaoStatus(){
  setText('mst-nome',MALDICAO['m-nome']||'—');setText('mst-grau',MALDICAO['m-grau']||'—');
  setText('mst-tipo',MALDICAO['m-tipo']||'—');setText('mst-ameaca',MALDICAO['m-ameaca']||'—');
  const af=a=>{ const v=parseInt(MALDICAO['m-'+a])||10;return `${v} (${fmtMod(calcMod(v))})`;};
  setText('mst-forca',af('forca'));setText('mst-destreza',af('destreza'));
  setText('mst-constituicao',af('constituicao'));setText('mst-inteligencia',af('inteligencia'));
  const modCon=calcMod(parseInt(MALDICAO['m-constituicao'])||10);
  const modDes=calcMod(parseInt(MALDICAO['m-destreza'])||10);
  setText('mst-pv',calcMaldicaoPV(MALDICAO['m-grau']||'Grau 4',modCon));
  setText('mst-def',10+modDes);setText('mst-init',fmtMod(modDes));
  setText('mst-tecnicas',MALDICAO.habilidades.length);setText('mst-acoes',MALDICAO.acoes.length);
}

/* ──────────────── PORTRAIT UPLOAD ──────────────── */
function initPortraitUploads(){
  // Ficha
  $('portrait-upload')?.addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{FICHA.portrait=ev.target.result;const pr=$('portrait-preview');if(pr){pr.src=ev.target.result;pr.style.display='block';}$('portrait-placeholder')?.style.setProperty('display','none');scheduleAutoSave();};r.readAsDataURL(f);
  });
  // Maldição
  $('m-portrait-upload')?.addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{MALDICAO.portrait=ev.target.result;const pr=$('m-portrait-preview');if(pr){pr.src=ev.target.result;pr.style.display='block';}$('m-portrait-placeholder')?.style.setProperty('display','none');};r.readAsDataURL(f);
  });
  // Campanha
  $('camp-img-upload')?.addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{CAMPANHA.img=ev.target.result;const pr=$('camp-img-preview');if(pr){pr.src=ev.target.result;pr.style.display='block';}$('camp-img-placeholder')?.style.setProperty('display','none');};r.readAsDataURL(f);
  });
}

/* ──────────────── SALVAMENTO — LocalStorage ──────────────── */
const SK_CHARS='fmk_feiticeiros';
const SK_MALS='fmk_maldicoes';
const SK_CAMPS='fmk_campanhas';
const SK_TEMA='fmk_tema';

let autoSaveT=null;
function scheduleAutoSave(){clearTimeout(autoSaveT);autoSaveT=setTimeout(saveIndicator,600);}
function saveIndicator(){const i=$('save-indicator');if(i){i.classList.add('visible');setTimeout(()=>i.classList.remove('visible'),2000);}}

function getList(key){try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return[];}}
function setList(key,arr){localStorage.setItem(key,JSON.stringify(arr));}

/* Salvar ficha atual */
function saveFicha(){
  const list=getList(SK_CHARS);
  if(FICHA_ID){const idx=list.findIndex(x=>x.id===FICHA_ID);if(idx>=0)list[idx]={...FICHA,id:FICHA_ID};else list.push({...FICHA,id:FICHA_ID});}
  else{FICHA_ID=Date.now();list.push({...FICHA,id:FICHA_ID});}
  setList(SK_CHARS,list);showToast('Ficha salva!');saveIndicator();
}

/* Salvar maldição atual */
function saveMaldicao(){
  const list=getList(SK_MALS);
  if(MALDICAO_ID){const idx=list.findIndex(x=>x.id===MALDICAO_ID);if(idx>=0)list[idx]={...MALDICAO,id:MALDICAO_ID};else list.push({...MALDICAO,id:MALDICAO_ID});}
  else{MALDICAO_ID=Date.now();list.push({...MALDICAO,id:MALDICAO_ID});}
  setList(SK_MALS,list);showToast('Maldição salva!');
}

/* Salvar campanha atual */
function saveCampanha(){
  CAMPANHA.nome=$('camp-nome')?.value.trim()||'Sem nome';
  CAMPANHA.desc=$('camp-desc')?.value.trim();
  CAMPANHA.anotacoes=$('camp-anotacoes')?.value.trim();
  const list=getList(SK_CAMPS);
  if(CAMPANHA_ID){const idx=list.findIndex(x=>x.id===CAMPANHA_ID);if(idx>=0)list[idx]={...CAMPANHA,id:CAMPANHA_ID};else list.push({...CAMPANHA,id:CAMPANHA_ID});}
  else{CAMPANHA_ID=Date.now();list.push({...CAMPANHA,id:CAMPANHA_ID});}
  setList(SK_CAMPS,list);showToast('Campanha salva!');
}

/* ──────────────── EXPORTAR / IMPORTAR ──────────────── */
function initExportImport(){
  $('btn-save-char')?.addEventListener('click',saveFicha);
  $('btn-export-char')?.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(FICHA,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`ficha_${(FICHA.nome||'personagem').replace(/\s+/g,'_')}.json`;a.click();
    showToast('Ficha exportada!');
  });
  $('btn-import-trigger')?.addEventListener('click',()=>$('btn-import-char')?.click());
  $('btn-import-char')?.addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{try{const data=JSON.parse(ev.target.result);Object.assign(FICHA,data);populateFichaFields();recalcular();renderFeiticos();renderItens();showToast('Ficha importada!');}catch{showToast('Erro ao importar JSON.');}};
    r.readAsText(f);e.target.value='';
  });
  $('btn-reset')?.addEventListener('click',()=>{if(!confirm('Resetar ficha? Dados não salvos serão perdidos.'))return;FICHA=freshFicha();FICHA_ID=null;resetFichaUI();showToast('Ficha resetada.');});
  $('btn-save-maldicao')?.addEventListener('click',saveMaldicao);
  $('btn-save-campanha')?.addEventListener('click',saveCampanha);
}

/* ──────────────── LISTAS — FEITICEIROS ──────────────── */
function renderListaFeiticeiros(){
  const cont=$('lista-feiticeiros');if(!cont)return;
  const list=getList(SK_CHARS);
  const empty=$('empty-feiticeiros');
  if(empty)empty.style.display=list.length?'none':'block';
  cont.querySelectorAll('.char-card').forEach(c=>c.remove());
  list.forEach(char=>{
    const card=document.createElement('div');card.className='char-card';
    card.innerHTML=`<div class="char-card-img">${char.portrait?`<img src="${escHtml(char.portrait)}" alt="">`:'<div class="char-card-img-placeholder">⛧</div>'}</div><div class="char-card-body"><div class="char-card-name">${escHtml(char.nome||'Sem nome')}</div><div class="char-card-meta">Nível ${char.nivel||1} · ${escHtml(char.grau||'IV')} Grau · ${escHtml(char.especializacao||'—')}</div></div><div class="char-card-actions"><button class="char-card-btn" data-cid="${char.id}">✏ Editar</button><button class="char-card-btn del" data-del="${char.id}">✕ Excluir</button></div>`;
    cont.appendChild(card);
    card.querySelector('[data-cid]')?.addEventListener('click',()=>{Object.assign(FICHA,char);FICHA_ID=char.id;populateFichaFields();recalcular();renderFeiticos();renderItens();showPage('page-ficha');});
    card.querySelector('[data-del]')?.addEventListener('click',e=>{e.stopPropagation();if(!confirm(`Excluir "${char.nome||'personagem'}"?`))return;const l=getList(SK_CHARS).filter(x=>x.id!==char.id);setList(SK_CHARS,l);renderListaFeiticeiros();showToast('Excluído.');});
  });
}

/* ──────────────── LISTAS — MALDIÇÕES ──────────────── */
function renderListaMaldicoes(){
  const cont=$('lista-maldicoes');if(!cont)return;
  const list=getList(SK_MALS);
  const empty=$('empty-maldicoes');
  if(empty)empty.style.display=list.length?'none':'block';
  cont.querySelectorAll('.char-card').forEach(c=>c.remove());
  list.forEach(mal=>{
    const card=document.createElement('div');card.className='char-card';
    card.innerHTML=`<div class="char-card-img">${mal.portrait?`<img src="${escHtml(mal.portrait)}" alt="">`:'<div class="char-card-img-placeholder">☠</div>'}</div><div class="char-card-body"><div class="char-card-name">${escHtml(mal['m-nome']||'Sem nome')}</div><div class="char-card-meta">${escHtml(mal['m-grau']||'—')} · ${escHtml(mal['m-tipo']||'—')} · Ameaça: ${escHtml(mal['m-ameaca']||'—')}</div></div><div class="char-card-actions"><button class="char-card-btn" data-mid="${mal.id}">✏ Editar</button><button class="char-card-btn del" data-del="${mal.id}">✕ Excluir</button></div>`;
    cont.appendChild(card);
    card.querySelector('[data-mid]')?.addEventListener('click',()=>{Object.assign(MALDICAO,mal);MALDICAO_ID=mal.id;populateMaldicaoFields();recalcularMaldicao();renderMaldicaoHabilidades();renderMaldicaoAcoes();showPage('page-maldicao-form');});
    card.querySelector('[data-del]')?.addEventListener('click',e=>{e.stopPropagation();if(!confirm(`Excluir "${mal['m-nome']||'maldição'}"?`))return;const l=getList(SK_MALS).filter(x=>x.id!==mal.id);setList(SK_MALS,l);renderListaMaldicoes();showToast('Excluído.');});
  });
}

/* ──────────────── LISTAS — CAMPANHAS ──────────────── */
function renderListaCampanhas(){
  const cont=$('lista-campanhas');if(!cont)return;
  const list=getList(SK_CAMPS);
  const empty=$('empty-campanhas');
  if(empty)empty.style.display=list.length?'none':'block';
  cont.querySelectorAll('.char-card').forEach(c=>c.remove());
  list.forEach(camp=>{
    const card=document.createElement('div');card.className='char-card';
    card.innerHTML=`<div class="char-card-img">${camp.img?`<img src="${escHtml(camp.img)}" alt="">`:'<div class="char-card-img-placeholder">📜</div>'}</div><div class="char-card-body"><div class="char-card-name">${escHtml(camp.nome||'Sem nome')}</div><div class="char-card-meta">${camp.personagens?.length||0} personagens · ${camp.maldicoes?.length||0} maldições · ${camp.eventos?.length||0} eventos</div></div><div class="char-card-actions"><button class="char-card-btn" data-cpid="${camp.id}">✏ Editar</button><button class="char-card-btn del" data-del="${camp.id}">✕ Excluir</button></div>`;
    cont.appendChild(card);
    card.querySelector('[data-cpid]')?.addEventListener('click',()=>{Object.assign(CAMPANHA,camp);CAMPANHA_ID=camp.id;populateCampanhaFields();showPage('page-campanha-form');});
    card.querySelector('[data-del]')?.addEventListener('click',e=>{e.stopPropagation();if(!confirm(`Excluir "${camp.nome||'campanha'}"?`))return;const l=getList(SK_CAMPS).filter(x=>x.id!==camp.id);setList(SK_CAMPS,l);renderListaCampanhas();showToast('Excluído.');});
  });
}

/* ──────────────── CAMPANHA — PERSONAGENS/MALDIÇÕES ──────────────── */
function initCampanhaPersonagens(){
  $('btn-camp-add-char')?.addEventListener('click',()=>{
    const chars=getList(SK_CHARS);
    if(!chars.length){showToast('Crie um feiticeiro primeiro!');return;}
    const nome=prompt('Nome do feiticeiro para adicionar:\n'+chars.map((c,i)=>`${i+1}. ${c.nome||'Sem nome'}`).join('\n')+'\n\nDigite o número:');
    const idx=parseInt(nome)-1;
    if(isNaN(idx)||idx<0||idx>=chars.length)return;
    const char=chars[idx];
    if(CAMPANHA.personagens.find(p=>p.id===char.id)){showToast('Já adicionado!');return;}
    CAMPANHA.personagens.push({id:char.id,nome:char.nome||'Sem nome',nivel:char.nivel||1,grau:char.grau||'IV'});
    renderCampanhaPersonagens();showToast(`"${char.nome}" adicionado!`);
  });
  renderCampanhaPersonagens();
}

function renderCampanhaPersonagens(){
  const list=$('camp-chars-list');if(!list)return;list.innerHTML='';
  if(!CAMPANHA.personagens?.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Nenhum personagem adicionado.</div>';return;}
  CAMPANHA.personagens.forEach((p,i)=>{
    const el=document.createElement('div');el.className='item-entry';
    el.innerHTML=`<div class="item-entry-main"><div class="item-entry-name">${escHtml(p.nome)}</div><div class="item-entry-meta">Nível ${p.nivel} · Grau ${p.grau}</div></div><button class="item-remove-btn" data-idx="${i}">✕</button>`;
    list.appendChild(el);
    el.querySelector('.item-remove-btn')?.addEventListener('click',()=>{CAMPANHA.personagens.splice(i,1);renderCampanhaPersonagens();});
  });
}

function initCampanhaMaldicoes(){
  $('btn-camp-add-mal')?.addEventListener('click',()=>{
    const mals=getList(SK_MALS);
    if(!mals.length){showToast('Crie uma maldição primeiro!');return;}
    const nome=prompt('Qual maldição adicionar?\n'+mals.map((m,i)=>`${i+1}. ${m['m-nome']||'Sem nome'}`).join('\n')+'\n\nDigite o número:');
    const idx=parseInt(nome)-1;
    if(isNaN(idx)||idx<0||idx>=mals.length)return;
    const mal=mals[idx];
    if(CAMPANHA.maldicoes.find(m=>m.id===mal.id)){showToast('Já adicionada!');return;}
    CAMPANHA.maldicoes.push({id:mal.id,nome:mal['m-nome']||'Sem nome',grau:mal['m-grau']||'—'});
    renderCampanhaMaldicoes();showToast('Maldição adicionada!');
  });
  renderCampanhaMaldicoes();
}

function renderCampanhaMaldicoes(){
  const list=$('camp-mals-list');if(!list)return;list.innerHTML='';
  if(!CAMPANHA.maldicoes?.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Nenhuma maldição adicionada.</div>';return;}
  CAMPANHA.maldicoes.forEach((m,i)=>{
    const el=document.createElement('div');el.className='item-entry';
    el.innerHTML=`<div class="item-entry-main"><div class="item-entry-name">${escHtml(m.nome)}</div><div class="item-entry-meta">${escHtml(m.grau)}</div></div><button class="item-remove-btn" data-idx="${i}">✕</button>`;
    list.appendChild(el);
    el.querySelector('.item-remove-btn')?.addEventListener('click',()=>{CAMPANHA.maldicoes.splice(i,1);renderCampanhaMaldicoes();});
  });
}

/* ──────────────── CAMPANHA — EVENTOS ──────────────── */
function initEventos(){
  $('btn-add-evento')?.addEventListener('click',()=>$('evento-form')?.classList.toggle('hidden'));
  $('btn-cancel-evento')?.addEventListener('click',()=>$('evento-form')?.classList.add('hidden'));
  $('btn-confirm-evento')?.addEventListener('click',()=>{
    const t=$('ev-titulo')?.value.trim();if(!t){showToast('Informe o título!');return;}
    CAMPANHA.eventos.push({id:Date.now(),titulo:t,data:$('ev-data')?.value.trim(),desc:$('ev-desc')?.value.trim()});
    renderEventos();clearFields('ev-titulo','ev-data','ev-desc');$('evento-form')?.classList.add('hidden');showToast('Evento adicionado!');
  });
  renderEventos();
}
function renderEventos(){
  const list=$('eventos-list');if(!list)return;list.innerHTML='';
  if(!CAMPANHA.eventos?.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Nenhum evento registrado.</div>';return;}
  CAMPANHA.eventos.forEach((ev,i)=>{
    const el=document.createElement('div');el.className='item-entry';
    el.innerHTML=`<div class="item-entry-main"><div class="item-entry-name">${escHtml(ev.titulo)}</div>${ev.data?`<div class="item-entry-meta">${escHtml(ev.data)}</div>`:''}<div class="item-entry-desc">${escHtml(ev.desc||'')}</div></div><button class="item-remove-btn" data-idx="${i}">✕</button>`;
    list.appendChild(el);
    el.querySelector('.item-remove-btn')?.addEventListener('click',()=>{CAMPANHA.eventos.splice(i,1);renderEventos();});
  });
}

/* ──────────────── CAMPANHA — ARQUIVOS ──────────────── */
function initArquivos(){
  $('camp-file-upload')?.addEventListener('change',e=>{
    Array.from(e.target.files).forEach(f=>{
      const r=new FileReader();
      r.onload=ev=>{
        CAMPANHA.arquivos.push({id:Date.now(),nome:f.name,tipo:f.type,tamanho:f.size,data:ev.target.result});
        renderArquivos();showToast(`"${f.name}" adicionado!`);
      };
      r.readAsDataURL(f);
    });
    e.target.value='';
  });
  renderArquivos();
}
function renderArquivos(){
  const list=$('arquivos-list');if(!list)return;list.innerHTML='';
  if(!CAMPANHA.arquivos?.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Nenhum arquivo.</div>';return;}
  CAMPANHA.arquivos.forEach((arq,i)=>{
    const el=document.createElement('div');el.className='item-entry';
    const icon=arq.tipo?.startsWith('image')?'🖼':arq.tipo?.startsWith('audio')?'🎵':'📄';
    el.innerHTML=`<div class="item-entry-main"><div class="item-entry-name">${icon} ${escHtml(arq.nome)}</div><div class="item-entry-meta">${arq.tipo||'arquivo'}</div></div><button class="item-remove-btn" data-idx="${i}">✕</button>`;
    list.appendChild(el);
    el.querySelector('.item-remove-btn')?.addEventListener('click',()=>{CAMPANHA.arquivos.splice(i,1);renderArquivos();});
  });
}

/* ──────────────── POPULAR CAMPOS ──────────────── */
function populateFichaFields(){
  document.querySelectorAll('[data-save]').forEach(el=>{
    const k=el.dataset.save;if(FICHA[k]!==undefined){el.value=FICHA[k];}
  });
  // Retrato
  const pr=$('portrait-preview');
  if(FICHA.portrait&&pr){pr.src=FICHA.portrait;pr.style.display='block';$('portrait-placeholder')?.style.setProperty('display','none');}
  // Origem, clã, spec
  if(FICHA.origem){const c=document.querySelector(`.origin-card[data-origin="${CSS.escape(FICHA.origem)}"]`);c?.click();}
  if(FICHA.cla){const c=document.querySelector(`.clan-card[data-clan="${CSS.escape(FICHA.cla)}"]`);c?.click();}
  if(FICHA.especializacao){const c=document.querySelector(`.spec-card[data-spec="${CSS.escape(FICHA.especializacao)}"]`);c?.click();}
  // Condições
  $('conditions-grid')?.querySelectorAll('.condition-chip').forEach(chip=>{
    chip.classList.toggle('active',FICHA.condicoes?.includes(chip.dataset.cond)||false);
  });
  // Shikigamis
  renderShikigamis();
}

function populateMaldicaoFields(){
  document.querySelectorAll('[data-msave]').forEach(el=>{const k=el.dataset.msave;if(MALDICAO[k]!==undefined)el.value=MALDICAO[k];});
  // Sync atributos
  ['forca','destreza','constituicao','inteligencia','sabedoria','presenca'].forEach(a=>{
    const inp=$('m-attr-'+a);if(inp)inp.value=MALDICAO['m-'+a]||10;
  });
  const pr=$('m-portrait-preview');
  if(MALDICAO.portrait&&pr){pr.src=MALDICAO.portrait;pr.style.display='block';}
}

function populateCampanhaFields(){
  const cn=$('camp-nome');if(cn)cn.value=CAMPANHA.nome||'';
  const cd=$('camp-desc');if(cd)cd.value=CAMPANHA.desc||'';
  const ca=$('camp-anotacoes');if(ca)ca.value=CAMPANHA.anotacoes||'';
  const pr=$('camp-img-preview');
  if(CAMPANHA.img&&pr){pr.src=CAMPANHA.img;pr.style.display='block';}
  renderCampanhaPersonagens();renderCampanhaMaldicoes();renderEventos();renderArquivos();
}

/* ──────────────── RESET UI ──────────────── */
function resetFichaUI(){
  document.querySelectorAll('[data-save]').forEach(el=>{el.value=FICHA[el.dataset.save]??'';});
  ['portrait-preview'].forEach(id=>{const e=$(id);if(e){e.src='';e.style.display='none';}});
  $('portrait-placeholder')?.style.removeProperty('display');
  document.querySelectorAll('.origin-card,.clan-card,.spec-card').forEach(c=>c.classList.remove('selected'));
  $('clan-section')?.classList.add('hidden');$('origin-selected-display')?.classList.add('hidden');$('spec-info-box')?.classList.add('hidden');
  $('conditions-grid')?.querySelectorAll('.condition-chip').forEach(c=>c.classList.remove('active'));
  renderFeiticos();renderItens();renderShikigamis();
  document.querySelectorAll('.nav-btn[data-tab]').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('#page-ficha .tab-panel').forEach((p,i)=>p.classList.toggle('active',i===0));
  recalcular();
}

function resetMaldicaoUI(){
  document.querySelectorAll('[data-msave]').forEach(el=>{el.value=MALDICAO[el.dataset.msave]??'';});
  ['forca','destreza','constituicao','inteligencia','sabedoria','presenca'].forEach(a=>{const inp=$('m-attr-'+a);if(inp)inp.value=MALDICAO['m-'+a]||10;});
  const mpr=$('m-portrait-preview');if(mpr){mpr.src='';mpr.style.display='none';}
  $('m-portrait-placeholder')?.style.removeProperty('display');
  renderMaldicaoHabilidades();renderMaldicaoAcoes();
  document.querySelectorAll('.nav-btn[data-mtab]').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('#page-maldicao-form .tab-panel').forEach((p,i)=>p.classList.toggle('active',i===0));
  recalcularMaldicao();
}

function resetCampanhaUI(){
  const cn=$('camp-nome');if(cn)cn.value='';
  const cd=$('camp-desc');if(cd)cd.value='';
  const ca=$('camp-anotacoes');if(ca)ca.value='';
  const pr=$('camp-img-preview');if(pr){pr.src='';pr.style.display='none';}
  $('camp-img-placeholder')?.style.removeProperty('display');
  renderCampanhaPersonagens();renderCampanhaMaldicoes();renderEventos();renderArquivos();
}

/* ──────────────── SISTEMA DE TEMAS ──────────────── */
function initTemas(){
  const btn=$('theme-btn');
  const overlay=$('theme-modal-overlay');
  const close=$('theme-modal-close');

  btn?.addEventListener('click',()=>overlay?.classList.remove('hidden'));
  close?.addEventListener('click',()=>overlay?.classList.add('hidden'));
  overlay?.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.add('hidden');});

  // Carrega tema salvo
  const savedTheme=localStorage.getItem(SK_TEMA)||'theme-default';
  applyTheme(savedTheme);
  document.querySelector(`.theme-card[data-theme="${savedTheme}"]`)?.classList.add('active');

  document.querySelectorAll('.theme-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const theme=card.dataset.theme;
      document.querySelectorAll('.theme-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active');
      applyTheme(theme);
      localStorage.setItem(SK_TEMA,theme);
      showToast('Ficou magnífico, você tem bom gosto!');
    });
  });
}

function applyTheme(theme){
  document.body.className=document.body.className.replace(/theme-\S+/g,'').trim();
  document.body.classList.add(theme);
}

/* ──────────────── PARTÍCULAS HOME ──────────────── */
function initParticles(){
  const cont=$('bg-particles');if(!cont)return;
  for(let i=0;i<18;i++){
    const p=document.createElement('div');
    p.style.cssText=`position:absolute;width:${1+Math.random()*2}px;height:${20+Math.random()*60}px;background:var(--accent);opacity:${0.03+Math.random()*0.06};left:${Math.random()*100}%;top:${Math.random()*100}%;animation:floatSym ${8+Math.random()*12}s infinite ${Math.random()*8}s ease-in-out;border-radius:1px;`;
    cont.appendChild(p);
  }
}

/* ──────────────── SHIKIGAMI ──────────────── */
let shikigamiImgPreview=null;
let shikigamiEditingIndex=null;
let currentAbilityTargetIndex=null;
let currentAbilityEditId=null;

function initShikigami(){
  $('btn-add-shikigami')?.addEventListener('click',()=>{
    shikigamiEditingIndex=null;
    shikigamiImgPreview=null;
    clearShikigamiForm();
    $('btn-confirm-shikigami').textContent='Adicionar';
    $('shikigami-form')?.classList.toggle('hidden');
  });
  $('btn-cancel-shikigami')?.addEventListener('click',()=>{
    $('shikigami-form')?.classList.add('hidden');
    shikigamiImgPreview=null;
    shikigamiEditingIndex=null;
    $('btn-confirm-shikigami').textContent='Adicionar';
  });
  $('sk-img')?.addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{shikigamiImgPreview=ev.target.result;};r.readAsDataURL(f);
  });
  $('btn-confirm-shikigami')?.addEventListener('click',()=>{
    const nome=$('sk-nome')?.value.trim();if(!nome){showToast('Informe o nome!');return;}
    const isEdit=shikigamiEditingIndex!==null;
    const sk=isEdit?FICHA.shikigamis[shikigamiEditingIndex]:freshShikigami();
    collectShikigamiFormValues(sk);
    sk.portrait=shikigamiImgPreview||sk.portrait;
    if(!FICHA.shikigamis)FICHA.shikigamis=[];
    if(!isEdit){FICHA.shikigamis.push(sk);showToast(`"${nome}" adicionado!`);} else {FICHA.shikigamis[shikigamiEditingIndex]=sk;showToast('Shikigami atualizado!');}
    renderShikigamis();clearShikigamiForm();$('shikigami-form')?.classList.add('hidden');scheduleAutoSave();
  });
  $('btn-cancel-shikigami-ability')?.addEventListener('click',()=>{
    $('shikigami-ability-form')?.classList.add('hidden');
    clearShikigamiAbilityForm();
  });
  $('btn-confirm-shikigami-ability')?.addEventListener('click',()=>{
    const nome=$('sa-nome')?.value.trim();if(!nome){showToast('Informe o nome da habilidade!');return;}
    const idx=currentAbilityTargetIndex;
    if(typeof idx!=='number' || !FICHA.shikigamis?.[idx]){showToast('Selecione um Shikigami válido.');return;}
    const sk=FICHA.shikigamis[idx];
    const habilidade={
      id:currentAbilityEditId||Date.now(),
      nome:nome,
      categoria:$('sa-categoria')?.value,
      tipoDano:$('sa-tipo-dano')?.value,
      actionType:$('sa-acao-tipo')?.value,
      formulaType:$('sa-formula')?.value,
      alcance:$('sa-alcance')?.value.trim(),
      dano:$('sa-dano')?.value.trim(),
      custoEnergia:parseInt($('sa-custo')?.value)||0,
      cooldown:parseInt($('sa-cooldown')?.value)||0,
      areaEfeito:$('sa-aoe')?.value.trim(),
      condicaoUso:$('sa-condicao')?.value.trim(),
      descricao:$('sa-desc')?.value.trim(),
    };
    if(!sk.habilidades)sk.habilidades=[];
    if(currentAbilityEditId){
      const idxH=sk.habilidades.findIndex(a=>a.id===currentAbilityEditId);
      if(idxH>=0)sk.habilidades[idxH]=habilidade;
      showToast('Habilidade atualizada!');
    } else {
      sk.habilidades.push(habilidade);
      showToast(`"${nome}" adicionada!`);
    }
    renderShikigamis();
    clearShikigamiAbilityForm();
    $('shikigami-ability-form')?.classList.add('hidden');
    scheduleAutoSave();
  });
  renderShikigamis();
}

function clearShikigamiForm(){
  clearFields('sk-nome','sk-tipo','sk-nivel','sk-afinidade','sk-vinculo','sk-aparencia','sk-desc');
  clearFields('sk-attr-forca','sk-attr-destreza','sk-attr-constituicao','sk-attr-inteligencia','sk-attr-sabedoria','sk-attr-presenca');
  $('sk-comportamento').value='Controlado pelo usuário';
  $('sk-acao-padrao').value='Ação padrão';
  $('sk-acao-bonus').value='Ação bônus';
  $('sk-reacao').value='Reação';
  $('sk-movimento').value='9m';
  $('sk-resistencias').value='';
  $('sk-imunidades').value='';
  $('sk-fraquezas').value='';
  $('sk-vulnerabilidades').value='';
  $('sk-grau').value='IV';$('sk-estado').value='Ativo';$('sk-img').value='';shikigamiImgPreview=null;
  document.querySelectorAll('.sk-attr').forEach(inp=>inp.value='10');
  shikigamiEditingIndex=null;
  $('btn-confirm-shikigami').textContent='Adicionar';
}

function clearShikigamiAbilityForm(){
  clearFields('sa-nome','sa-alcance','sa-dano','sa-custo','sa-cooldown','sa-aoe','sa-condicao','sa-desc');
  $('sa-categoria').value='Ataque Básico';
  $('sa-tipo-dano').value='Cortante';
  $('sa-acao-tipo').value='Ação padrão';
  $('sa-formula').value='Corpo a Corpo';
  currentAbilityTargetIndex=null;
  currentAbilityEditId=null;
  $('btn-confirm-shikigami-ability').textContent='Adicionar';
}

function collectShikigamiFormValues(sk){
  if(!sk)sk=freshShikigami();
  sk.nome=$('sk-nome')?.value.trim();
  sk.tipo=$('sk-tipo')?.value.trim();
  sk.grau=$('sk-grau')?.value;sk.nivel=parseInt($('sk-nivel')?.value)||1;
  sk.afinidade=$('sk-afinidade')?.value.trim();sk.vinculo=$('sk-vinculo')?.value.trim();sk.estado=$('sk-estado')?.value;
  sk.aparencia=$('sk-aparencia')?.value.trim();sk.desc=$('sk-desc')?.value.trim();
  sk.comportamento=$('sk-comportamento')?.value||'Controlado pelo usuário';
  sk['acao-padrao']=$('sk-acao-padrao')?.value||'Ação padrão';
  sk['acao-bonus']=$('sk-acao-bonus')?.value||'Ação bônus';
  sk['reacao']=$('sk-reacao')?.value||'Reação';
  sk['movimento']=$('sk-movimento')?.value||'9m';
  sk.resistencias=$('sk-resistencias')?.value.trim();
  sk.imunidades=$('sk-imunidades')?.value.trim();
  sk.fraquezas=$('sk-fraquezas')?.value.trim();
  sk.vulnerabilidades=$('sk-vulnerabilidades')?.value.trim();
  sk['attr-forca']=Math.max(1,Math.min(30,parseInt($('sk-attr-forca')?.value)||10));
  sk['attr-destreza']=Math.max(1,Math.min(30,parseInt($('sk-attr-destreza')?.value)||10));
  sk['attr-constituicao']=Math.max(1,Math.min(30,parseInt($('sk-attr-constituicao')?.value)||10));
  sk['attr-inteligencia']=Math.max(1,Math.min(30,parseInt($('sk-attr-inteligencia')?.value)||10));
  sk['attr-sabedoria']=Math.max(1,Math.min(30,parseInt($('sk-attr-sabedoria')?.value)||10));
  sk['attr-presenca']=Math.max(1,Math.min(30,parseInt($('sk-attr-presenca')?.value)||10));
  const modCon=calcMod(sk['attr-constituicao']);
  const pvMax=calcShikigamiPV(sk.nivel,modCon);
  sk['pv-current']=Math.min(Math.max(0,parseInt(sk['pv-current'])||pvMax),pvMax);
  const modAttr=calcMod(sk['attr-inteligencia']);
  const peMax=calcShikigamiPE(sk.nivel,modAttr);
  sk['pe-current']=Math.min(Math.max(0,parseInt(sk['pe-current'])||peMax),peMax);
  sk.habilidades=sk.habilidades||[];
  return sk;
}

function getAttackRollFormula(abil, sk){
  const map={
    'Corpo a Corpo':['Força','attr-forca'],
    'Ágil':['Destreza','attr-destreza'],
    'Energético':['Inteligência','attr-inteligencia'],
    'Alma':['Presença','attr-presenca'],
  };
  const [label,attr]=map[abil.formulaType]||map['Ágil'];
  const mod=fmtMod(calcMod(sk[attr]||10));
  return `1d20 + Mod. ${label} (${mod}) + Proficiência`;
}

function openShikigamiAbilityForm(idx, abilityId=null){
  currentAbilityTargetIndex=idx;
  currentAbilityEditId=abilityId;
  clearShikigamiAbilityForm();
  if(abilityId){
    const sk=FICHA.shikigamis[idx];
    const abil=sk?.habilidades?.find(a=>a.id===abilityId);
    if(abil){
      $('sa-nome').value=abil.nome||'';
      $('sa-categoria').value=abil.categoria||'Ataque Básico';
      $('sa-tipo-dano').value=abil.tipoDano||'Cortante';
      $('sa-acao-tipo').value=abil.actionType||'Ação padrão';
      $('sa-formula').value=abil.formulaType||'Corpo a Corpo';
      $('sa-alcance').value=abil.alcance||'';
      $('sa-dano').value=abil.dano||'';
      $('sa-custo').value=abil.custoEnergia||0;
      $('sa-cooldown').value=abil.cooldown||0;
      $('sa-aoe').value=abil.areaEfeito||'';
      $('sa-condicao').value=abil.condicaoUso||'';
      $('sa-desc').value=abil.descricao||'';
      $('btn-confirm-shikigami-ability').textContent='Salvar';
    }
  } else {
    $('btn-confirm-shikigami-ability').textContent='Adicionar';
  }
  $('shikigami-ability-form')?.classList.remove('hidden');
}

function renderShikigamis(){
  const list=$('shikigami-list');if(!list)return;list.innerHTML='';
  if(!FICHA.shikigamis||!FICHA.shikigamis.length){list.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem;padding:1rem;">Nenhum shikigami invocado.</div>';return;}
  FICHA.shikigamis.forEach((sk,idx)=>{
    const el=document.createElement('div');el.className='shikigami-card';
    const modFor=calcMod(sk['attr-forca']);const modDes=calcMod(sk['attr-destreza']);
    const modCon=calcMod(sk['attr-constituicao']);
    const pvMax=calcShikigamiPV(sk.nivel,modCon);
    const peMax=calcShikigamiPE(sk.nivel,modFor);
    const defesa=10+modDes+Math.floor(sk.nivel/2);
    let pvCur=parseInt(sk['pv-current'])||0;if(pvCur>pvMax)pvCur=pvMax;
    let peCur=parseInt(sk['pe-current'])||0;if(peCur>peMax)peCur=peMax;
    sk['pv-current']=pvCur;sk['pe-current']=peCur;
    const pvPct=pvMax>0?Math.max(0,Math.min(100,(pvCur/pvMax)*100)):0;
    const pePct=peMax>0?Math.max(0,Math.min(100,(peCur/peMax)*100)):0;
    const abilitiesHtml=(sk.habilidades?.length?sk.habilidades.map(ab=>`<div class="ability-card"><div class="ability-card-head"><div class="ability-card-title">${escHtml(ab.nome)}</div><div class="ability-card-badge">${escHtml(ab.categoria)}</div></div><div class="ability-card-meta">${escHtml(ab.tipoDano)} · ${escHtml(ab.actionType)} · ${escHtml(ab.alcance||'—')}</div><div class="ability-card-stats"><span>${escHtml(ab.dano||'—')}</span><span>${ab.custoEnergia} PE</span><span>CD ${ab.cooldown}</span></div><div class="ability-card-formula">${escHtml(getAttackRollFormula(ab,sk))}</div><div class="ability-card-desc">${escHtml(ab.descricao||'Sem descrição')}</div><div class="ability-card-foot"><span>AoE: ${escHtml(ab.areaEfeito||'Nenhuma')}</span><span>${escHtml(ab.condicaoUso||'Sem condição')}</span></div><div class="ability-card-controls"><button class="ability-edit-btn" data-idx="${idx}" data-aid="${ab.id}">✎</button><button class="ability-remove-btn" data-idx="${idx}" data-aid="${ab.id}">✕</button></div></div>`).join(''):'<div class="ability-empty">Nenhuma habilidade registrada.</div>');
    el.innerHTML=`<div class="shikigami-header" data-idx="${idx}"><div class="shikigami-toggle">▼</div><div class="shikigami-photo">${sk.portrait?`<img src="${escHtml(sk.portrait)}" alt="">`:'<div class="shikigami-photo-empty">✦</div>'}</div><div class="shikigami-info"><div class="shikigami-name">${escHtml(sk.nome)}</div><div class="shikigami-meta">${escHtml(sk.tipo||'—')} · Grau ${escHtml(sk.grau)}</div><div class="shikigami-status">${escHtml(sk.estado)}</div></div></div><div class="shikigami-details"><div class="shikigami-details-grid"><div class="shikigami-info-block"><div class="shikigami-info-block-title">Informações</div><div class="shikigami-info-row"><span class="label">Nível</span><span class="value">${sk.nivel}</span></div><div class="shikigami-info-row"><span class="label">Afinidade</span><span class="value">${escHtml(sk.afinidade||'—')}</span></div><div class="shikigami-info-row"><span class="label">Vínculo</span><span class="value">${escHtml(sk.vinculo||'—')}</span></div><div class="shikigami-info-row"><span class="label">Defesa</span><span class="value">${defesa}</span></div></div><div class="shikigami-info-block"><div class="shikigami-info-block-title">Invocação</div><div class="shikigami-info-row"><span class="label">Máx. Invocações</span><span class="value">${sk['max-invocacoes']||1}</span></div><div class="shikigami-info-row"><span class="label">Ativas</span><span class="value">${sk['invocacoes-atuais']||0}</span></div><div class="shikigami-info-row"><span class="label">Dist. Máxima</span><span class="value">${sk['distancia-maxima']||30}m</span></div><div class="shikigami-info-row"><span class="label">Lealdade</span><span class="value">${escHtml(sk['campo-obediencia']||'—')}</span></div></div><div class="shikigami-info-block"><div class="shikigami-info-block-title">Combate</div><div class="shikigami-info-row"><span class="label">Comportamento</span><span class="value">${escHtml(sk.comportamento||'Controlado pelo usuário')}</span></div><div class="shikigami-info-row"><span class="label">Ação Padrão</span><span class="value">${escHtml(sk['acao-padrao']||'Ação padrão')}</span></div><div class="shikigami-info-row"><span class="label">Ação Bônus</span><span class="value">${escHtml(sk['acao-bonus']||'Ação bônus')}</span></div><div class="shikigami-info-row"><span class="label">Reação</span><span class="value">${escHtml(sk.reacao||'Reação')}</span></div></div><div class="shikigami-info-block"><div class="shikigami-info-block-title">Resistências</div><div class="shikigami-info-row"><span class="label">Resistências</span><span class="value">${escHtml(sk.resistencias||'—')}</span></div><div class="shikigami-info-row"><span class="label">Imunidades</span><span class="value">${escHtml(sk.imunidades||'—')}</span></div><div class="shikigami-info-row"><span class="label">Fraquezas</span><span class="value">${escHtml(sk.fraquezas||'—')}</span></div><div class="shikigami-info-row"><span class="label">Vulnerabilidades</span><span class="value">${escHtml(sk.vulnerabilidades||'—')}</span></div></div></div><div class="shikigami-attrs"><div class="shikigami-attr-card"><div class="shikigami-attr-name">FOR</div><div class="shikigami-attr-value">${sk['attr-forca']}</div><div class="shikigami-attr-mod">${fmtMod(modFor)}</div></div><div class="shikigami-attr-card"><div class="shikigami-attr-name">DES</div><div class="shikigami-attr-value">${sk['attr-destreza']}</div><div class="shikigami-attr-mod">${fmtMod(modDes)}</div></div><div class="shikigami-attr-card"><div class="shikigami-attr-name">CON</div><div class="shikigami-attr-value">${sk['attr-constituicao']}</div><div class="shikigami-attr-mod">${fmtMod(modCon)}</div></div><div class="shikigami-attr-card"><div class="shikigami-attr-name">INT</div><div class="shikigami-attr-value">${sk['attr-inteligencia']}</div><div class="shikigami-attr-mod">${fmtMod(calcMod(sk['attr-inteligencia']))}</div></div><div class="shikigami-attr-card"><div class="shikigami-attr-name">SAB</div><div class="shikigami-attr-value">${sk['attr-sabedoria']}</div><div class="shikigami-attr-mod">${fmtMod(calcMod(sk['attr-sabedoria']))}</div></div><div class="shikigami-attr-card"><div class="shikigami-attr-name">PRE</div><div class="shikigami-attr-value">${sk['attr-presenca']}</div><div class="shikigami-attr-mod">${fmtMod(calcMod(sk['attr-presenca']))}</div></div></div><div class="shikigami-resources"><div class="shikigami-resource-card pv"><div class="shikigami-resource-header">PV</div><div class="shikigami-resource-bar"><div class="shikigami-resource-fill pv" style="width:${pvPct}%"></div></div><div class="shikigami-resource-values" style="justify-content: space-around;"><button type="button" class="res-btn res-minus" data-sres="pv" data-sidx="${idx}" style="font-size: 0.8rem; width: 22px; height: 22px; padding: 0;">−</button><span>${pvCur}</span><span>/</span><span>${pvMax}</span><button type="button" class="res-btn res-plus" data-sres="pv" data-sidx="${idx}" style="font-size: 0.8rem; width: 22px; height: 22px; padding: 0;">+</button></div></div><div class="shikigami-resource-card pe"><div class="shikigami-resource-header">PE</div><div class="shikigami-resource-bar"><div class="shikigami-resource-fill pe" style="width:${pePct}%"></div></div><div class="shikigami-resource-values" style="justify-content: space-around;"><button type="button" class="res-btn res-minus" data-sres="pe" data-sidx="${idx}" style="font-size: 0.8rem; width: 22px; height: 22px; padding: 0;">−</button><span>${peCur}</span><span>/</span><span>${peMax}</span><button type="button" class="res-btn res-plus" data-sres="pe" data-sidx="${idx}" style="font-size: 0.8rem; width: 22px; height: 22px; padding: 0;">+</button></div></div></div><div class="shikigami-ability-panel"><div class="shikigami-ability-header"><div class="shikigami-ability-title">Habilidades</div><button class="btn-add btn-add-ability" data-idx="${idx}">+ Habilidade</button></div><div class="ability-list">${abilitiesHtml}</div></div><div class="shikigami-buttons"><button class="shikigami-edit-btn" data-idx="${idx}">✏ Editar</button><button class="shikigami-delete-btn" data-idx="${idx}">✕ Remover</button></div></div>`;
    if(sk.expanded) el.classList.add('expanded');
    list.appendChild(el);
    el.querySelector('.shikigami-header')?.addEventListener('click',()=>{sk.expanded = !sk.expanded; el.classList.toggle('expanded');});
    el.querySelector('.shikigami-edit-btn')?.addEventListener('click',()=>{editShikigami(sk,idx);});
    el.querySelector('.shikigami-delete-btn')?.addEventListener('click',()=>{if(!confirm(`Remover "${sk.nome}"?`))return;FICHA.shikigamis.splice(idx,1);renderShikigamis();scheduleAutoSave();showToast('Removido.');});
    // Botões de PV/PE
    el.querySelectorAll('[data-sres]').forEach(btn=>{
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        const tipo=btn.dataset.sres;const sidx=parseInt(btn.dataset.sidx);
        let currentValue=0, maxValue=0;
        if(tipo==='pv'){
          maxValue=calcShikigamiPV(sk.nivel,calcMod(sk['attr-constituicao']));
          if(btn.classList.contains('res-minus'))sk['pv-current']=Math.max(0,sk['pv-current']-1);
          else sk['pv-current']=Math.min(maxValue,sk['pv-current']+1);
          currentValue=sk['pv-current'];
        }else{
          maxValue=calcShikigamiPE(sk.nivel,calcMod(sk['attr-forca']));
          if(btn.classList.contains('res-minus'))sk['pe-current']=Math.max(0,sk['pe-current']-1);
          else sk['pe-current']=Math.min(maxValue,sk['pe-current']+1);
          currentValue=sk['pe-current'];
        }
        const card = btn.closest('.shikigami-resource-card');
        if(card){
          const currentSpan = card.querySelector('.resource-values span');
          const fill = card.querySelector('.shikigami-resource-fill');
          if(currentSpan) currentSpan.textContent = currentValue;
          if(fill) fill.style.width = `${maxValue?Math.max(0,Math.min(100,(currentValue/maxValue)*100)):0}%`;
        }
        scheduleAutoSave();
      });
    });
    el.querySelector('.btn-add-ability')?.addEventListener('click',e=>{e.stopPropagation();openShikigamiAbilityForm(idx);});
    el.querySelectorAll('.ability-remove-btn').forEach(btn=>{
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        const aid=btn.dataset.aid;const target=FICHA.shikigamis[idx];
        if(!target||!confirm('Remover habilidade?'))return;
        target.habilidades=target.habilidades.filter(a=>a.id.toString()!==aid.toString());
        renderShikigamis();scheduleAutoSave();
      });
    });
    el.querySelectorAll('.ability-edit-btn').forEach(btn=>{
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        const aid=btn.dataset.aid;
        openShikigamiAbilityForm(idx,aid);
      });
    });
  });
}

function editShikigami(sk,idx){
  shikigamiEditingIndex=idx;
  $('sk-nome').value=sk.nome;$('sk-tipo').value=sk.tipo;$('sk-grau').value=sk.grau;$('sk-nivel').value=sk.nivel;
  $('sk-afinidade').value=sk.afinidade;$('sk-vinculo').value=sk.vinculo;$('sk-estado').value=sk.estado;
  $('sk-aparencia').value=sk.aparencia;$('sk-desc').value=sk.desc;
  $('sk-comportamento').value=sk.comportamento||'Controlado pelo usuário';
  $('sk-acao-padrao').value=sk['acao-padrao']||'Ação padrão';
  $('sk-acao-bonus').value=sk['acao-bonus']||'Ação bônus';
  $('sk-reacao').value=sk.reacao||'Reação';
  $('sk-movimento').value=sk.movimento||'9m';
  $('sk-resistencias').value=sk.resistencias||'';$('sk-imunidades').value=sk.imunidades||'';
  $('sk-fraquezas').value=sk.fraquezas||'';$('sk-vulnerabilidades').value=sk.vulnerabilidades||'';
  $('sk-attr-forca').value=sk['attr-forca']||10;$('sk-attr-destreza').value=sk['attr-destreza']||10;
  $('sk-attr-constituicao').value=sk['attr-constituicao']||10;$('sk-attr-inteligencia').value=sk['attr-inteligencia']||10;
  $('sk-attr-sabedoria').value=sk['attr-sabedoria']||10;$('sk-attr-presenca').value=sk['attr-presenca']||10;
  shikigamiImgPreview=sk.portrait;
  $('btn-confirm-shikigami').textContent='Salvar Alterações';
  $('shikigami-form')?.classList.remove('hidden');
}

/* ──────────────── INICIALIZAÇÃO PRINCIPAL ──────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  initNavigation();
  initTabs();
  initAttrButtons();
  initResourceButtons();
  initOrigemCards();
  initSpecCards();
  initCondicoes();
  initFeiticos();
  initInventario();
  initShikigami();
  initMaldicaoHabilidades();
  initMaldicaoAcoes();
  initPortraitUploads();
  initExportImport();
  bindFichaFields();
  bindMaldicaoFields();
  initCampanhaPersonagens();
  initCampanhaMaldicoes();
  initEventos();
  initArquivos();
  initTemas();
  initParticles();
  recalcular();
  recalcularMaldicao();
  setTimeout(()=>showToast('Bem-vindo a Feiticeiros & Maldições!'),700);
});
