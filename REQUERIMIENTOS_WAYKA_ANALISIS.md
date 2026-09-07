# REQUERIMIENTOS TÉCNICOS Y FUNCIONALES — SISTEMA WAYKA MVP

> **Documento de Análisis** — Extraído de los 4 manuales funcionales del sistema legado Wayka  
> **Fecha de análisis:** 28 de agosto de 2026  
> **Objetivo:** Servir como contexto base para la reconstrucción del sistema desde cero  
> **Alcance:** MVP desarrollado por **un solo programador** en un periodo de **3 meses**

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO DEL SISTEMA

### 1.1 ¿Qué es Wayka?

**Wayka** (del Aymara: "reunirse comunitariamente para atacar el trabajo") es un **Sistema de Gestión de Trámites Documentales y Workflow** diseñado para modelar, ejecutar, supervisar y coordinar flujos de trabajo institucionales de forma electrónica.

### 1.2 Problema que resuelve

Las instituciones gestionan trámites y correspondencias de forma manual (papel físico), generando:
- Pérdida de trazabilidad del documento
- Demoras no controladas en la atención
- Imposibilidad de consultar el estado de un trámite en tiempo real
- Falta de métricas de desempeño por funcionario u oficina

### 1.3 Objetivo del sistema

| Aspecto | Descripción |
|---|---|
| **Automatización** | Digitalizar la secuencia de acciones/tareas de los flujos de trabajo institucionales |
| **Monitoreo** | Permitir supervisar el estado de cada trámite, quién lo tiene, cuánto tiempo lleva |
| **Transparencia** | Los ciudadanos/clientes pueden consultar el estado de su trámite con el número de Hoja de Ruta |
| **Reportería** | Generar reportes de procesos iniciados, en flujo, concluidos, pendientes por funcionario, etc. |
| **Trazabilidad** | Mantener un historial inmutable de cada actividad: responsable, tiempo estimado vs. transcurrido, proveídos, adjuntos |

### 1.4 Alcance del MVP

El MVP debe cubrir el **ciclo de vida completo de un trámite/correspondencia**, desde su recepción en Ventanilla Única hasta su conclusión o archivo, incluyendo:

- ✅ Autenticación y autorización por roles (JWT)
- ✅ Recepción y registro de trámites en Ventanilla Única
- ✅ Escritorio Virtual con bandejas de pendientes
- ✅ Derivación (avanzar/retroceder) entre funcionarios
- ✅ Registro de proveídos en cada paso
- ✅ Adjuntar/descargar documentos PDF
- ✅ Hoja de Ruta con correlativo automático
- ✅ Búsqueda pública de trámites por número de Hoja de Ruta
- ✅ Reportes básicos de transparencia
- ✅ Bloqueo/desbloqueo de trámites
- ✅ Gestión unificada de Trámites y Correspondencias en un solo flujo directo (derivación libre a destinatario)

**Fuera del alcance del MVP (Fase 2+):**
- ❌ Diseñador visual de flujos de trabajo (actividades, formularios dinámicos, dominios, ACLs)
- ❌ Menús y Enlaces dinámicos gestionados desde base de datos (se usarán rutas fijas en React)
- ❌ Gateway para integración con módulos externos
- ❌ Grupos de trabajo (murales, hilos, segmentos)
- ❌ Análisis y explotación dinámica de datos (reportes con agrupación/conteo por campos)
- ❌ DibRap (generador ABM de tablas genéricas)

---

## 2. MATRIZ DE ROLES Y PERMISOS DE ACCESO

### 2.1 Roles del sistema

El sistema define **5 roles** principales. Para el MVP se implementan **4 roles** (se excluye Diseñador):

| # | Rol | Ámbito en el MVP | Descripción funcional |
|---|---|---|---|
| 1 | **Administrador de Sistema** | ✅ Sí | Gestión de usuarios, roles, personas, organigrama (ubicaciones orgánicas), parámetros del sistema. CRUD completo de entidades base. |
| 2 | **Administrador de Wayka** | ✅ Sí | Gestión operativa de trámites: anular, habilitar trámites concluidos, redireccionar procesos de un usuario a otro, administrar tipos correlativos, reportes de transparencia completos. |
| 3 | **Ventanilla Única** | ✅ Sí | Crear/iniciar trámites y correspondencias, registrar datos del formulario, generar Hoja de Ruta, adjuntar documentos, avanzar/retroceder procesos, bloquear/desbloquear trámites. Acceso a su escritorio virtual y reportes. |
| 4 | **Funcionario (Atención de trámites)** | ✅ Sí | Recibir trámites/correspondencias en su escritorio virtual, atender (registrar proveído), adjuntar documentos, avanzar/retroceder al siguiente paso del flujo. Consultas y reportes de sus trámites. |
| 5 | **Diseñador de Wayka** | ❌ MVP | Diseño de procesos, actividades, formularios, campos, dominios, informes, ACLs. Se preconfigura en la DB. |

