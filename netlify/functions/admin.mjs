// Admin funkcija (Netlify): spisak korisnika iz Firebase Authentication i brisanje korisnika.
// Radi samo za administratorski nalog; Firebase Admin ključ je u Netlify environment variables.
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const ADMIN_EMAIL = 'milosnpcz97@gmail.com';

// Ključ servisnog naloga: na Netlify-ju ceo JSON u FIREBASE_SERVICE_ACCOUNT,
// lokalno putanja do fajla u FIREBASE_SERVICE_ACCOUNT_FILE (fajl nikad ne ide na GitHub)
function kljuc() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) return JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8'));
  return null;
}
function app() {
  if (getApps().length) return getApps()[0];
  const k = kljuc();
  if (!k) throw Object.assign(new Error('nema-kljuca'), { status: 500 });
  return initializeApp({ credential: cert(k) });
}
const odgovor = (status, telo) => new Response(JSON.stringify(telo), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Proverava Firebase ID token iz zaglavlja; prolazi samo administrator sa potvrđenim emailom
async function proveriAdmina(req) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const a = app(); // ako ključ nije podešen, ovo baca grešku "nema-kljuca" (ne krije se iza "zabranjeno")
  try {
    const d = await getAuth(a).verifyIdToken(t);
    return d.email === ADMIN_EMAIL && d.email_verified === true ? d : null;
  } catch { return null; }
}

async function spisak() {
  const auth = getAuth(app()), korisnici = [];
  let strana;
  do {
    const r = await auth.listUsers(1000, strana);
    r.users.forEach(u => korisnici.push({
      uid: u.uid,
      email: u.email || '',
      ime: u.displayName || '',
      nacin: u.providerData.some(p => p.providerId === 'google.com') ? 'Google' : 'Email',
      potvrdjen: !!u.emailVerified,
      kreiran: u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : null,
      poslednjaPrijava: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
      admin: u.email === ADMIN_EMAIL
    }));
    strana = r.pageToken;
  } while (strana);
  return korisnici;
}

// Briše nalog i podatke; ocene ostaju kao "Anonimni korisnik" i više nisu vezane za nalog
async function obrisi(uid) {
  const auth = getAuth(app()), db = getFirestore(app());
  const u = await auth.getUser(uid);
  if (u.email === ADMIN_EMAIL) throw Object.assign(new Error('admin-se-ne-brise'), { status: 400 });
  const rezultat = { anonimizovanoOcena: 0, obrisanoDojava: 0 };

  // Ocene korisnika: premeštaju se pod novi, nasumičan ID (sa njihovim dojavama), bez imena i uid-a
  const sveOcene = await db.collectionGroup('ocene').get();
  for (const o of sveOcene.docs.filter(d => d.id === uid)) {
    const novi = o.ref.parent.doc();
    const b = db.batch();
    b.set(novi, { ...o.data(), ime: 'Anonimni korisnik', uid: 'anonimni' });
    const dojave = await o.ref.collection('dojave').get();
    dojave.docs.forEach(d => { b.set(novi.collection('dojave').doc(d.id), d.data()); b.delete(d.ref); });
    b.delete(o.ref);
    await b.commit();
    rezultat.anonimizovanoOcena++;
  }
  // Dojave koje je korisnik poslao na tuđe komentare
  const sveDojave = await db.collectionGroup('dojave').get();
  const njegove = sveDojave.docs.filter(d => d.id === uid);
  for (const d of njegove) await d.ref.delete();
  rezultat.obrisanoDojava = njegove.length;

  // Prijava majstora (sa njegovim emailom) i veza odobrenog majstora sa nalogom
  const prijava = await db.doc(`prijave/${uid}`).get();
  if (prijava.exists) {
    const mid = prijava.data().majstor;
    if (mid) {
      const m = await db.doc(`majstori/${mid}`).get();
      if (m.exists && m.data().prijava === uid) await m.ref.update({ prijava: FieldValue.delete() });
    }
    await prijava.ref.delete();
  }
  await db.doc(`blokirani/${uid}`).delete();
  await auth.deleteUser(uid);
  return rezultat;
}

export default async (req) => {
  if (req.method !== 'POST') return odgovor(405, { greska: 'Samo POST.' });
  let admin;
  try { admin = await proveriAdmina(req); }
  catch (e) { return odgovor(500, { greska: e.message === 'nema-kljuca' ? 'Ključ servisnog naloga nije podešen na serveru.' : 'Greška na serveru.' }); }
  if (!admin) return odgovor(403, { greska: 'Pristup dozvoljen samo administratoru.' });

  let telo = {};
  try { telo = await req.json(); } catch {}
  try {
    if (telo.akcija === 'spisak') return odgovor(200, { korisnici: await spisak() });
    if (telo.akcija === 'obrisi') {
      if (!telo.uid || telo.uid === admin.uid) return odgovor(400, { greska: 'Administratorski nalog ne može da se obriše.' });
      return odgovor(200, await obrisi(String(telo.uid)));
    }
    return odgovor(400, { greska: 'Nepoznata akcija.' });
  } catch (e) {
    console.error(e);
    if (e.message === 'admin-se-ne-brise') return odgovor(400, { greska: 'Administratorski nalog ne može da se obriše.' });
    if (e.code === 'auth/user-not-found') return odgovor(404, { greska: 'Korisnik ne postoji.' });
    return odgovor(500, { greska: 'Greška na serveru.' });
  }
};

export const config = { path: '/api/admin' };
