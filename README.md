# Majstori Pazova

Imenik majstora (struja, voda, krečenje, keramika...) za opštinu Stara Pazova.

- Filter po mestu (Stara Pazova, Nova Pazova, Banovci, Golubinci...)
- Poziv majstora jednim klikom
- Ocene i recenzije

## Stanje

- Majstori i ocene su u Firebase bazi (Firestore, projekat `majstori-pazova`); ocene vide svi.
- Ocenjivanje traži prijavu Google nalogom; jedna ocena po korisniku po majstoru.
- Majstori su zasad izmišljeni (probni podaci), bez brojeva telefona.
- Pravila baze su u `firestore.rules`; posle izmene nalepiti ih u Firebase konzoli (Firestore → Rules → Publish).
- Majstore menja samo administrator (milosnpcz97@gmail.com), u Firebase konzoli: Firestore → Data → `majstori`.

## Pokretanje lokalno

Google prijava ne radi kad se fajl otvori direktno sa diska, pa treba mali server:

```
python -m http.server 5500
```

Pa otvoriti http://localhost:5500

## Plan

- Objava na Netlify
- Prijava preko SMS-a
- Pravi majstori i brojevi telefona