### 2.2 Matriz de permisos por módulo

| Módulo/Funcionalidad | Admin Sistema | Admin Wayka | Ventanilla Única | Funcionario |
|---|:---:|:---:|:---:|:---:|
| **Gestión de usuarios y roles** | ✅ CRUD | ❌ | ❌ | ❌ |
| **Gestión de personas** | ✅ CRUD | ❌ | ❌ | ❌ |
| **Gestión ubicaciones orgánicas** | ✅ CRUD | ❌ | ❌ | ❌ |
| **Parámetros del sistema** | ✅ CRUD | ❌ | ❌ | ❌ |
| **Tipos correlativos** | ❌ | ✅ Modificar | ❌ | ❌ |
| **Anular trámite** | ❌ | ✅ | ❌ | ❌ |
| **Habilitar trámite concluido** | ❌ | ✅ | ❌ | ❌ |
| **Redireccionar trámite** | ❌ | ✅ | ❌ | ❌ |
| **Crear/iniciar trámite** | ❌ | ❌ | ✅ | ❌ |
| **Recepción correspondencia** | ❌ | ❌ | ✅ | ❌ |
| **Escritorio Virtual (pendientes)** | ❌ | ✅ Ver | ✅ | ✅ |
| **Atender trámite (proveído)** | ❌ | ❌ | ✅ | ✅ |
| **Avanzar trámite** | ❌ | ❌ | ✅ | ✅ |
| **Retroceder trámite** | ❌ | ❌ | ✅ | ✅ |
| **Adjuntar documentos** | ❌ | ❌ | ✅ | ✅ |
| **Bloquear/Desbloquear** | ❌ | ❌ | ✅ | ❌ |
| **Búsqueda pública (Hoja de Ruta)** | ✅ | ✅ | ✅ | ✅ |
| **Reportes transparencia** | ❌ | ✅ Completo | ✅ Limitado | ✅ Limitado |
| **Cambio de clave** | ✅ | ✅ | ✅ | ✅ |

### 2.3 Reglas de asignación de roles

- Un usuario puede tener **múltiples roles** asignados simultáneamente.
- Cada asignación usuario-rol incluye:
  - **Ubicación orgánica** (oficina/unidad a la que pertenece)
  - **Nivel de acceso** (ej: "Control total")
  - **Fecha de expiración** del acceso
  - **Filtro** opcional (para restringir vistas por parámetro)
- Al iniciar sesión, el sistema muestra el usuario, su rol activo y las categorías/enlaces disponibles para ese rol.

---

## 3. CICLO DE VIDA DEL TRÁMITE Y MÁQUINA DE ESTADOS

### 3.1 Estados del trámite

El sistema maneja los siguientes **8 estados** para un proceso de negocio (trámite/correspondencia):

| # | Estado | Código sugerido | Icono/Color | Descripción |
|---|---|---|---|---|
| 1 | **En atención** | `EN_ATENCION` | 🟡 | El trámite está siendo atendido activamente por un funcionario en su oficina |
| 2 | **Atendido (listo para despachar)** | `ATENDIDO` | 🟢 | El funcionario terminó de atender y el trámite está listo para ser enviado al siguiente paso |
| 3 | **En tránsito** | `EN_TRANSITO` | 🔵 | Digitalmente ya se envió, pero físicamente el documento aún no llegó al destinatario |
| 4 | **Por recibir (despachado sin confirmar)** | `POR_RECIBIR` | 🟠 | Fue despachado al siguiente usuario, pero éste aún no lo recepcionó/confirmó |
| 5 | **Recibido (despachado y en atención)** | `RECIBIDO` | 🟡 | Fue despachado y el siguiente usuario ya está atendiéndolo |
| 6 | **Bloqueado** | `BLOQUEADO` | 🔴 | El trámite fue bloqueado temporalmente (por observaciones, documentación incompleta, etc.) |
| 7 | **Concluido** | `CONCLUIDO` | ⚪ | El proceso de negocio ha terminado su flujo completo |
| 8 | **Anulado** | `ANULADO` | ⛔ | El trámite fue eliminado/anulado por el Administrador de Wayka |

