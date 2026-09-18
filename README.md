# Sistema de Gestión Documental y Trámites — Concejo Municipal de Sucre

Sistema institucional de control, seguimiento y trazabilidad de expedientes, correspondencia interna/externa y trámites administrativos del **Concejo Municipal de Sucre**.

---

## 🏛️ Arquitectura Tecnológica

| Componente | Tecnología | Descripción |
|---|---|---|
| **Base de Datos** | Microsoft SQL Server 2022 (Linux) | Contenedor oficial en Docker, base institucional `DBNotasCMS` |
| **Backend** | .NET 8 Web API (C#) | Entity Framework Core con `Microsoft.EntityFrameworkCore.SqlServer`, JWT, BCrypt, arquitectura en capas |
| **Frontend** | React 19 + Vite | SPA moderna, React Router v7, Lucide Icons, diseño accesible con estética institucional |
| **Infraestructura** | Docker & Docker Compose | Orquestación contenerizada con persistencia en volúmenes |

---

## 📋 Requisitos Previos

- **Docker** (v24+ o Docker Desktop) y **Docker Compose** (v2+).
- **.NET 8 SDK** instalado localmente (`dotnet --version` >= 8.0.x).
- **Node.js** (v18+ o v20+) y **npm**.

---

## 🚀 Guía Rápida de Despliegue Local

### 1. Iniciar la Base de Datos (Microsoft SQL Server en Docker)

En la raíz del repositorio, ejecuta:

```bash
# Iniciar el contenedor en segundo plano
docker compose up -d

# Verificar que el contenedor esté corriendo y saludable
docker ps
```

> **Parámetros del contenedor**:
> - **Puerto**: `1433`
> - **Usuario SA**: `sa`
> - **Contraseña SA**: `SqlAdminSucre2026!`
> - **Base de datos principal**: `DBNotasCMS`

---

### 2. Inicializar y Sembrar la Base de Datos (.NET CLI)

Una vez que el contenedor de SQL Server esté arriba, entra al directorio del backend para inicializar las tablas y datos semilla:

```bash
cd backend-dotnet/GestionDocumental.Api

# 1. Crear la base de datos y ejecutar todas las migraciones pendientes
dotnet run -- db:init

# 2. Insertar los datos semilla (usuarios, roles, organigrama y tablas institucionales)
dotnet run -- db:seed
```

---

### 3. Iniciar el Backend (.NET 8 Web API)

Desde `backend-dotnet/GestionDocumental.Api`:

```bash
dotnet run --launch-profile http
```

- **API Base URL**: `http://localhost:5000`
- **Swagger / OpenAPI**: `http://localhost:5000/swagger`
- **Health Check**: `http://localhost:5000/api/health`

---

### 4. Iniciar el Frontend (React + Vite)

Abre otra terminal y navega al directorio `frontend`:

```bash
cd frontend

# Instalar dependencias si es la primera vez
npm install

# Iniciar servidor de desarrollo Vite
npm run dev
```

- **URL de la aplicación**: `http://localhost:5173`

---

## 🛠️ Comandos CLI de Base de Datos (.NET)

El backend incorpora un ejecutor de migraciones y gestión de base de datos integrado por línea de comandos. Ejecútalos dentro de `backend-dotnet/GestionDocumental.Api`:

| Comando | Descripción |
|---|---|
| `dotnet run -- db:init` | Crea la base de datos `DBNotasCMS` si no existe y aplica todas las migraciones T-SQL pendientes. |
| `dotnet run -- db:seed` | Inserta datos semilla estándar (roles, usuarios, organigrama, y catálogo institucional `TUnidad`, `TCargo`, `TEmpleados`). |
| `dotnet run -- migrate:status` | Muestra una tabla detallada con el estado (APLICADA / PENDIENTE), batch y fecha de cada script de migración. |
| `dotnet run -- migrate:up` | Aplica únicamente las migraciones que aún no se hayan ejecutado. |
| `dotnet run -- migrate:reset` | **Peligro:** Elimina todas las tablas de la base de datos y las vuelve a crear aplicando todas las migraciones desde cero. |

---

## 🐳 Gestión del Contenedor Docker de Base de Datos

### Ver registros (logs) del contenedor:
```bash
docker compose logs -f sqlserver
```

### Detener el contenedor:
```bash
docker compose stop
```

### Reiniciar el contenedor:
```bash
docker compose restart
```

### Detener y eliminar contenedor (conservando los datos del volumen):
```bash
docker compose down
```

### Eliminar contenedor y volumen de datos (reinicio limpio total):
```bash
docker compose down -v
```

---

### Consultar SQL Server directamente con `sqlcmd` dentro del contenedor

Puedes ejecutar consultas SQL directamente en la base de datos mediante la herramienta de línea de comandos incluida en el contenedor:

```bash
# Conectarse a la base de datos DBNotasCMS e interactuar interactivamente:
docker exec -it gestion_documental_mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'SqlAdminSucre2026!' -C -d DBNotasCMS

# Ejemplo de consulta directa: Listar tablas existentes
docker exec -it gestion_documental_mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'SqlAdminSucre2026!' -C -d DBNotasCMS -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';"

# Ejemplo: Consultar las unidades institucionales
docker exec -it gestion_documental_mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'SqlAdminSucre2026!' -C -d DBNotasCMS -Q "SELECT CodU, NombU, Activo FROM dbo.TUnidad;"
```

---

## 🔑 Credenciales por Defecto del Sistema

El comando `dotnet run -- db:seed` crea las siguientes cuentas de prueba:

| Usuario | Contraseña | Roles Asignados | Unidad Asignada |
|---|---|---|---|
| `admin` | `admin123` | `ADMIN_SISTEMA`, `ADMIN_TRAMITES` | Unidad de Tecnologías y Sistemas (UTIC) |
| `mfernandez` | `admin123` | `VENTANILLA_UNICA` | Ventanilla Única de Correspondencia (VU) |
| `cmamani` | `admin123` | `FUNCIONARIO` | Unidad de Tecnologías y Sistemas (UTIC) |

---

## 📁 Estructura del Repositorio

```
.
├── backend-dotnet/
│   └── GestionDocumental.Api/
│       ├── Controllers/          # Endpoints REST (Auth, Personas, Ubicaciones, Institucional...)
│       ├── Data/                 # AppDbContext, DatabaseManager y Migraciones T-SQL
│       │   └── Migrations/       # Scripts 001 a 012 (incluyendo tablas DBNotasCMS)
│       ├── DTOs/                 # Objetos de transferencia de datos validados
│       ├── Entities/             # Modelos de EF Core (Persona, Usuario, TUnidad, TCargo, TEmpleado...)
│       ├── Services/             # Lógica de negocio (AuthService, Jwt...)
│       ├── appsettings.json      # Cadena de conexión y configuración JWT/CORS
│       └── Program.cs            # Punto de entrada de la API y comandos CLI
├── frontend/
│   ├── src/
│   │   ├── components/           # Componentes reutilizables (Sidebar, Navbar, Modales...)
│   │   ├── pages/                # Vistas principales (Login, Usuarios, Personas, Organigrama...)
│   │   ├── services/             # Clientes HTTP Axios con interceptores JWT
│   │   └── index.css             # Estilos del sistema de diseño institucional
│   └── package.json
├── docker-compose.yml            # Orquestación de Microsoft SQL Server 2022
├── TablasDBNotas/                # Scripts originales T-SQL provistos por la institución
└── REQUERIMIENTOS_WAYKA_ANALISIS.md # Especificación funcional y matriz de requerimientos
```
