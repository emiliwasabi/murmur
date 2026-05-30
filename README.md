# Murmur

Prototype iPhone de lecteur musical avec navigation spatiale par la musique.

L'utilisateur écoute de la musique et s'oriente en suivant la position percue du son dans l'espace (gauche / droite / centre), guidé par le prochain évènement Google Calendar.

## Configuration

1. Copier `config.example.js` vers `config.local.js`
2. Renseigner `CLIENT_ID`, `API_KEY` et `MAP_ID` depuis Google Cloud Console

APIs a activer : Google Calendar API, Maps JavaScript API, Geocoding API, Directions API.

## Musique integree

1. Deposer tes fichiers MP3 dans le dossier `music/`
2. Les lister dans `js/app/bundledMusic.js` (url, name, artist)
3. Au chargement, un morceau aleatoire est selectionne automatiquement

L'upload de fichiers reste disponible en option.

## Lancer en local (Mac)

```bash
# Terminal 1 — backend optionnel
GOOGLE_MAPS_API_KEY=votre_cle node server/server.js

# Terminal 2 — frontend
python3 -m http.server 5500
```

Ouvrir : http://127.0.0.1:5500/

## iPhone (HTTPS obligatoire)

### Deploiement GitHub Pages

1. Ajouter les secrets Actions : `GCAL_CLIENT_ID`, `GCAL_API_KEY`, `GCAL_MAP_ID`
2. Settings → Pages → Source : **GitHub Actions**
3. Pousser sur `main` — le workflow `.github/workflows/deploy-pages.yml` genere `config.local.js` et deploie
4. Ouvrir sur l'iPhone : `https://emiliwasabi.github.io/murmur/`

Dans Google Cloud Console :
- Origine OAuth : `https://emiliwasabi.github.io`
- Referrer API key : `https://emiliwasabi.github.io/murmur/*`

Ajouter sur l'ecran d'accueil iPhone via Safari : Partager → Sur l'ecran d'accueil.

## Utilisation

1. Ajouter des fichiers audio locaux
2. Connecter Google Calendar
3. Appuyer sur Play
4. Suivre la musique dans l'espace avec des ecouteurs