### 3.2 Diagrama de transición de estados

```
                    ┌──────────────┐
                    │   CREADO     │ (Ventanilla Única registra el trámite)
                    └──────┬───────┘
                           │ iniciar
                           ▼
                    ┌──────────────┐
             ┌─────│ EN_ATENCION  │◄────────────────────────────┐
             │     └──────┬───────┘                             │
             │            │ despachar                           │
             │            ▼                                     │
             │     ┌──────────────┐                             │
             │     │  POR_RECIBIR │ (en tránsito digital)       │
             │     └──────┬───────┘                             │
             │            │ recepcionar                         │
             │            ▼                                     │
             │     ┌──────────────┐                             │
             │     │  EN_ATENCION │ (siguiente funcionario)     │
             │     └──────┬───────┘                             │
             │            │                                     │
             │            ├── despachar ──► POR_RECIBIR ──►...  │ (ciclo)
             │            │                                     │
             │            ├── retroceder ──────────────────────►│
             │            │                                     │
             │            │ fin de flujo                        │
             │            ▼                                     │
             │     ┌──────────────┐                             │
             │     │  CONCLUIDO   │                             │
             │     └──────────────┘                             │
             │            ▲                                     │
             │            │ habilitar (Admin Wayka)             │
             │            ▼                                     │
             │     ┌──────────────┐                             │
             │     │  ANULADO     │ (Admin Wayka)               │
             │     └──────────────┘                             │
             │                                                  │
             │ bloquear (Ventanilla)                            │
             ▼                                                  │
      ┌──────────────┐                                          │
      │  BLOQUEADO   │── desbloquear (Ventanilla) ─────────────►│
      └──────────────┘
```

### 3.3 Transiciones permitidas por rol

| Transición | Admin Wayka | Ventanilla Única | Funcionario |
|---|:---:|:---:|:---:|
| CREADO → EN_ATENCION | ❌ | ✅ | ❌ |
| EN_ATENCION → POR_RECIBIR (avanzar) | ❌ | ✅ | ✅ |
| POR_RECIBIR → EN_ATENCION (recepcionar) | ❌ | ✅ | ✅ |
| EN_ATENCION → EN_ATENCION anterior (retroceder) | ❌ | ✅ | ✅ |
| EN_ATENCION → CONCLUIDO (fin de flujo) | ❌ | ✅ | ✅ |
| EN_ATENCION → BLOQUEADO | ❌ | ✅ | ❌ |
| BLOQUEADO → EN_ATENCION | ❌ | ✅ | ❌ |
| EN_ATENCION → ANULADO | ✅ | ❌ | ❌ |
| CONCLUIDO → EN_ATENCION (habilitar) | ✅ | ❌ | ❌ |
| Redireccionar a otro usuario | ✅ | ❌ | ❌ |

### 3.4 Tipos de flujo

El sistema consolida el motor de **Trámites y Correspondencias en un solo flujo directo**, caracterizado por la **derivación libre a destinatario**. Esto simplifica el modelo original de Wayka:
- No existen secuencias predefinidas estrictas para los procesos.
- En cada paso del ciclo, el usuario tiene la libertad de elegir a qué destinatario(s) avanzar el proceso, unificando la experiencia de trámites y correspondencias.

### 3.5 Tipos de actuación en actividades

| Tipo | Descripción | Implementación MVP |
|---|---|---|
| **Lineal** | El trámite avanza secuencialmente de una actividad a la siguiente | ✅ Prioridad |
| **Salto** | El trámite puede saltar a una actividad no contigua del flujo | ⚠️ Fase 2 |
| **Bifurcación** | El flujo se divide en caminos según una decisión (ej: Aprobado / No Aprobado) | ⚠️ Fase 2 |

---

## 4. REQUERIMIENTOS FUNCIONALES CLAVE

### 4.1 RF-01: Autenticación y Gestión de Sesión

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-01.1 | Login con usuario y clave (PIN). Mínimo 6, máximo 10 caracteres | ALTA |
| RF-01.2 | Al autenticarse, mostrar: nombre usuario, rol activo, menú según permisos del rol | ALTA |
| RF-01.3 | Cambio de clave: solicitar clave actual, validar, permitir nueva clave con confirmación | ALTA |
| RF-01.4 | Cerrar sesión desde cualquier pantalla (enlace en esquina superior derecha) | ALTA |
| RF-01.5 | Las claves deben almacenarse encriptadas | ALTA |
| RF-01.6 | Validar fecha de expiración del usuario-rol al autenticarse | MEDIA |

