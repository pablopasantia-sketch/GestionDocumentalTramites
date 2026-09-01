# 📐 SISTEMA DE DISEÑO (DESIGN SYSTEM) — GACETA MUNICIPAL DE SUCRE
## Implementación para el Sistema Wayka (Gestión Documental y Workflow)

Este documento detalla la especificación técnica y las directrices visuales del **Sistema de Diseño basado en la identidad y estructura web de la Gaceta Municipal de Sucre**, implementado en el frontend del Sistema Wayka.

---

## 1. 🎨 Paleta de Colores (Color Palette)

### 1.1 Colores Primarios e Institucionales

| Nombre del Color | HEX | RGB | HSL | Token CSS | Uso Principal |
|---|---|---|---|---|---|
| **Rojo Sucre / Borgoña (Primary Brand)** | `#800000` | `rgb(128, 0, 0)` | `hsl(0, 100%, 25%)` | `--color-primary-sucre` | Encabezados superiores (header), franjas institucionales, títulos `h1`/`h2` y acentos principales. Hover: `#600000` (`--color-primary-sucre-hover`). |
| **Azul Institucional (Secondary Brand)** | `#1B365D` | `rgb(27, 54, 93)` | `hsl(215, 55%, 24%)` | `--color-secondary-azul` | Botones de acción principal, enlaces interactivos, barra de navegación secundaria y elementos del pie de página (footer). Hover: `#132744`. |

### 1.2 Colores de Estado y Contexto (Feedback Colors)

| Estado | HEX | Token Fondo | Token Texto | Uso en el Sistema |
|---|---|---|---|---|
| **Verde Éxito / Vigente** | `#28A745` | `#E6F4EA` | `#1E7E34` | Etiquetas de estado `VIGENTE`, trámites atendidos, confirmaciones de éxito y badges de aprobación. |
| **Rojo Alerta / Abrogada** | `#DC3545` | `#FCE8E6` | `#B71C1C` | Etiquetas de estado `ABROGADA`, trámites `BLOQUEADO` o `ANULADO`, alertas y errores. |
| **Amarillo / Modificada** | `#FFC107` | `#FFF8E1` | `#8D6500` | Etiquetas de estado `MODIFICADA`, `DEROGADA`, `EN ATENCIÓN` o advertencias. |
| **Azul Información / Tránsito** | `#17A2B8` | `#E0F7FA` | `#006064` | Metadatos informativos, estados `EN TRÁNSITO` o `POR RECIBIR`. |

### 1.3 Neutros y Superficies

| Elemento | Valor HEX | Token CSS | Descripción |
|---|---|---|---|
| **Blanco Puro (Base Surface)** | `#FFFFFF` | `--color-surface-white` | Fondo de tarjetas, tablas, formularios y modales. |
| **Gris Fondo / Contenedores** | `#F4F6F9` | `--color-bg-container` | Fondo general de la aplicación (`body`). |
| **Gris Bordes / Separadores** | `#E2E8F0` | `--color-border` | Bordes de tarjetas, tablas y separadores sutiles. |
| **Gris Texto Principal** | `#212529` | `--color-text-main` | Texto de lectura general y encabezados secundarios. |
| **Gris Texto Secundario (Muted)** | `#6C757D` | `--color-text-secondary` | Fechas, metadatos, subtítulos y descripciones. |
| **Filas Zebra (Tablas)** | `#F8F9FA` | `--color-table-zebra` | Fondo alternado en filas de tablas estadísticas. |

---

## 2. 🔤 Tipografía (Typography)

- **Fuente Principal (Sans-serif):** `Open Sans`, `Roboto`, `Helvetica Neue`, Arial, sans-serif.
- **Fuente de Títulos y Encabezados:** `Montserrat`, `Open Sans`, `Segoe UI`, sans-serif.

### 2.1 Escala Tipográfica

| Rol | Tamaño (px / rem) | Peso (Weight) | Interlineado (Line-Height) | Uso Recomendado |
|---|---|---|---|---|
| **Heading 1 (`h1`)** | `32px` / `2.0rem` | Bold (700) | `1.2` | Título del portal / Documento principal / Encabezado de sección |
| **Heading 2 (`h2`)** | `24px` / `1.5rem` | Bold (700) | `1.3` | Títulos de secciones ("LO ÚLTIMO", "ESTADÍSTICAS", "SERVICIOS") |
| **Heading 3 (`h3`)** | `18px` / `1.125rem` | SemiBold (600) | `1.4` | Títulos de normas, módulos o tarjetas de trámites |
| **Body / Párrafos (`p`)** | `15px` / `0.9375rem` | Regular (400) | `1.5` | Texto general de lectura, descripciones y etiquetas de formularios |
| **Small / Captions (`small`, `badge`)** | `12px` / `0.75rem` | Regular (400) / Medium (500) | `1.4` | Fechas, metadatos, badges de estado y pies de foto |

---

## 3. 🔳 Componentes de Interfaz (UI Components)

### 3.1 Botones (Buttons)

- **Botón Primario (Azul Institucional):**
  - Clase CSS: `.btn-primary` o `.btn-azul`
  - Fondo: `#1B365D` (Hover: `#132744`)
  - Texto: `#FFFFFF`, 14px, Medium (500)
  - Padding: `10px 20px`, Border Radius: `4px`
- **Botón Institucional (Rojo Sucre):**
  - Clase CSS: `.btn-institutional` o `.btn-sucre`
  - Fondo: `#800000` (Hover: `#600000`)
  - Texto: `#FFFFFF`, 14px, Medium (500)
  - Padding: `10px 20px`, Border Radius: `4px`
