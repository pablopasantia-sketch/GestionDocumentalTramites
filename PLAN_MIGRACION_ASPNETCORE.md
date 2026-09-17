# PLAN ESTRATÉGICO DE MIGRACIÓN: BACKEND A ASP.NET CORE (.NET 8)

> **Proyecto:** WAYKA — Sistema de Gestión Documental y Workflow Institucional  
> **Destinatario:** Estudiante en Práctica Laboral & Ingeniero Responsable de la Institución  
> **Fecha:** Septiembre de 2026  
> **Versión Objetivo:** ASP.NET Core Web API (.NET 8 LTS) + Entity Framework Core + MySQL 8  

---

## 1. Justificación y Objetivos

La institución responsable utiliza el ecosistema **Microsoft .NET (C#)** como estándar técnico oficial. Para facilitar la transferencia tecnológica, mantenimiento a largo plazo y la colaboración con el equipo de ingenieros de la entidad, se define la migración del backend desde Node.js/Express hacia **ASP.NET Core (.NET 8 Web API)**.

### Objetivos Clave:
1. **Cero impacto en la Base de Datos:** Mantener intacta la base de datos MySQL 8 (`wayka_db`), sus tablas, restricciones, procedimientos y datos existentes.
2. **Cero impacto en el Frontend:** Preservar la compatibilidad 100% con el frontend React 19 y sus llamadas API REST mediante los mismos contratos JSON (`{ success, data, message }`).
3. **Estrategia No Destructiva:** Desarrollar el nuevo backend en una carpeta paralela (`backend-dotnet/`), manteniendo el backend actual en Node.js como referencia funcional y respaldo hasta que .NET esté completamente validado.
4. **Documentación Swagger / OpenAPI nativa:** Proporcionar una consola interactiva para que los desarrolladores de la institución puedan probar y extender los endpoints fácilmente.

---

## 2. Arquitectura del Backend en .NET 8

Se adopta un patrón **Web API N-Tier desacoplado**, limpio y estándar para la industria:

```
backend-dotnet/
├── Wayka.sln                           # Solución global de Visual Studio / VS Code
└── Wayka.Api/
    ├── Program.cs                      # Configuración de pipeline, CORS, JWT, Swagger y DI
    ├── appsettings.json                # Cadena de conexión MySQL, parámetros JWT
    ├── appsettings.Development.json
    ├── Data/
    │   └── WaykaDbContext.cs           # DbContext de EF Core (mapeo con MySQL 8)
    ├── Entities/                       # Entidades del Modelo Relacional
    │   ├── Persona.cs
    │   ├── Usuario.cs
    │   ├── Rol.cs
    │   ├── UsuarioRol.cs
    │   ├── UbicacionOrg.cs
    │   ├── TipoProceso.cs
    │   ├── Correlativo.cs
    │   ├── Tramite.cs
    │   ├── Movimiento.cs
    │   ├── Adjunto.cs
    │   └── Parametro.cs
    ├── DTOs/                           # Data Transfer Objects
    │   ├── Common/ApiResponse.cs       # Estructura unificada de respuesta
    │   ├── Auth/                       # LoginRequest, ChangePasswordRequest, UserSessionDto
    │   ├── Personas/                   # PersonaCreateDto, PersonaUpdateDto
    │   ├── Usuarios/                   # UsuarioCreateDto, ResetPasswordDto
    │   ├── Ubicaciones/                # UbicacionDto, UbicacionNodoArbolDto
    │   └── Tramites/                   # TramiteConsultaPublicaDto, TramiteAnularDto
    ├── Services/                       # Lógica de Negocio
    │   ├── IAuthService.cs             # Generación de JWT, claims y verificación BCrypt
    │   ├── AuthService.cs
    │   ├── ICorrelativoService.cs      # Generación atómica secuencial de correlativos
    │   └── CorrelativoService.cs
    ├── Middlewares/
    │   └── ErrorHandlerMiddleware.cs   # Manejo global de excepciones con respuesta JSON
    └── Controllers/                    # Controladores REST API
        ├── AuthController.cs           # /api/auth
        ├── PersonasController.cs       # /api/personas
        ├── UsuariosController.cs       # /api/usuarios
        ├── RolesController.cs          # /api/roles
        ├── UsuarioRolesController.cs   # /api/usuario-roles
        ├── UbicacionesController.cs    # /api/ubicaciones
        ├── TramitesController.cs       # /api/tramites
        ├── TiposProcesoController.cs   # /api/tipos-proceso
        └── HealthController.cs         # /api/health
```

---

## 3. Matriz de Equivalencias Tecnológicas

| Componente | Backend Actual (Node.js) | Nuevo Backend (.NET 8) | Beneficio |
|---|---|---|---|
| **Lenguaje** | JavaScript (Node.js 24) | C# 12 (.NET 8 LTS) | Tipado fuerte, detección de errores en compilación |
| **Framework Web** | Express.js 4 | ASP.NET Core Web API | Rendimiento extremo, inyección de dependencias nativa |
| **Acceso a Datos** | `mysql2/promise` (SQL manual) | `Pomelo.EntityFrameworkCore.MySql` | ORM robusto, LINQ, transacciones atómicas seguras |
| **Autenticación** | `jsonwebtoken` | `Microsoft.AspNetCore.Authentication.JwtBearer` | Middleware de seguridad estándar de Microsoft |
| **Hash de Contraseñas** | `bcryptjs` | `BCrypt.Net-Next` | 100% compatible con los hashes `$2a$10$...` ya guardados |
| **Documentación** | Manual / Markdown | `Swashbuckle.AspNetCore` (Swagger) | Interfaz visual interactiva en `/swagger` |
| **Manejo de CORS** | `cors` middleware | Políticas CORS nativas de ASP.NET Core | Integración fluida con el frontend Vite React |

---

## 4. Cronograma de Implementación y Fases

### Fase 1: Entorno de Desarrollo y Creación de la Solución
- [ ] Instalación de .NET 8.0 SDK en el sistema Fedora Linux.
- [ ] Creación de la solución `Wayka.sln` y proyecto `Wayka.Api`.
- [ ] Instalación de paquetes NuGet requeridos:
  - `Pomelo.EntityFrameworkCore.MySql` (v8.x)
  - `Microsoft.EntityFrameworkCore.Design`
  - `Microsoft.AspNetCore.Authentication.JwtBearer`
  - `BCrypt.Net-Next`
  - `Swashbuckle.AspNetCore`
- [ ] Configuración de `appsettings.json` (Conexión a MySQL `127.0.0.1:3306`, secreto JWT y CORS).

### Fase 2: Mapeo de Base de Datos y Entidades EF Core
- [ ] Creación de las 11 entidades en `Entities/` respetando nombres de columnas y tipos exactos de MySQL.
- [ ] Configuración del `WaykaDbContext` (relaciones 1 a N, llaves foráneas y borrado lógico).
- [ ] Implementación de `HealthController` para verificar conexión exitosa a MySQL.

### Fase 3: Seguridad, Autenticación y Multi-Rol (RF-01)
- [ ] Implementación de `AuthService`:
  - `LoginAsync`: Validación de credenciales con `BCrypt.Verify`, carga de roles activos y selección de rol principal.
  - `GenerateJwtToken`: Emisión de token JWT con Claims (`UserId`, `Username`, `RolId`, `RolCodigo`, `UbicacionOrgId`).
  - `SwitchRoleAsync`: Emisión de nuevo token al alternar rol activo.
  - `ChangePasswordAsync`: Verificación de clave actual y validación de reglas de PIN/contraseña.
- [ ] Configuración de autenticación JWT Bearer en `Program.cs`.
- [ ] Creación de `AuthController` con endpoints `/login`, `/profile`, `/change-password`, `/switch-role`.

### Fase 4: Controladores Administrativos (RF-02)
- [ ] `PersonasController`: Listado con filtro, creación con validación de CI, actualización y baja lógica.
- [ ] `UsuariosController`: Listado, alta de cuenta, reseteo de contraseña con BCrypt y baja.
- [ ] `RolesController`: Listado del catálogo institucional de roles.
- [ ] `UsuarioRolesController`: Asignación de rol con ubicación orgánica, desasignación y marcado de rol principal.
- [ ] `UbicacionesController`: CRUD de unidades orgánicas y endpoint recursivo para el árbol jerárquico (`/arbol`).

### Fase 5: Servicios de Trámites, Tipos de Proceso y Seguimiento Cívico (RF-09 / RF-10)
- [ ] `TiposProcesoController`: CRUD de trámites preconfigurables y plazos SLA.
- [ ] `CorrelativoService`: Transacción atómica para incremento y formateo de correlativos `{CODIGO}-{NUMERO}/{GESTION}`.
- [ ] `TramitesController`:
  - `/api/tramites/public/consulta`: Consulta ciudadana sin login (RF-09.1) retornando datos y línea de tiempo de movimientos.
  - `/api/tramites`: Listado general con filtros de estado y búsqueda.
  - `/api/tramites/stats`: Resumen estadístico por gestión.
  - `/api/tramites/{id}/anular`: Operación especial del Administrador de Wayka con justificación obligatoria.

### Fase 6: Pruebas de Integración y Conexión Frontend
- [ ] Validación de todos los endpoints mediante Swagger UI (`http://localhost:5000/swagger`).
- [ ] Ejecución de suite de pruebas de autenticación.
- [ ] Conexión del frontend React modificando `VITE_API_URL` hacia el puerto de .NET (ej. `http://localhost:5000/api`).
- [ ] Validación integral de la navegación, inicio de sesión, cambio de rol, administración y buscador ciudadano.

---

## 5. Instrucciones Rápidas para el Ingeniero Responsable

Una vez finalizada la migración, para ejecutar y compilar el proyecto en cualquier entorno (Linux, Windows con Visual Studio o Docker):

```bash
# 1. Navegar al directorio del backend .NET
cd backend-dotnet/Wayka.Api

# 2. Restaurar dependencias NuGet
dotnet restore

# 3. Compilar la solución
dotnet build

# 4. Ejecutar el servidor de desarrollo
dotnet run --launch-profile https
```

* El servidor levantará en `http://localhost:5000` (o `https://localhost:5001`).
* La documentación interactiva Swagger estará accesible en `http://localhost:5000/swagger`.
