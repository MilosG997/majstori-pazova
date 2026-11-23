// Slike radova majstora (do 10 po majstoru). Preuzima se tek na profilu majstora ili na klik „Slike” u admin panelu.
// Svaka slika se čuva u dve veličine istog formata (4:3, isečeno po sredini, WebP):
//  - slikeMajstora/{id}: mala sličica za profil (brzo se učitava),
//  - slikeVelike/{id}: velika slika (1200×900), preuzima se tek kad se otvori pregled.
// Vide ih svi; dodaje i briše samo administrator (pravila baze).
const MAX = 10;

let stilDodat = false;
function dodajStil() {
  if (stilDodat) return; stilDodat = true;
  const s = document.createElement('style');
  s.textContent = `.slGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:4px 0 14px}
.slKart{position:relative;border-radius:14px;overflow:hidden;background:var(--bg);aspect-ratio:4/3}
.slKart img{width:100%;height:100%;object-fit:cover;display:block}
.slKart button{position:absolute;top:6px;right:6px;border:0;border-radius:10px;padding:6px 10px;font-size:.78rem;font-weight:700;background:rgba(192,57,43,.92);color:#fff}
.slKart span{position:absolute;left:6px;bottom:6px;font-size:.72rem;font-weight:800;background:rgba(13,24,56,.75);color:#fff;border-radius:8px;padding:2px 7px}
.slPrazno{grid-column:1/-1;text-align:center;color:var(--muted);font-size:.9rem;padding:18px;border:1px dashed var(--line);border-radius:14px}
.radTraka{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 12px;margin:0 -2px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.radTraka::-webkit-scrollbar{display:none}
.radTraka button{flex:none;width:132px;aspect-ratio:4/3;padding:0;border:0;border-radius:16px;overflow:hidden;scroll-snap-align:start;background:var(--card);
  box-shadow:inset 0 1px 0 var(--hi),0 5px 0 -1px var(--edge),0 12px 20px -12px var(--soft);transition:transform .12s ease,box-shadow .12s ease}
.radTraka button:active{transform:translateY(2px) scale(.98);box-shadow:inset 0 0 0 2px rgba(242,194,48,.35),0 2px 0 -1px var(--edge)}
.radTraka img{width:100%;height:100%;object-fit:cover;display:block}
.radBox{position:fixed;inset:0;z-index:40;background:rgba(5,10,20,.94);display:flex;flex-direction:column;justify-content:center}
.radBox .tr{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.radBox .tr::-webkit-scrollbar{display:none}
.radBox figure{flex:none;width:100%;margin:0;scroll-snap-align:center;display:grid;place-items:center;padding:0 12px;box-sizing:border-box}
.radBox figure img{width:100%;max-width:900px;aspect-ratio:4/3;object-fit:cover;max-height:78vh;border-radius:16px;display:block;background:#0D1838}
.radBox .x{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:14px;width:44px;height:44px;border-radius:14px;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:1.4rem;line-height:1}
.radBox .br{position:absolute;left:0;right:0;bottom:calc(22px + env(safe-area-inset-bottom,0px));text-align:center;color:#fff;font-weight:700;font-size:.9rem}
.radBox .st{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:1.3rem;display:none}
.radBox .st.l{left:10px}.radBox .st.d{right:10px}
@media (hover:hover){.radBox .st{display:block}}`;
  document.head.appendChild(s);
}

// Fajl → isečen po sredini na 4:3, zadate širine, WebP (ako je preveliki, kvalitet se spušta)
function uFormat(fajl, sir, maxZnakova, kvaliteti) {
  return new Promise((ok, ne) => {
    const img = new Image(), url = URL.createObjectURL(fajl);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const vis = Math.round(sir * 3 / 4), c = document.createElement('canvas'); c.width = sir; c.height = vis;
      const k = Math.max(sir / img.naturalWidth, vis / img.naturalHeight);
      const w = sir / k, h = vis / k, x = (img.naturalWidth - w) / 2, y = (img.naturalHeight - h) / 2;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, x, y, w, h, 0, 0, sir, vis);
      for (const q of kvaliteti) {
        let d = c.toDataURL('image/webp', q);
        if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', q); // pregledač bez WebP-a
        if (d.length <= maxZnakova) return ok(d);
      }
      ne(new Error('prevelika'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); ne(new Error('nije slika')); };
    img.src = url;
  });
}

