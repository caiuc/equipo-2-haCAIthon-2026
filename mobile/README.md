# SIRENA — mobile

```bash
cd mobile
npx expo start --lan
```

El teléfono y el Mac tienen que estar en **la misma Wi‑Fi** (sin “aislamiento de clientes”).

Si el QR da timeout (red de universidad/cafetería):

```bash
npx expo start --tunnel
```

Eso publica Metro por internet; la primera vez pide cuenta Expo.

`EXPO_PUBLIC_API_URL` no puede ser `localhost` en el teléfono. Usa la IP LAN que muestra Expo (`exp://10.x.x.x:8081` → `http://10.x.x.x:3000`).