**Reglas de negocio:**
- Clave mínima: 6 caracteres, máxima: 10 caracteres
- Caracteres válidos: [a-z], [A-Z], [0-9]
- No usar palabras del diccionario ni nombres propios
- Combinar letras con números

### 4.2 RF-02: Gestión de Usuarios, Roles y Organigrama (Admin Sistema)

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-02.1 | CRUD de **Personas**: nombre, apellidos, CI, sexo, estado civil, teléfono, email, empresa telefónica | ALTA |
| RF-02.2 | CRUD de **Usuarios**: vinculado a persona, con usuario (login) y clave | ALTA |
| RF-02.3 | CRUD de **Roles**: nombre del rol, descripción | ALTA |
| RF-02.4 | Asignar **usuario-rol**: usuario + rol + ubicación orgánica + nivel de acceso + fecha expiración + filtro | ALTA |
| RF-02.5 | Un usuario puede tener **múltiples roles** | ALTA |
| RF-02.6 | CRUD de **Ubicaciones orgánicas** (áreas): jerárquica (padre-hijo), con código, nivel | ALTA |
| RF-02.7 | [FUERA DE ALCANCE] Menús dinámicos y enlaces. Se usarán rutas fijas en React | N/A |
| RF-02.8 | [FUERA DE ALCANCE] Asignación de menús a roles. Controlado por rutas fijas | N/A |
| RF-02.9 | No permitir eliminar registros con dependencias (mostrar error) | ALTA |
| RF-02.10 | Todas las eliminaciones son **borrado lógico** | ALTA |

### 4.3 RF-03: Recepción en Ventanilla Única

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-03.1 | El usuario Ventanilla Única puede crear un nuevo trámite seleccionando el **tipo de proceso** desde una lista desplegable | ALTA |
| RF-03.2 | Al crear, se despliega el formulario del proceso con los campos configurados para registrar los datos | ALTA |
| RF-03.3 | Generar automáticamente el **número correlativo** (Hoja de Ruta) con el formato: `[CÓDIGO]-[CORRELATIVO]/[GESTIÓN]` (ej: `SV-3/2008`) | ALTA |
| RF-03.4 | Registrar fecha y hora de creación automáticamente | ALTA |
| RF-03.5 | Permitir registrar un **proveído** inicial al crear el trámite | ALTA |
| RF-03.6 | Permitir **adjuntar archivos** (múltiples) al momento de la creación | ALTA |
| RF-03.7 | Generar e imprimir la **Hoja de Ruta** en formato institucional | ALTA |

**Para el flujo unificado (Trámites y Correspondencias):**

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-03.8 | Registrar proceso unificado: destinatario principal, fecha, hora, nro. hojas/anexos, tipo, referencia | ALTA |
| RF-03.9 | Permitir seleccionar **otros destinatarios** adicionales (múltiples) para la derivación libre | ALTA |
| RF-03.10 | Generar Hoja de Ruta unificada con formato institucional, incluyendo: nro. cite, gestión, tipo, remitente, referencia, primer destinatario | ALTA |

### 4.4 RF-04: Escritorio Virtual y Bandejas

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-04.1 | Cada usuario tiene un **escritorio virtual** que muestra sus trámites/correspondencias pendientes | ALTA |
| RF-04.2 | El escritorio muestra pestañas/filtros por: **Trámites Recibidos**, **Trámites Despachados**, **Correspondencias Recibidas**, **Correspondencias Despachadas** | ALTA |
| RF-04.3 | En **Trámites Recibidos** mostrar estados: atendido y por recibir | ALTA |
| RF-04.4 | En **Trámites Despachados** mostrar estados: despachado sin confirmación y despachado confirmado | ALTA |
| RF-04.5 | Cada fila del listado muestra: nro. trámite, remitente, referencias (campos marcados como REFS), actividad actual, y opciones de **Formulario**, **Retroceder**, **Avanzar** | ALTA |
| RF-04.6 | Permitir **filtrar** por número de trámite | ALTA |
| RF-04.7 | Vista de **pendientes agrupados**: resumen semanal (calendario) con conteo por estado (atendido, por recibir, etc.) | MEDIA |
| RF-04.8 | Las correspondencias vencidas (fecha de respuesta pasada) se muestran en **color rojo** | MEDIA |

