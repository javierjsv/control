# Manual de usuario — Sistema POS Pañalera

**Versión 1.0** · Todo para el cuidado de tu bebé

---

## 1. Introducción

### 1.1 ¿Qué es este sistema?

Es un **sistema de punto de venta (POS)** para gestionar ventas, inventario, clientes, devoluciones y cortes de caja. Está pensado para tiendas (por ejemplo, pañalerías) que necesitan registrar ventas rápido, imprimir o compartir recibos y llevar un control diario de caja.

### 1.2 ¿Qué puedo hacer?

- **Ventas**: venta rápida (un producto) o venta completa (varios productos en carrito).
- **Recibos**: ver, imprimir o compartir por WhatsApp/Email tras cada venta.
- **Devoluciones**: crear devoluciones totales o parciales y consultar el historial.
- **Cortes de caja**: cierre diario, comparar lo contado con lo registrado, historial y exportar Excel.
- **Catálogos**: productos, categorías, proveedores y clientes.
- **Reportes y dashboard**: ver ventas por período, exportar Excel e imprimir.

### 1.3 Requisitos

- Navegador web actualizado (Chrome, Edge, Safari, etc.).
- Conexión a internet.
- Cuenta de usuario (email y contraseña) para acceder.

---

## 2. Acceso e inicio de sesión

### 2.1 Entrar al sistema

1. Abre la aplicación en el navegador.
2. Verás la pantalla de **Bienvenido a Pañalera** con el formulario de acceso.

![Pantalla de inicio de sesión](imagenes/01-login.png)

3. Escribe tu **Email** (ej. `mama@example.com`).
4. Escribe tu **Contraseña** (mínimo 6 caracteres).
5. Opcional: usa el enlace **¿Olvidaste tu contraseña?** si está configurado.
6. Pulsa **Iniciar sesión**.

Si los datos son correctos, entrarás al menú principal. Si no, verás un mensaje de error.

### 2.2 Menú principal y navegación

Tras iniciar sesión, abre el **menú lateral** (icono de hamburguesa ☰ en la barra superior). Ahí encontrarás:

![Menú lateral](imagenes/02-menu.png)

- **Inicio** — Página de inicio.
- **Dashboard** — Resumen y gráficos de ventas.
- **Perfil** — Datos del usuario.
- **Proveedores** — Gestión de proveedores.
- **Venta completa** — Ventas con carrito (varios productos).
- **Ventas** — Listado e historial de ventas.
- **Registrar venta rápida** — Venta de un solo producto.
- **Devoluciones** — Crear devoluciones.
- **Historial de devoluciones** — Ver devoluciones realizadas.
- **Corte de caja** — Cierre diario de caja.
- **Historial de cortes** — Ver cortes anteriores.
- **Clientes** — Catálogo de clientes.
- **Categorías** — Categorías de productos.
- **Productos** — Catálogo de productos.
- **Alertas de Stock** — Productos con stock bajo.
- **Reportes y análisis** — Reportes por período y exportación.

Al final del menú: **Cerrar sesión**.

---

## 3. Ventas

### 3.1 Venta rápida (un producto)

Para cobrar **un solo producto** en pocos pasos:

1. Menú → **Registrar venta rápida**.

![Venta rápida](imagenes/03-venta-rapida.png)

2. **Producto**  
   - Escribe en **Buscar producto** y elige uno de la lista.  
   - Es obligatorio seleccionar producto.

3. **Cliente** (opcional)  
   - Elige un **Cliente registrado** en el desplegable o  
   - Escribe el **Nombre cliente (manual)** si no está registrado.

4. **Cantidad**  
   - Usa **-** y **+** para ajustar. Mínimo 1.

5. **Método de pago**  
   - Elige **Efectivo**, **Tarjeta** o **Transferencia**.

6. **Descuento** (opcional)  
   - Ingresa un monto si aplica descuento.

7. Revisa **Subtotal**, **Descuento** y **Total a pagar**.

8. Pulsa **Registrar venta**.

Se descontará el stock, se guardará la venta y se abrirá el **modal del recibo** (imprimir, WhatsApp, Email o Cerrar).

### 3.2 Venta completa (varios productos)

Para ventas con **varios ítems** en carrito:

1. Menú → **Venta completa**.

![Venta completa](imagenes/04-venta-completa.png)

2. **Productos**  
   - **Buscar producto** → elige y se agrega al carrito.  
   - Repite para todos los productos.

3. **Carrito**  
   - Ajusta cantidades con **-** / **+**.  
   - Usa el icono de **papelera** para quitar un ítem.

4. **Cliente** (opcional)  
   - Cliente registrado o nombre manual.

5. **Método de pago**  
   - Efectivo, Tarjeta o Transferencia.

6. **Descuento** (opcional).

7. Revisa el **resumen** y pulsa **Cobrar** + monto.

Se registrará la venta, se actualizará el stock y se mostrará el **recibo**.

### 3.3 Listado de ventas

- Menú → **Ventas**.  
- Ahí ves el historial de ventas.  
- Puedes usar **filtros por fecha** (Desde / Hasta) si están disponibles.

---

## 4. Recibos

Tras **Registrar venta** (rápida) o **Cobrar** (venta completa), se abre el **Recibo de venta**.

![Modal Recibo de venta](imagenes/05-recibo.png)

El recibo incluye:

- Logo y nombre del negocio.  
- Nº de venta, fecha y cliente.  
- Tabla: Producto, Cant., Precio unit., Total.  
- Subtotal, descuento (si hay), **Total** y **método de pago**.

