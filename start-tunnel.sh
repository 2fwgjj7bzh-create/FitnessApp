#!/bin/bash
# Lance l'app en mode accessible de partout (hors Wi-Fi maison), via un vrai tunnel ngrok v3.
# Le --tunnel intégré d'Expo est cassé (bundle un ngrok v2 trop vieux, rejeté par ngrok).
set -e
cd "$(dirname "$0")"

echo "→ Libération du port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
pkill -f "ngrok http 8081" 2>/dev/null || true
sleep 1

echo "→ Démarrage de Metro (Expo)..."
npx expo start > /tmp/expo-metro.log 2>&1 &
until grep -q "Waiting on" /tmp/expo-metro.log 2>/dev/null; do sleep 1; done

echo "→ Démarrage du tunnel ngrok..."
~/bin/ngrok http 8081 --log=stdout > /tmp/ngrok.log 2>&1 &
sleep 4

URL=$(grep -o 'url=https://[^ ]*' /tmp/ngrok.log | tail -1 | cut -d= -f2)
if [ -z "$URL" ]; then
  echo "Échec : pas d'URL ngrok. Vérifie /tmp/ngrok.log"
  exit 1
fi

HOST=$(echo "$URL" | sed 's#https://##')
echo ""
echo "✅ App accessible de partout sur :"
echo "   exp://$HOST"
echo ""
echo "Ouvre ce lien depuis Expo Go sur ton téléphone (ou scanne le QR affiché par expo)."
echo "Laisse ce terminal ouvert tant que tu testes."
