# Manual de usuario — Sistema POS Pañalera (versión desglosada)

**Versión 1.0** · Para añadir capturas y exportar a PDF por secciones.

---

## Índice

| # | Sección | Archivo |
|---|--------|---------|
| 1 | [Introducción](01-introduccion.md) | `01-introduccion.md` |
| 2 | [Acceso e inicio de sesión](02-acceso-inicio-sesion.md) | `02-acceso-inicio-sesion.md` |
| 3 | [Ventas](03-ventas.md) | `03-ventas.md` |
| 4 | [Recibos](04-recibos.md) | `04-recibos.md` |
| 5 | [Devoluciones](05-devoluciones.md) | `05-devoluciones.md` |
| 6 | [Cortes de caja](06-cortes-de-caja.md) | `06-cortes-de-caja.md` |
| 7 | [Catálogos](07-catalogos.md) | `07-catalogos.md` |
| 8 | [Reportes y Dashboard](08-reportes-dashboard.md) | `08-reportes-dashboard.md` |
| 9 | [Cerrar sesión y exportar a PDF](09-cerrar-sesion-exportar-pdf.md) | `09-cerrar-sesion-exportar-pdf.md` |

---

## Capturas

Las capturas usadas en el manual están en la carpeta **[imagenes/](imagenes/)**:

- `01-login.png` — Inicio de sesión  
- `02-menu.png` — Menú lateral  
- `03-venta-rapida.png` — Venta rápida  
- `04-venta-completa.png` — Venta completa  
- `05-recibo.png` — Modal recibo  
- `06-devoluciones.png` — Crear devolución  
- `07-corte-caja.png` — Corte de caja  
- `08-reportes.png` — Reportes  
- `09-dashboard.png` — Dashboard  

Puedes sustituirlas por capturas reales de la aplicación si lo deseas.

---

## Exportar a PDF

1. **Manual completo**: usa `MANUAL_USUARIO.md` en la raíz de `docs/`.  
2. **Por secciones**: exporta cada `0X-...md` por separado y luego une los PDF, o usa una herramienta que concatene los Markdown antes de exportar.

**Herramientas útiles:**

- **Pandoc**: `pandoc docs/MANUAL_USUARIO.md -o MANUAL_USUARIO.pdf`  
- **md-to-pdf**: `npx md-to-pdf docs/MANUAL_USUARIO.md`  
- **VS Code**: extensión “Markdown PDF”, clic derecho en el `.md` → exportar a PDF.

Asegúrate de que las rutas a `imagenes/` sean correctas respecto a cada `.md` al exportar.