**Acciones:**

- **Imprimir** — Abre el cuadro de impresión del navegador.  
- **WhatsApp** — Comparte el resumen por WhatsApp (o abre wa.me con el texto).  
- **Email** — Abre el cliente de correo con asunto y cuerpo rellenados.  
- **Cerrar** — Cierra el modal y vuelves a la venta.

Si hay **cliente con teléfono o email**, al usar WhatsApp o Email se puede pre-rellenar destinatario cuando esté implementado.

---

## 5. Devoluciones

### 5.1 Crear una devolución

1. Menú → **Devoluciones**.

![Crear devolución](imagenes/06-devoluciones.png)

2. **Buscar la venta**  
   - Por **ID de venta** en el buscador, o  
   - Por **Ventas recientes**: ajusta **Desde** / **Hasta** y haz clic en la venta en la tabla o en las tarjetas.

3. **Tipo de devolución**  
   - **Completa** o **Parcial**.

4. **Ítems** (si es parcial)  
   - Elige qué productos y cantidades devolver.

5. **Razón**  
   - Solicitud del cliente, defectuoso, incorrecto, dañado, otro.

6. **Notas** (opcional).

7. Pulsa **Continuar** → revisa el resumen en el modal de confirmación → **Confirmar devolución**.

Se actualizará el stock y se registrará la devolución.

### 5.2 Historial de devoluciones

- Menú → **Historial de devoluciones**.  
- Filtros **Desde** / **Hasta** para ver devoluciones en un rango de fechas.

---

## 6. Cortes de caja

### 6.1 Cierre diario

1. Menú → **Corte de caja**.

![Corte de caja](imagenes/07-corte-caja.png)

2. **Fecha del corte**  
   - Elige el **Día a cerrar** en el selector de fecha.  
   - Pulsa **Actualizar** para cargar los datos.

3. Revisa la tabla **Ventas registradas**: método de pago (Efectivo, Tarjeta, Transferencia, etc.), número de transacciones y total.

4. Si **aún no hay corte** para esa fecha:  
   - En **Cantidad contada / reportada** ingresa lo que cuentas en caja por cada método.  
   - Revisa la **Comparación** (registrado vs. contado y diferencia).  
   - Opcional: **Notas**.

5. Pulsa **Cerrar caja** cuando todo esté correcto.

6. **Exportar Excel** e **Imprimir**  
   - Disponibles cuando hay resumen cargado. Sirven para guardar o imprimir el corte.

### 6.2 Historial de cortes

- Menú → **Historial de cortes**.  
- Listado de cortes realizados. Usa **Desde** / **Hasta** para filtrar por fechas.

---

## 7. Catálogos

### 7.1 Productos

- Menú → **Productos**.  
- Listado de productos. Crear, editar, ver detalle y precios. El **stock** se actualiza con ventas y devoluciones.

### 7.2 Categorías

- Menú → **Categorías**.  
- Gestionar categorías para organizar productos.

### 7.3 Proveedores

- Menú → **Proveedores**.  
- Alta, edición y listado de proveedores.

### 7.4 Clientes

- Menú → **Clientes**.  
- Alta, edición y listado de clientes. Se usan en ventas (opcional) y al compartir recibo por WhatsApp/Email.

### 7.5 Alertas de stock

- Menú → **Alertas de Stock**.  
- Productos con stock bajo según la configuración del sistema.

---

## 8. Reportes y Dashboard

### 8.1 Reportes y análisis

1. Menú → **Reportes y análisis**.

![Reportes](imagenes/08-reportes.png)

2. **Período del reporte**  
   - **Período**: Hoy, Última semana o Último mes.  
   - O activa **Usar rango personalizado** y elige **Desde** / **Hasta**.

3. Si usas rango personalizado, pulsa **Generar reporte**.

4. El reporte muestra, entre otros:  
   - **Total ventas**, **Cantidad de ventas**, **Ticket promedio**.  
   - Desglose por método de pago y/o período según lo implementado.

5. **Exportar Excel** — Descarga el reporte en `.xlsx`.  
6. **Imprimir / PDF** — Abre el diálogo de impresión (puedes “Guardar como PDF” si el navegador lo permite).

### 8.2 Dashboard

- Menú → **Dashboard**.

![Dashboard](imagenes/09-dashboard.png)

- Resumen visual de ventas, productos y métricas principales.  
- Gráficos y tarjetas según la configuración del proyecto.

---

## 9. Cerrar sesión

- Menú → **Cerrar sesión** (al final del menú, en rojo).  
- Vuelves a la pantalla de inicio de sesión.

---

## 10. Exportar el manual a PDF

- Los archivos del manual están en la carpeta **docs/** (incl. versión desglosada por secciones).  
- Las capturas están en **docs/imagenes/**.  
- Puedes exportar a PDF con:  
  - **Pandoc**: `pandoc docs/MANUAL_USUARIO.md -o MANUAL_USUARIO.pdf`  
  - **md-to-pdf** (npm): `npx md-to-pdf docs/MANUAL_USUARIO.md`  
  - Extensiones de VS Code como **Markdown PDF**: clic derecho en el `.md` → “Markdown PDF: Export (pdf)”.

Para la versión desglosada, exporta cada `docs/0X-...md` y luego une los PDF, o usa un índice que enlace todos los archivos y exporta desde ahí si tu herramienta lo soporta.

---

*Manual de usuario — Sistema POS Pañalera · Versión 1.0*
