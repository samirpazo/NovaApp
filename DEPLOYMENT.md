# Despliegue de NovaApp (Visitas Técnicas Web / PWA)

NovaApp es la aplicación móvil y web para gestión de visitas técnicas y operaciones agrícolas que consume el backend central de Nova (`https://api.novateam.tech`).

## Entorno de Producción
- **URL pública:** `https://novaapp.novateam.tech`
- **Contenedor Podman en VPS:** `novaapp-web`
- **Puerto interno VPS:** `127.0.0.1:3006 -> 80`
- **Proxy Inverso:** Nginx con certificado SSL Let's Encrypt (Certbot).

## Variables de Entorno de Compilación
Inyectadas en tiempo de build (`Dockerfile`):
- `EXPO_PUBLIC_API_URL=https://api.novateam.tech`
- `EXPO_PUBLIC_PASSWORD_PEPPER=bc847308a05efc5916ab62e806665f402290da4c56f46aeb`

## Procedimiento de Despliegue
Desde la máquina de desarrollo:
```bash
bash scripts/deploy-prod.sh
```

El script realiza:
1. Sincronización incremental vía `rsync` hacia `/opt/nova/novaapp-src` en el VPS (excluyendo `.git`, `node_modules`, `android`, `ios`).
2. Resguardo de la imagen previa como `localhost/novaapp-web:previous` para permitir rollback inmediato.
3. Compilación con Podman multi-stage (`node:22-alpine` para `npx expo export -p web` y `nginx:1.27-alpine` para servir los estáticos).
4. Reemplazo del contenedor `novaapp-web` en el puerto `3006`.
5. Purgado de imágenes intermedias huérfanas (`podman image prune -f`).
6. Verificación de salud HTTP y HTTPS.

## Rollback
En caso de requerir volver a la versión anterior de inmediato en el VPS:
```bash
ssh root@5.183.8.172 "podman rm -f novaapp-web && podman run -d --name novaapp-web --network nova-internal --restart always -p 127.0.0.1:3006:80 localhost/novaapp-web:previous"
```