### 4.5 RF-05: Derivación (Avanzar y Retroceder)

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-05.1 | **Avanzar** un trámite: despachar al siguiente destinatario según el flujo definido | ALTA |
| RF-05.2 | Si el flujo es **lineal o salto**: el avance es directo al presionar "Avanzar" | ALTA |
| RF-05.3 | Si el flujo tiene **bifurcación**: se presenta una pantalla intermedia para elegir el camino (ej: "Aprobado" / "Sin aprobación") | MEDIA |
| RF-05.4 | **Retroceder** un trámite: devolver a la actividad anterior del flujo | ALTA |
| RF-05.5 | Al retroceder, es **obligatorio** registrar una justificación/razón del retroceso | ALTA |
| RF-05.6 | Para correspondencias: al avanzar, el usuario elige el destinatario de una lista de funcionarios | ALTA |
| RF-05.7 | Una correspondencia se puede **archivar** (equivale a concluir) | MEDIA |

### 4.6 RF-06: Proveídos

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-06.1 | En cada actividad/paso, el usuario puede registrar un **proveído** (texto libre) | ALTA |
| RF-06.2 | Se muestra un **historial de proveídos** ordenado cronológicamente, con: remitente, cargo, unidad, fecha, texto del proveído | ALTA |
| RF-06.3 | Para correspondencias, se registra además: instrucción, importancia, fecha de respuesta | MEDIA |
| RF-06.4 | Los proveídos son **inmutables** una vez registrados (no se pueden editar ni eliminar) | ALTA |

### 4.7 RF-07: Adjuntos (Documentos PDF)

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-07.1 | Permitir **adjuntar múltiples archivos** en cada actividad del trámite | ALTA |
| RF-07.2 | Mostrar lista de archivos adjuntos con nombre del archivo y opción de descarga | ALTA |
| RF-07.3 | Permitir **eliminar** adjuntos (borrado lógico) | MEDIA |
| RF-07.4 | Soportar al menos formato **PDF** como tipo principal de adjunto | ALTA |
| RF-07.5 | Mostrar confirmación cuando los archivos se adjuntan correctamente | MEDIA |

### 4.8 RF-08: Hoja de Ruta y Trazabilidad

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-08.1 | Cada trámite genera una **Hoja de Ruta** imprimible con formato institucional configurable | ALTA |
| RF-08.2 | La Hoja de Ruta incluye: nro. correlativo, gestión, fecha, hora, tipo de proceso, remitente, referencia, nro. hojas/anexos, primer destinatario | ALTA |
| RF-08.3 | Generar un **listado del proceso** con: nro. hoja de ruta, referencias, actividad, fecha, campo para firma | ALTA |
| RF-08.4 | Opción de exportar/ver la Hoja de Ruta en **formato PDF** | MEDIA |

**Trazabilidad (Detalle histórico del proceso):**

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-08.5 | Mantener un **detalle histórico** inmutable por cada trámite, registrando por cada actividad: actividad, responsable (nombre + cargo + unidad), tiempo estimado, tiempo transcurrido, proveído, adjuntos | ALTA |
| RF-08.6 | Mostrar **gráfica del flujo**: actividades concluidas (azul) y actividades pendientes (naranja) | MEDIA |
| RF-08.7 | Registrar para cada paso: fecha/hora de recibido, fecha/hora de enviado | ALTA |
| RF-08.8 | Calcular **tiempo transcurrido** (diferencia entre recibido y enviado) | ALTA |
| RF-08.9 | Indicar **"Hasta hoy"** cuando el trámite aún está siendo atendido (sin despachar) | MEDIA |

### 4.9 RF-09: Búsqueda Pública de Trámites

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-09.1 | Desde la página principal (sin autenticación), permitir buscar un trámite ingresando: **Gestión** + **Número de Hoja de Ruta** | ALTA |
| RF-09.2 | El resultado muestra: datos generales, referencias, fecha ingreso, gráfica de flujo, detalle histórico completo | ALTA |
| RF-09.3 | No requiere login — es acceso público para que ciudadanos consulten el estado de su trámite | ALTA |

### 4.10 RF-10: Administración de Trámites (Admin Wayka)

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-10.1 | **Anular** un trámite en estado "En atención": buscar por gestión + código, revisar datos, confirmar anulación | ALTA |
| RF-10.2 | **Habilitar** un trámite concluido: buscar por número, registrar motivo, reactivar el flujo | ALTA |
| RF-10.3 | **Redireccionar** trámites de un usuario a otro: seleccionar tipo de proceso + actividad + usuario origen → elegir actividad destino + usuario destino. Opción de redirigir todos o seleccionar individualmente | ALTA |
| RF-10.4 | **Tipos correlativos**: modificar la configuración de correlativos (por ubicación orgánica o por proceso de negocio) | MEDIA |

