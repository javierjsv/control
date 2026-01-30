# 9. Cerrar sesión y exportar el manual a PDF

[← Índice](README.md)

---

## 9.1 Cerrar sesión

- Menú → **Cerrar sesión** (al final del menú, en rojo).  
- Vuelves a la pantalla de inicio de sesión.

---

## 9.2 Exportar el manual a PDF

- Los archivos del manual están en **docs/** (manual completo y versión desglosada).  
- Las capturas están en **docs/imagenes/**.

**Opciones para exportar a PDF:**

1. **Pandoc**  
   ```bash
   pandoc docs/MANUAL_USUARIO.md -o MANUAL_USUARIO.pdf
   ```

2. **md-to-pdf** (npm)  
   ```bash
   npx md-to-pdf docs/MANUAL_USUARIO.md
   ```

3. **VS Code**  
   - Extensión “Markdown PDF”.  
   - Clic derecho en el `.md` → “Markdown PDF: Export (pdf)”.

Para la **versión desglosada**, exporta cada `0X-...md` y une los PDF, o usa un índice que enlace todos los archivos y exporta desde ahí si tu herramienta lo soporta.

---

[← 8. Reportes y Dashboard](08-reportes-dashboard.md)