- **Botón Secundario / Contorno:**
  - Clase CSS: `.btn-secondary`
  - Fondo: `#FFFFFF`, Borde: `1px solid #E2E8F0`, Texto: `#212529` (Hover: fondo `#F8F9FA`)

### 3.2 Tarjetas de Normas y Trámites (Content Cards)

- **Clase CSS:** `.norm-card` o `.card`
- **Estructura Visual:**
  - Contenedor con fondo `#FFFFFF`, borde `1px solid #E2E8F0`, `border-radius: 6px`.
  - Sombra: `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05)`.
  - **Insignia Superior Left:** Tipo de norma/trámite (ej: `.badge-sucre` o `.badge-azul`).
  - **Insignia Superior Right:** Badge de Estado (ej: `ESTADO: VIGENTE`).
  - **Cuerpo:** Título de la norma/trámite en `#1B365D` / `#212529` + Descripción en `#6C757D`.
  - **Footer de Tarjeta:** Botón "Ver Más" (`.btn-primary btn-sm`).

### 3.3 Badges / Etiquetas de Estado

- **Estructura Base:** `border-radius: 12px`, `padding: 4px 12px`, `font-size: 12px`, `font-weight: 700`, `text-transform: uppercase`.
- **Vigente / Éxito:** Fondo `#E6F4EA`, Texto `#1E7E34`, Borde `#A3D9A5` (`.badge-vigente`).
- **Alerta / Abrogada:** Fondo `#FCE8E6`, Texto `#B71C1C`, Borde `#F5A5A5` (`.badge-alerta`).
- **Modificada / Derogada:** Fondo `#FFF8E1`, Texto `#8D6500`, Borde `#FFE082` (`.badge-modificada`).
- **Institucional Sucre:** Fondo `#FBEAEA`, Texto `#800000`, Borde `#F5C2C2` (`.badge-sucre`).

### 3.4 Tablas Estadísticas y de Datos (Data Tables)

- **Clase CSS:** `.table-sucre` dentro de contenedor `.table-container`.
- **Header de Tabla (`<thead>`):** Fondo `#800000` (Rojo Sucre) o `#1B365D` (Azul Institucional), Texto `#FFFFFF`, texto alineado a la izquierda, padding `12px 16px`.
- **Filas (`<tr>`):** Alternadas en fondo `#FFFFFF` y `#F8F9FA` (*Zebra Striping*).
- **Bordes:** `1px solid #E2E8F0`.
- **Padding de Celda (`<td>`):** `12px 16px`.

### 3.5 Encabezados y Pie de Página

- **Franja Superior:** Fondo `#800000` con escudo institucional, títulos de la Gaceta y enlaces institucionales.
- **Barra de Navegación:** Fondo `#1B365D` con menú de navegación e indicador activo en color amarillo `#FFC107`.
- **Pie de Página (Footer):** Fondo `#1B365D` con borde superior de 4px en `#800000` y textos claros `#E2E8F0`.

---

## 4. 📐 Espaciado, Cuadrícula y Layout (Grid & Layout)

- **Contenedor Máximo (Max Width):** `1200px` centrado (`margin: 0 auto;`).
- **Sistema de Espaciado (Base 8px):**
  - `xs`: `4px` (`--space-xs`)
  - `sm`: `8px` (`--space-sm`)
  - `md`: `16px` (`--space-md`)
  - `lg`: `24px` (`--space-lg`)
  - `xl`: `32px` (`--space-xl`)
  - `2xl`: `48px` (`--space-2xl`)
- **Grid Responsivo:**
  - Desktop: 3 columnas (`.grid-3`) o 4 columnas (`.grid-4`).
  - Tablet: 2 columnas (`.grid-2`).
  - Dispositivos Móviles: 1 columna fluida.

---

## 5. 📂 Archivos Implementados en el Proyecto

- **Hoja de Estilos Central:** [`frontend/src/styles/index.css`](file:///c:/Users/TEC_DB/Desktop/Proyecto%20pasantia/frontend/src/styles/index.css)
- **Importación de Fuentes:** [`frontend/index.html`](file:///c:/Users/TEC_DB/Desktop/Proyecto%20pasantia/frontend/index.html)
- **Componentes Adaptados:**
  - [`frontend/src/components/layout/Navbar.jsx`](file:///c:/Users/TEC_DB/Desktop/Proyecto%20pasantia/frontend/src/components/layout/Navbar.jsx)
  - [`frontend/src/components/layout/Footer.jsx`](file:///c:/Users/TEC_DB/Desktop/Proyecto%20pasantia/frontend/src/components/layout/Footer.jsx)
  - [`frontend/src/pages/Home.jsx`](file:///c:/Users/TEC_DB/Desktop/Proyecto%20pasantia/frontend/src/pages/Home.jsx)
  - [`frontend/src/pages/SystemStatus.jsx`](file:///c:/Users/TEC_DB/Desktop/Proyecto%20pasantia/frontend/src/pages/SystemStatus.jsx)
  - [`frontend/src/pages/Login.jsx`](file:///c:/Users/TEC_DB/Desktop/Proyecto%20pasantia/frontend/src/pages/Login.jsx)
  - [`frontend/src/App.jsx`](file:///c:/Users/TEC_DB/Desktop/Proyecto%20pasantia/frontend/src/App.jsx)