### 4.11 RF-11: Bloqueo y Desbloqueo (Ventanilla Única)

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-11.1 | **Bloquear** trámites que no estén en tránsito o despachados sin confirmación | ALTA |
| RF-11.2 | Al bloquear, registrar motivo/proveído del bloqueo | ALTA |
| RF-11.3 | Un trámite bloqueado **no puede ser trabajado** por ningún usuario | ALTA |
| RF-11.4 | **Desbloquear**: buscar por número, registrar motivo, reactivar el trámite | ALTA |

### 4.12 RF-12: Reportes y Transparencia

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-12.1 | **Reporte global**: por rango de fechas, mostrar procesos Iniciados, Movidos (en flujo) y Concluidos con cantidad | ALTA |
| RF-12.2 | **Búsqueda por proceso**: buscar por nro. de proceso o entre fechas. Mostrar actividad actual, datos, responsable, fecha ingreso | ALTA |
| RF-12.3 | **Búsqueda por campos**: seleccionar tipo de proceso + campo + valor. Mostrar resultados con datos referenciales | MEDIA |
| RF-12.4 | **Por estado y fechas**: buscar trámites entre fechas, filtrar por estado (todos, en atención, concluido, por recibir, etc.) | MEDIA |
| RF-12.5 | **Vista ejecutiva** (confidencial): búsqueda que muestra todos los campos del formulario del trámite | MEDIA |
| RF-12.6 | **Conteo por estado y fechas**: cantidad de trámites por tipo de proceso y estado en un rango de fechas | MEDIA |
| RF-12.7 | **Pendientes por funcionario**: seleccionar funcionario, ver resumen semanal de sus trámites por estado | ALTA |
| RF-12.8 | **Trámites atendidos por funcionario**: buscar por área + rango de fechas, listar funcionarios con proceso y cantidad atendidos | MEDIA |
| RF-12.9 | **Resumen detallado**: por gestión y tipo de proceso, listar trámites con datos generales, flujo gráfico e historial | MEDIA |
| RF-12.10 | **Procesos concluidos**: por tipo de proceso, listar trámites que finalizaron su flujo con detalle completo | MEDIA |

---

## 5. REQUERIMIENTOS NO FUNCIONALES Y REGLAS DE NEGOCIO

### 5.1 Generación de correlativos

| Regla | Descripción |
|---|---|
| **Formato** | `[CÓDIGO_PROCESO]-[NÚMERO_SECUENCIAL]/[GESTIÓN]` (ej: `SV-5/2008`, `CM-11/2008`) |
| **Tipos** | Dos modalidades: **Por ubicación orgánica** (correlativo global de la oficina) o **Por proceso de negocio** (correlativo por tipo de trámite) |
| **Auto-incremento** | El número secuencial se incrementa automáticamente al crear un nuevo trámite |
| **Gestión** | Es el año fiscal/calendario vigente. Se reinicia el correlativo al cambiar de gestión |
| **Unicidad** | El correlativo debe ser **único** dentro de la combinación proceso + gestión |
| **Inmutabilidad** | Una vez generado, el correlativo **no se puede modificar** |

### 5.2 Inmutabilidad del historial

| Regla | Descripción |
|---|---|
| **Historial** | El detalle histórico del proceso (actividad, responsable, tiempos, proveídos) es **inmutable** y de solo inserción (append-only) |
| **Proveídos** | Una vez registrado un proveído, no se puede editar ni eliminar |
| **Fechas** | Las fechas de recibido, enviado, creación son generadas por el sistema y no editables por el usuario |
| **Auditoría** | Cada movimiento registra: quién lo hizo (usuario), cuándo (timestamp), desde dónde (ubicación orgánica), qué acción (avanzar, retroceder, bloquear, etc.) |

### 5.3 Filtros por JWT / Oficina