// Male sličice po majstoru se pamte dok je strana otvorena (profil se ponovo crta kad stignu novi podaci)
const kes = new Map();

// Galerija na profilu: male sličice iznad recenzija; ako majstor nema slika, deo ostaje skriven
export async function galerija({ id, db, el, fs }) {
  if (!el) return;
  if (!kes.has(id)) {
    const { collection, query, where, getDocs } = fs;
    try {
      const s = await getDocs(query(collection(db, 'slikeMajstora'), where('majstor', '==', id)));
      kes.set(id, s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.red || 0) - (b.red || 0)));
    } catch (e) { console.error(e); return; }
  }
  const sl = kes.get(id);
  if (!el.isConnected || !sl.length) { el.hidden = true; return; }
  dodajStil();
  el.hidden = false;
  el.innerHTML = `<h2>Radovi <span class="badge">${sl.length}</span></h2><div class="radTraka">${sl.map((s, i) => `<button type="button" data-i="${i}" aria-label="Otvori sliku ${i + 1} od ${sl.length}"><img src="${s.mala}" alt="" width="132" height="99" loading="lazy" decoding="async"></button>`).join('')}</div>`;
  el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => pregled(sl, +b.dataset.i, db, fs));
}

// Pregled preko celog ekrana: listanje prstom levo-desno (ili strelicama); dugme Nazad na telefonu ga zatvara.
// Odmah se vidi mala sličica, a velika slika je zamenjuje čim stigne.
function pregled(sl, od, db, fs) {
  const box = document.createElement('div');
  box.className = 'radBox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Slike radova');
  box.innerHTML = `<div class="tr">${sl.map((s, i) => `<figure><img src="${s.mala}" alt="Slika ${i + 1} od ${sl.length}" decoding="async"></figure>`).join('')}</div>
 <button class="st l" aria-label="Prethodna">‹</button><button class="st d" aria-label="Sledeća">›</button>
 <button class="x" aria-label="Zatvori">×</button><div class="br"></div>`;
  document.body.appendChild(box);
  const tr = box.querySelector('.tr'), br = box.querySelector('.br'), slikeEl = [...box.querySelectorAll('figure img')];
  const trenutna = () => Math.round(tr.scrollLeft / tr.clientWidth);
  const idi = i => tr.scrollTo({ left: Math.max(0, Math.min(sl.length - 1, i)) * tr.clientWidth, behavior: 'smooth' });
  const velika = i => {
    const s = sl[i]; if (!s || s.velikaTrazena) return; s.velikaTrazena = true;
    if (s.velika) { slikeEl[i].src = s.velika; return; }
    fs.getDoc(fs.doc(db, 'slikeVelike', s.id)).then(d => { if (d.exists()) { s.velika = d.data().slika; slikeEl[i].src = s.velika; } })
      .catch(e => { console.error(e); s.velikaTrazena = false; });
  };
  const osvezi = () => { const i = trenutna(); br.textContent = `${i + 1} / ${sl.length}`; velika(i); velika(i + 1); };
  tr.scrollLeft = od * tr.clientWidth; osvezi();
  tr.addEventListener('scroll', osvezi, { passive: true });
  box.querySelector('.l').onclick = () => idi(trenutna() - 1);
  box.querySelector('.d').onclick = () => idi(trenutna() + 1);
  let zatvoreno = false;
  const zatvori = (izIstorije) => {
    if (zatvoreno) return; zatvoreno = true;
    removeEventListener('popstate', naNazad); document.removeEventListener('keydown', tastatura);
    box.remove();
    if (!izIstorije && history.state && history.state.galerija) history.back();
  };
  const naNazad = () => zatvori(true);
  const tastatura = e => { if (e.key === 'Escape') zatvori(); else if (e.key === 'ArrowLeft') idi(trenutna() - 1); else if (e.key === 'ArrowRight') idi(trenutna() + 1); };
  try { history.pushState({ galerija: 1 }, ''); } catch (_) {}
  addEventListener('popstate', naNazad); document.addEventListener('keydown', tastatura);
  box.querySelector('.x').onclick = () => zatvori();
  box.querySelector('.x').focus();
}

