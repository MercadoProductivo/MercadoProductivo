# Iconos PWA - Mercado Productivo

## 📱 Estado Actual

Los iconos de la PWA (Progressive Web App) actualmente se generan de dos formas:

### ✅ Favicon (Tab del Navegador)
- **Archivo**: `/public/mp-logo.svg`
- **Ubicaciones**:
  - `src/app/icon.svg` - Favicon principal de Next.js
  - `public/favicon.svg` - Favicon alternativo
  - `public/mp-logo.svg` - Logo original
- **Estado**: ✅ **Configurado correctamente con el logo oficial**

### ⚠️ Iconos PNG de la PWA
Los iconos PNG para instalación de PWA se generan dinámicamente mediante:
- **API Route**: `src/app/api/icons/[icon]/route.ts`
- **Tamaños**: 192x192, 512x512, 512x512 (maskable)
- **Diseño actual**: Gradiente naranja con texto "MP"

## 🎯 Recomendación: Iconos Estáticos

Para usar el logo oficial de Mercado Productivo en los iconos de instalación de PWA, se recomienda:

### Opción 1: Generar PNG desde SVG (Recomendado)

1. **Exportar desde diseño** o **usar herramienta online**:
   - [Vecta.io/nano](https://vecta.io/nano) - Convertir SVG a PNG
   - [CloudConvert](https://cloudconvert.com/svg-to-png) - SVG to PNG
   - Adobe Illustrator / Figma / Inkscape

2. **Tamaños necesarios**:
   ```
   /public/icons/icon-192.png   (192x192)
   /public/icons/icon-512.png   (512x512)
   /public/icons/icon-512-maskable.png (512x512 con padding)
   ```

3. **Especificaciones**:
   - **192x192**: Logo con padding mínimo
   - **512x512**: Logo con padding mínimo
   - **512x512 maskable**: Logo centrado con 15% de padding en todos los lados
     - Área segura: 364x364 (centro)
     - Padding: 74px en cada lado

### Opción 2: Actualizar el Generador Dinámico

Si prefieres mantener la generación dinámica, puedes modificar:
- `src/app/api/icons/[icon]/route.ts`

Sin embargo, SVG a PNG dinámico en Edge Runtime es complejo y puede afectar el rendimiento.

## 📝 Manifest PWA

El archivo `public/manifest.webmanifest` ya está configurado para usar estos iconos:

```json
{
  "icons": [
    {
      "src": "/api/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/api/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/api/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## ✅ Verificación

Después de agregar los iconos PNG estáticos:

1. **Local**: Verifica en `http://localhost:3000/icons/icon-192.png`
2. **PWA**: Instala la app y verifica el icono en:
   - Pantalla de inicio (móvil)
   - Escritorio (desktop)
   - App switcher

## 🔗 Recursos

- [PWA Icon Guidelines](https://web.dev/articles/add-manifest)
- [Maskable Icons](https://web.dev/articles/maskable-icon)
- [Manifest Web App](https://developer.mozilla.org/es/docs/Web/Manifest)