| Regla | Descripción |
|---|---|
| **Sesión autenticada** | Usar **JWT (JSON Web Token)** para gestionar la sesión del usuario autenticado |
| **Token payload** | El JWT debe incluir: `userId`, `roleId`, `roleName`, `ubicacionOrgId`, `ubicacionOrgNombre`, `filtro`, `fechaExpiracion` |
| **Filtro por oficina** | Un usuario solo ve en su escritorio virtual los trámites asignados a **su ubicación orgánica** o específicamente a **su usuario** |
| **Filtro en reportes** | Los reportes del Funcionario y Ventanilla Única se filtran por la ubicación orgánica del usuario. El Admin Wayka ve todas las oficinas |
| **Expiración** | Si la fecha de expiración del usuario-rol ha pasado, denegar el acceso al sistema |
| **Multi-rol** | Si el usuario tiene múltiples roles, al ingresar se activa el rol con el que se autenticó; los menús se filtran según ese rol |

### 5.4 Reglas de negocio generales

| # | Regla |
|---|---|
| 1 | Todas las eliminaciones son **borrado lógico** (soft delete con campo `activo` o `eliminado`) |
| 2 | No se puede eliminar un registro si existen **dependencias** (ej: no eliminar un rol si hay usuarios asignados) |
| 3 | Los campos marcados como **REFS** (referencias) en el formulario son los que se muestran en listados y búsquedas como resumen del trámite |
| 4 | Los campos obligatorios deben ser validados antes de aceptar el formulario; mostrar mensaje de error si faltan |
| 5 | El **tiempo estimado** de cada actividad se configura en días, horas y/o minutos al diseñar el proceso |
| 6 | El **tiempo transcurrido** se calcula automáticamente desde el momento de recepción hasta el despacho |
| 7 | Las correspondencias cuya **fecha de respuesta** ha vencido se resaltan en **rojo** en el escritorio |
| 8 | El formato de fecha es `DD/MM/YYYY` y de hora `HH:MM` |
| 9 | La **gestión** es el año actual y se usa como filtro global en búsquedas y generación de correlativos |
| 10 | Los datos de confirmación deben mostrarse antes de cualquier operación de escritura (patrón: "Siguiente → Confirme los datos → Aceptar") |

### 5.5 Requerimientos no funcionales técnicos

| Aspecto | Requisito para el MVP |
|---|---|
| **Arquitectura** | SPA (Frontend) + API REST (Backend) |
| **Autenticación** | JWT con tokens de acceso y refresh |
| **Base de datos** | Relacional (MySQL Server 8.0+ estrictamente requerido) |
| **Almacenamiento archivos** | Sistema de archivos del servidor o servicio de storage (S3/MinIO) |
| **Navegadores** | Soporte para navegadores modernos (Chrome, Firefox, Edge) |
| **Responsividad** | Diseño responsive para uso en escritorio (no se requiere mobile en MVP) |
| **Performance** | Paginación en listados (la legacy usaba paginación de 10-20 registros) |
| **Seguridad** | Claves encriptadas, JWT con expiración, HTTPS en producción |
| **Idioma** | Interfaz en español |

---

## 6. MODELO DE DATOS CONCEPTUAL (Alto Nivel)

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐
│   Persona   │───>│   Usuario    │───>│ Usuario_Rol   │
│             │    │              │    │               │
│ nombre      │    │ login        │    │ rol_id        │
│ apellido    │    │ clave (hash) │    │ ubicacion_id  │
│ ci          │    │ persona_id   │    │ nivel_acceso  │
│ sexo        │    │ activo       │    │ fecha_expir   │
│ email       │    └──────────────┘    │ filtro        │
│ telefono    │                        └───────────────┘
└─────────────┘                               │
                                              v
┌─────────────────┐    ┌──────────────┐
│ Ubicacion_Org   │    │     Rol      │
│                 │    │              │
│ nombre          │    │ nombre       │
│ codigo          │    │ descripcion  │
│ padre_id (FK)   │    │              │
│ nivel           │    └──────────────┘
└─────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│ Tipo_Proceso    │───>│    Tramite       │───>│  Movimiento       │
│                 │    │                  │    │  (Historial)      │
│ nombre          │    │ correlativo      │    │                   │
│ codigo          │    │ gestion          │    │ tramite_id        │
│ area_id         │    │ tipo_proceso_id  │    │ actividad_nombre  │
│ correlativo_seq │    │ estado           │    │ usuario_id        │
│                 │    │ fecha_creacion   │    │ ubicacion_org_id  │
└─────────────────┘    │ creado_por       │    │ estado            │
                       │ ubicacion_org_id │    │ fecha_recepcion   │
                       └──────────────────┘    │ fecha_envio       │
                                               │ tiempo_estimado   │
                                               │ proveido          │
                                               │ orden             │
                                               └───────────────────┘