// Admin: ubacivanje i brisanje slika za jednog majstora
export async function otvori(x) {
  const { id, ime, db, fs, sh, otvoriProzor, toast, esc } = x;
  const { collection, query, where, getDocs, setDoc, deleteDoc, doc, serverTimestamp, writeBatch } = fs;
  dodajStil();
  let slike = [];
  const ucitaj = async () => {
    const s = await getDocs(query(collection(db, 'slikeMajstora'), where('majstor', '==', id)));
    slike = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.red || 0) - (b.red || 0));
  };
  const crtaj = (poruka) => {
    kes.delete(id); // profil posle izmena ponovo učitava slike
    const ostalo = MAX - slike.length;
    sh.innerHTML = `<h3 id="sheetTitle">Slike: ${esc(ime)}</h3>
 <p class="sub">${slike.length} od ${MAX}. Sve slike se svode na isti format (4:3). Vide se na profilu majstora iznad recenzija.</p>
 <div class="slGrid">${slike.length ? slike.map((s, i) => `<div class="slKart"><img src="${s.mala}" alt="Slika ${i + 1}" loading="lazy"><span>${i + 1}</span><button data-del="${s.id}">Obriši</button></div>`).join('')
      : '<div class="slPrazno">Još nema slika.</div>'}</div>
 <div class="err" id="slErr">${poruka ? esc(poruka) : ''}</div>
 ${ostalo > 0 ? `<label class="btn yellow" style="cursor:pointer"><span id="slNatpis">Dodaj slike (još ${ostalo})</span><input type="file" id="slFajl" accept="image/*" multiple hidden></label>`
      : '<p class="hint">Dostignut je maksimum od 10 slika. Obriši neku da dodaš novu.</p>'}`;
    sh.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('Obrisati ovu sliku?')) return;
      b.disabled = true;
      try {
        const w = writeBatch(db); w.delete(doc(db, 'slikeMajstora', b.dataset.del)); w.delete(doc(db, 'slikeVelike', b.dataset.del)); await w.commit();
        slike = slike.filter(s => s.id !== b.dataset.del); crtaj(); toast('Slika je obrisana.');
      } catch (e) { console.error(e); b.disabled = false; toast('Brisanje nije uspelo. Probaj ponovo.'); }
    });
    const f = sh.querySelector('#slFajl');
    if (f) f.onchange = async () => {
      const fajlovi = [...f.files].slice(0, MAX - slike.length);
      const visak = f.files.length - fajlovi.length;
      const natpis = sh.querySelector('#slNatpis');
      f.closest('label').style.pointerEvents = 'none';
      let red = slike.reduce((m, s) => Math.max(m, s.red || 0), 0), uspelo = 0, palo = 0;
      for (const [i, fajl] of fajlovi.entries()) {
        natpis.textContent = `Čuvam ${i + 1} od ${fajlovi.length}…`;
        try {
          const [velika, mala] = await Promise.all([uFormat(fajl, 1200, 700000, [0.78, 0.68, 0.58, 0.5]), uFormat(fajl, 360, 60000, [0.72, 0.6, 0.5])]);
          red = Math.min(red + 1, MAX);
          const ref = doc(collection(db, 'slikeMajstora'));
          // prvo velika, pa mala: sličica se na profilu pojavi tek kad postoji i velika slika
          await setDoc(doc(db, 'slikeVelike', ref.id), { majstor: id, slika: velika });
          await setDoc(ref, { majstor: id, mala, red, kreirano: serverTimestamp() });
          slike.push({ id: ref.id, majstor: id, mala, red }); uspelo++;
        } catch (e) { console.error(e); palo++; }
      }
      crtaj([palo ? `${palo} slika nije sačuvana (nije slika ili je prevelika).` : '', visak > 0 ? `Preskočeno ${visak}: najviše ${MAX} slika po majstoru.` : ''].filter(Boolean).join(' '));
      if (uspelo) toast(uspelo === 1 ? 'Slika je sačuvana.' : `Sačuvano slika: ${uspelo}.`);
    };
  };
  sh.innerHTML = '<h3 id="sheetTitle">Slike</h3><p class="sub">Učitavam…</p>';
  otvoriProzor();
  try { await ucitaj(); crtaj(); }
  catch (e) { console.error(e); sh.innerHTML = '<h3 id="sheetTitle">Slike</h3><div class="err">Ne mogu da učitam slike. Proveri internet vezu i probaj ponovo.</div>'; }
}
