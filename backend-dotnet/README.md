# Backend API — Gestión Documental y Trámites (.NET 8 LTS)

Este proyecto es la implementación oficial del backend del **Sistema de Gestión Documental y Trámites**, desarrollado en **ASP.NET Core (.NET 8 Web API)** con **C#** y **Entity Framework Core (Pomelo MySQL 8)** para la Municipalidad de Sucre.

---

## 🏛️ Arquitectura del Proyecto

```
backend-dotnet/
├── GestionDocumental.sln               # Solución principal de .NET
└── GestionDocumental.Api/
    ├── Program.cs                      # Configuración de servicios, DI, CORS, JWT y Swagger
    ├── appsettings.json                # Cadena de conexión MySQL y configuración de JWT
    ├── Data/
    │   └── AppDbContext.cs           # DbContext con mapeo relacional de MySQL 8
    ├── Entities/                       # 11 Entidades de dominio mapeadas con MySQL
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
    ├── DTOs/                           # Data Transfer Objects (Request / Response)
    ├── Services/                       # Servicios de lógica de negocio (Auth, JWT, etc.)
    │   ├── IAuthService.cs
    │   └── AuthService.cs
    └── Controllers/                    # Endpoints REST API
        ├── AuthController.cs           # /api/auth (login, profile, switch-role, change-password)
        ├── PersonasController.cs       # /api/personas
        ├── UsuariosController.cs       # /api/usuarios
        ├── RolesController.cs          # /api/roles
        ├── UsuarioRolesController.cs   # /api/usuario-roles
        ├── UbicacionesController.cs    # /api/ubicaciones & árbol jerárquico (/arbol)
        ├── TramitesController.cs       # /api/tramites & consulta pública (/public/consulta)
        ├── TiposProcesoController.cs   # /api/tipos-proceso
        └── HealthController.cs         # /api/health
```

---

## 🚀 Requisitos Previos

- **.NET 8.0 SDK** (o superior) instalado en el sistema.
- **MySQL 8.0+** corriendo en `127.0.0.1:3306` con la base de datos configurada en `appsettings.json`.

---

## ⚙️ Instrucciones de Ejecución

### 1. Desde Terminal (Linux / Windows / macOS):

```bash
# Navegar a la carpeta del proyecto API
cd backend-dotnet/GestionDocumental.Api

# Restaurar dependencias NuGet
dotnet restore

# Compilar el proyecto
dotnet build

# Ejecutar el servidor de desarrollo
dotnet run --launch-profile http
```

El servidor estará escuchando en:
- **API URL:** `http://localhost:5000`
- **Consola Interactiva Swagger:** `http://localhost:5000/swagger`

---

## 🔐 Autenticación y Credenciales Semilla

El sistema utiliza autenticación **JWT Bearer**. Para probar en Swagger:
1. Realizar una petición a `POST /api/auth/login` con:
   - **Usuario:** `admin`
   - **Contraseña:** `admin123`
2. Copiar el token generado en `data.token`.
3. Hacer clic en el botón superior verde **Authorize** en Swagger e ingresar `Bearer {tu_token}`.

---

## 🧪 Pruebas Automatizadas

Todos los endpoints han sido validados con una suite automatizada de pruebas de integración cubriendo:
- Conexión a Base de Datos (`/api/health`).
- Autenticación JWT y compatibilidad de hashes BCrypt (`/api/auth/login`).
- Cambio de rol activo Multi-Rol (`/api/auth/switch-role`).
- Perfil autenticado (`/api/auth/profile`).
- CRUD completo de Personas, Usuarios, Roles y Organigrama.
- Generación de árbol jerárquico recursivo (`/api/ubicaciones/arbol`).
- Consulta pública ciudadana sin login con trazabilidad (RF-09.1).
- Supervisión y estadísticas de trámites.