┌──────────────────┐    ┌──────────────────┐
│    Adjunto       │    │   Correspondencia│
│                  │    │                  │
│ movimiento_id    │    │ correlativo      │
│ nombre_archivo   │    │ destinatario_id  │
│ ruta_archivo     │    │ remitente        │
│ tipo_mime        │    │ referencia       │
│ fecha_subida     │    │ tipo_corres      │
│ subido_por       │    │ nro_hojas        │
│ activo           │    │ instruccion      │
└──────────────────┘    │ fecha_respuesta  │
                        │ estado           │
                        └──────────────────┘
```

---

## 7. VARIABLES PREDEFINIDAS DEL SISTEMA (para informes/plantillas)

El sistema legado utiliza **variables de sustitución** con formato `##variable##` en informes y hojas de ruta. El MVP debe soportar al menos las siguientes:

| Variable | Descripción |
|---|---|
| `##tipo_proceso##` | Nombre del tipo de proceso |
| `##correlativo##` | Número correlativo del trámite |
| `##gestion##` | Año/gestión del trámite |
| `##fecha_inicio##` | Fecha de inicio (DD/MM/YYYY) |
| `##fechainiciof##` | Fecha de inicio en formato largo ("13 de Septiembre de 2008") |
| `##hora_inicio##` | Hora de inicio del trámite |
| `##fecha_actual##` | Fecha actual del sistema |
| `##hora_actual##` | Hora actual del sistema |
| `##nombre_usuario##` | Nombre del usuario que atiende |
| `##unidad##` | Unidad del usuario que atiende |
| `##proveido##` | Último proveído registrado |
| `##destinatario##` | Nombre del destinatario |
| `##unidad_destino##` | Unidad del destinatario |
| `##cargo_destino##` | Cargo del destinatario |
| `##unidad_remitente##` | Unidad del remitente |
| `##cargo_remitente##` | Cargo del remitente |

---

## 8. RESUMEN DE PRIORIZACIÓN PARA MVP (3 meses / 1 desarrollador)

**Cronograma:** 01 de Septiembre al 19 de Noviembre (6 Sprints de 2 semanas)

### Sprint 1 (01 Sep - 14 Sep): Fundación
- [x] Configuración del entorno (React + backend) y BD MySQL 8.0+
- [x] Modelo de datos y migraciones (flujo unificado)
- [ ] Autenticación JWT (login, logout, cambio clave)
- [ ] CRUD Personas, Usuarios, Roles, Usuario-Rol
- [ ] CRUD Ubicaciones Orgánicas (organigrama)

### Sprint 2 (15 Sep - 28 Sep): Core del proceso
- [ ] CRUD Tipos de Proceso (preconfigurable)
- [ ] Crear trámite/correspondencia unificado (Ventanilla Única)
- [ ] Generación automática de correlativo
- [ ] Registro de proveídos iniciales
- [ ] Adjuntar/descargar archivos

### Sprint 3 (29 Sep - 12 Oct): Flujo directo de trabajo
- [ ] Escritorio Virtual con bandejas (pendientes, recibidos, despachados)
- [ ] Derivación libre (Avanzar) con selección de destinatarios
- [ ] Retroceder proceso (con justificación)
- [ ] Recepcionar proceso
- [ ] Detalle histórico del proceso (trazabilidad y auditoría)

### Sprint 4 (13 Oct - 26 Oct): Administración y Hoja de Ruta
- [ ] Bloquear / Desbloquear procesos
- [ ] Anular proceso (Admin Wayka)
- [ ] Habilitar proceso concluido
- [ ] Redireccionar procesos entre usuarios
- [ ] Generación de Hoja de Ruta imprimible (HTML/PDF)

### Sprint 5 (27 Oct - 09 Nov): Reportes y Transparencia
- [ ] Búsqueda pública de trámites (sin login) mediante Hoja de Ruta
- [ ] Reporte global (iniciados, movidos, concluidos)
- [ ] Pendientes por funcionario
- [ ] Búsqueda por proceso y por estado/fechas

### Sprint 6 (10 Nov - 19 Nov): Pruebas y Despliegue
- [ ] Trámites concluidos y reportes confidenciales
- [ ] Revisión de rutas fijas (React) según permisos de rol
- [ ] Pruebas integrales y auditoría de seguridad
- [ ] Corrección de bugs y estabilización final
- [ ] Despliegue a producción

---

> **NOTA:** Este documento es un contexto vivo. Debe ser actualizado conforme se tomen decisiones de diseño e implementación durante el desarrollo del MVP.
