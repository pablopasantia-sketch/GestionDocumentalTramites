using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using BCrypt.Net;

namespace GestionDocumental.Api.Data
{
    public class DatabaseManager
    {
        private readonly string _connectionString;
        private readonly string _databaseName;
        private readonly string _migrationsDir;

        public DatabaseManager(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? "Server=127.0.0.1,1433;Database=DB_TRAMITES_EXTERNOS;User Id=sa;Password=SqlAdminSucre2026!;TrustServerCertificate=True;MultipleActiveResultSets=True;";
            
            var builder = new SqlConnectionStringBuilder(_connectionString);
            _databaseName = string.IsNullOrWhiteSpace(builder.InitialCatalog) ? "DB_TRAMITES_EXTERNOS" : builder.InitialCatalog;

            // Carpeta de migraciones
            var baseDir = AppContext.BaseDirectory;
            var candidates = new[]
            {
                Path.Combine(baseDir, "Data", "Migrations"),
                Path.Combine(Directory.GetCurrentDirectory(), "Data", "Migrations"),
                Path.Combine(Directory.GetCurrentDirectory(), "GestionDocumental.Api", "Data", "Migrations")
            };

            _migrationsDir = candidates.FirstOrDefault(Directory.Exists) ?? Path.Combine(Directory.GetCurrentDirectory(), "Data", "Migrations");
        }

        private SqlConnection GetMasterConnection()
        {
            var builder = new SqlConnectionStringBuilder(_connectionString)
            {
                InitialCatalog = "master" // Conexión a nivel base master
            };
            return new SqlConnection(builder.ConnectionString);
        }

        private SqlConnection GetDatabaseConnection()
        {
            var builder = new SqlConnectionStringBuilder(_connectionString)
            {
                InitialCatalog = _databaseName
            };
            return new SqlConnection(builder.ConnectionString);
        }

        public async Task<bool> EnsureDatabaseExistsAsync()
        {
            using var conn = GetMasterConnection();
            await conn.OpenAsync();

            var sql = $@"
                IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '{_databaseName}')
                BEGIN
                    CREATE DATABASE [{_databaseName}];
                END";
            using var cmd = new SqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
            return true;
        }

        public async Task<bool> EnsureMigrationTableAsync()
        {
            await EnsureDatabaseExistsAsync();

            using var conn = GetDatabaseConnection();
            await conn.OpenAsync();

            var sql = @"
                IF OBJECT_ID(N'dbo._migrations', N'U') IS NULL
                BEGIN
                    CREATE TABLE dbo._migrations (
                      id INT IDENTITY(1,1) PRIMARY KEY,
                      name NVARCHAR(255) NOT NULL,
                      batch INT NOT NULL DEFAULT 1,
                      executed_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                      CONSTRAINT uk_migration_name UNIQUE (name)
                    );
                END;";

            using var cmd = new SqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
            return true;
        }

        /// <summary>
        /// db:init - Inicializa la base de datos y ejecuta todas las migraciones pendientes
        /// </summary>
        public async Task InitDbAsync()
        {
            Console.WriteLine("\n============================================================");
            Console.WriteLine($"🚀 INICIALIZANDO BASE DE DATOS (SQL SERVER): {_databaseName}");
            Console.WriteLine("============================================================");

            await EnsureDatabaseExistsAsync();
            Console.WriteLine($"✅ Base de datos '{_databaseName}' verificada/creada.");

            await EnsureMigrationTableAsync();
            Console.WriteLine("✅ Tabla de control de migraciones `_migrations` lista.");

            await MigrateUpAsync();

            // Listar tablas creadas
            using var conn = GetDatabaseConnection();
            await conn.OpenAsync();

            using var cmd = new SqlCommand("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;", conn);
            using var reader = await cmd.ExecuteReaderAsync();

            Console.WriteLine($"\n📋 Tablas presentes en '{_databaseName}':");
            int count = 0;
            while (await reader.ReadAsync())
            {
                count++;
                Console.WriteLine($"   {count}. {reader.GetString(0)}");
            }

            Console.WriteLine("\n🎉 ¡Inicialización de Base de Datos completada exitosamente!");
            Console.WriteLine("============================================================\n");
        }

        /// <summary>
        /// migrate / migrate:up - Ejecuta las migraciones SQL pendientes en orden cronológico
        /// </summary>
        public async Task<int> MigrateUpAsync()
        {
            Console.WriteLine("\n============================================================");
            Console.WriteLine($"⚙️  EJECUTOR DE MIGRACIONES — {_databaseName}");
            Console.WriteLine("============================================================");

            await EnsureMigrationTableAsync();

            if (!Directory.Exists(_migrationsDir))
            {
                Console.WriteLine($"⚠️ Directorio de migraciones no encontrado: {_migrationsDir}");
                return 0;
            }

            var files = Directory.GetFiles(_migrationsDir, "*.sql")
                .Select(Path.GetFileName)
                .Where(f => !string.IsNullOrEmpty(f))
                .OrderBy(f => f)
                .ToList();

            using var conn = GetDatabaseConnection();
            await conn.OpenAsync();

            var applied = new HashSet<string>();
            int currentBatch = 1;

            using (var cmd = new SqlCommand("SELECT name, batch FROM dbo._migrations;", conn))
            using (var reader = await cmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    applied.Add(reader.GetString(0));
                    int b = reader.GetInt32(1);
                    if (b >= currentBatch) currentBatch = b + 1;
                }
            }

            var pending = files.Where(f => !applied.Contains(f!)).ToList();

            if (pending.Count == 0)
            {
                Console.WriteLine("✨ La base de datos está al día. No hay migraciones pendientes.");
                Console.WriteLine("============================================================\n");
                return 0;
            }

            Console.WriteLine($"📦 Se encontraron {pending.Count} migración(es) pendiente(s) (Batch #{currentBatch}):\n");

            foreach (var file in pending)
            {
                var filePath = Path.Combine(_migrationsDir, file!);
                var sql = await File.ReadAllTextAsync(filePath);

                var start = DateTime.UtcNow;
                Console.Write($"   ⚙️  Aplicando: {file} ... ");

                using var tx = conn.BeginTransaction();
                try
                {
                    // Separar por GO si existiera
                    var statements = Regex.Split(sql, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                    foreach (var stmt in statements)
                    {
                        var trimmed = stmt.Trim();
                        if (string.IsNullOrWhiteSpace(trimmed)) continue;

                        using var execCmd = new SqlCommand(trimmed, conn, tx);
                        await execCmd.ExecuteNonQueryAsync();
                    }

                    using var recordCmd = new SqlCommand("INSERT INTO dbo._migrations (name, batch) VALUES (@name, @batch);", conn, tx);
                    recordCmd.Parameters.AddWithValue("@name", file);
                    recordCmd.Parameters.AddWithValue("@batch", currentBatch);
                    await recordCmd.ExecuteNonQueryAsync();

                    await tx.CommitAsync();
                    var ms = (DateTime.UtcNow - start).TotalMilliseconds;
                    Console.WriteLine($"✅ OK ({(int)ms}ms)");
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    Console.WriteLine($"❌ ERROR: {ex.Message}");
                    throw;
                }
            }

            Console.WriteLine($"\n🎉 ¡{pending.Count} migraciones ejecutadas exitosamente en Batch #{currentBatch}!");
            Console.WriteLine("============================================================\n");
            return pending.Count;
        }

        /// <summary>
        /// migrate:status - Despliega en consola el estado tabular de cada migración
        /// </summary>
        public async Task MigrateStatusAsync()
        {
            Console.WriteLine("\n============================================================");
            Console.WriteLine($"📊 ESTADO DE MIGRACIONES — {_databaseName}");
            Console.WriteLine("============================================================");

            await EnsureMigrationTableAsync();

            var files = Directory.Exists(_migrationsDir)
                ? Directory.GetFiles(_migrationsDir, "*.sql").Select(Path.GetFileName).OrderBy(f => f).ToList()
                : new List<string?>();

            using var conn = GetDatabaseConnection();
            await conn.OpenAsync();

            var appliedInfo = new Dictionary<string, (int Batch, DateTime ExecutedAt)>();

            using (var cmd = new SqlCommand("SELECT name, batch, executed_at FROM dbo._migrations ORDER BY id ASC;", conn))
            using (var reader = await cmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    appliedInfo[reader.GetString(0)] = (reader.GetInt32(1), reader.GetDateTime(2));
                }
            }

            Console.WriteLine($"Total migraciones encontradas: {files.Count}\n");
            Console.WriteLine("  Estado    | Batch | Archivo de Migración            | Fecha Ejecución");
            Console.WriteLine(" -----------|-------|---------------------------------|---------------------");

            foreach (var file in files)
            {
                if (file != null && appliedInfo.TryGetValue(file, out var info))
                {
                    Console.WriteLine($"  APLICADA  |   {info.Batch,2}  | {file.PadRight(31)} | {info.ExecutedAt:yyyy-MM-dd HH:mm:ss}");
                }
                else
                {
                    Console.WriteLine($"  PENDIENTE |   -   | {file?.PadRight(31)} | -");
                }
            }

            Console.WriteLine("============================================================\n");
        }

        /// <summary>
        /// migrate:reset - Elimina todas las tablas y ejecuta las migraciones desde cero
        /// </summary>
        public async Task MigrateResetAsync()
        {
            Console.WriteLine("\n============================================================");
            Console.WriteLine($"⚠️  RESETEANDO BASE DE DATOS: {_databaseName}");
            Console.WriteLine("============================================================");

            await EnsureDatabaseExistsAsync();

            using var conn = GetDatabaseConnection();
            await conn.OpenAsync();

            Console.WriteLine("🧹 Eliminando restricciones de clave foránea y tablas...");
            
            var dropFkSql = @"
                DECLARE @sql NVARCHAR(MAX) = N'';
                SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
                               N' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
                FROM sys.foreign_keys;
                IF LEN(@sql) > 0 EXEC sp_executesql @sql;";

            using (var cmd = new SqlCommand(dropFkSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            var dropTablesSql = @"
                DECLARE @sql NVARCHAR(MAX) = N'';
                SELECT @sql += N'DROP TABLE ' + QUOTENAME(TABLE_SCHEMA) + '.' + QUOTENAME(TABLE_NAME) + ';'
                FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
                IF LEN(@sql) > 0 EXEC sp_executesql @sql;";

            using (var cmd = new SqlCommand(dropTablesSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            Console.WriteLine("✅ Tablas eliminadas correctamente.");

            await MigrateUpAsync();
        }

        /// <summary>
        /// db:seed - Inserta datos semilla estándar institucionales para desarrollo y pruebas
        /// </summary>
        public async Task SeedDbAsync()
        {
            Console.WriteLine("\n============================================================");
            Console.WriteLine($"🌱 SEMBRANDO DATOS INICIALES: {_databaseName}");
            Console.WriteLine("============================================================");

            await EnsureDatabaseExistsAsync();
            await EnsureMigrationTableAsync();

            using var conn = GetDatabaseConnection();
            await conn.OpenAsync();

            // 1. Roles del Sistema
            Console.WriteLine("🔹 Sembrando Roles del Sistema...");
            var rolesSql = @"
                SET IDENTITY_INSERT dbo.roles ON;
                IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE id = 1)
                    INSERT INTO dbo.roles (id, codigo, nombre, descripcion, activo) VALUES (1, 'ADMIN_SISTEMA', 'Administrador de Sistema', 'Gestión de usuarios, personas, organigrama y parámetros base del sistema', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE id = 2)
                    INSERT INTO dbo.roles (id, codigo, nombre, descripcion, activo) VALUES (2, 'ADMIN_TRAMITES', 'Administrador de Trámites', 'Gestión operativa de trámites, anulación, redirección y reportes de transparencia', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE id = 3)
                    INSERT INTO dbo.roles (id, codigo, nombre, descripcion, activo) VALUES (3, 'VENTANILLA_UNICA', 'Ventanilla Única', 'Recepción de trámites, registro de correspondencias, emisión de hojas de ruta y bloqueo', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE id = 4)
                    INSERT INTO dbo.roles (id, codigo, nombre, descripcion, activo) VALUES (4, 'FUNCIONARIO', 'Funcionario', 'Atención de trámites, proveídos, adjuntos y derivación en escritorio virtual', 1);
                SET IDENTITY_INSERT dbo.roles OFF;";
            using (var cmd = new SqlCommand(rolesSql, conn)) await cmd.ExecuteNonQueryAsync();

            var hash = BCrypt.Net.BCrypt.HashPassword("admin123", workFactor: 10);

            // 2. Tablas Institucionales (Sprint 2 - DB_TRAMITES_EXTERNOS)
            Console.WriteLine("🔹 Sembrando Unidades, Cargos y Personal Municipal (DB_TRAMITES_EXTERNOS)...");
            var instSql = @"
                -- TUnidad (Catálogo Institucional de Unidades)
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 1)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (1, 'DIRECCION GENERAL EJECUTIVA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 2)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (2, 'SECRETARIA GENERAL', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 3)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (3, 'VENTANILLA UNICA DE CORRESPONDENCIA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 4)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (4, 'DIRECCION JURIDICA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 5)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (5, 'DIRECCION ADMINISTRATIVA FINANCIERA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 6)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (6, 'UNIDAD DE SISTEMAS Y TECNOLOGIAS', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 7)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (7, 'DIRECCION DE PLANIFICACION Y MEDIO AMBIENTE', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 8)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (8, 'DIRECCION DE SALUD Y DESARROLLO SOCIAL', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 9)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (9, 'DIRECCION DE OBRAS PUBLICAS E INFRAESTRUCTURA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 10)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (10, 'DIRECCION DE INGRESOS Y TRIBUTACION', 1);

                -- TCargo (Cargos Dependientes)
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 1)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (1, 'DIRECTOR GENERAL EJECUTIVO', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 2)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (2, 'SECRETARIO GENERAL', 2);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 3)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (3, 'ENCARGADO DE VENTANILLA UNICA', 3);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 4)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (4, 'ASESOR JURIDICO GENERAL', 4);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 5)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (5, 'DIRECTOR ADMINISTRATIVO FINANCIERO', 5);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 6)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (6, 'ANALISTA DE SISTEMAS Y REDES', 6);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 7)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (7, 'JEFE DE PLANIFICACION ESTRATEGICA', 7);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 8)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (8, 'SUPERVISOR DE MEDIO AMBIENTE', 7);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 9)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (9, 'DIRECTOR DE SALUD MUNICIPAL', 8);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 10)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (10, 'DIRECTOR DE OBRAS PUBLICAS', 9);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 11)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (11, 'FISCAL DE OBRAS CIVILES', 9);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 12)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (12, 'JEFE DE RECAUDACIONES Y TRIBUTOS', 10);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 13)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (13, 'TECNICO DE RECEPCION Y DESPACHO', 3);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 14)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (14, 'RESPONSABLE DE CONTRATOS Y CONVENIOS', 4);

                -- TEmpleados (Personal Municipal y Cuentas de Acceso al Sistema)
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 1000001)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (1000001, 'SISTEMA GENERAL', 'ADMINISTRADOR', 'Oficina Central Sucre', 70012345, 'admin@gob.bo', 1, 'admin', @hash, 'Administrador General', 1, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 2000002)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (2000002, 'FERNANDEZ ROJAS', 'MARIA', 'Av. Hernando Siles #123', 70054321, 'mfernandez@gob.bo', 1, 'mfernandez', @hash, 'Responsable de Ventanilla Única', 3, 3);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 3000003)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (3000003, 'MAMANI QUISPE', 'CARLOS', 'Calle Calvo #456', 70098765, 'cmamani@gob.bo', 1, 'cmamani', @hash, 'Analista de Sistemas', 6, 6);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 4000004)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (4000004, 'LEAÑO PALENQUE', 'ENRIQUE', 'Plaza 25 de Mayo #1', 71122334, 'eleano@sucre.bo', 1, 'eleano', @hash, 'Director General Ejecutivo', 1, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 5000005)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (5000005, 'CACERES FLORES', 'ANGELA MARIA', 'Calle España #88', 72889900, 'acaceres@sucre.bo', 1, 'acaceres', @hash, 'Técnico de Ventanilla Única', 3, 13);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 6000006)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (6000006, 'SANCHEZ MENDOZA', 'JUAN CARLOS', 'Av. del Maestro #200', 73456789, 'jsanchez@sucre.bo', 1, 'jsanchez', @hash, 'Asesor Jurídico', 4, 4);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 7000007)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (7000007, 'SAGAS GUZMAN', 'MARIA ELENA', 'Calle Junín #310', 74567890, 'msagas@sucre.bo', 1, NULL, NULL, 'Jefe de Planificación Estratégica', 7, 7);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 8000008)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (8000008, 'MARTINEZ VACA', 'LITZY', 'Calle Ayacucho #150', 75678901, 'lmartinez@sucre.bo', 1, NULL, NULL, 'Director de Salud Municipal', 8, 9);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 9000009)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (9000009, 'TORREZ RIVERA', 'JAVIER', 'Calle Estudiantes #45', 76789012, 'jtorrez@sucre.bo', 1, NULL, NULL, 'Director de Obras Públicas', 9, 10);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 10000010)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo, login, password_hash, cargo_nombre, cod_u, cod_cargo) 
                    VALUES (10000010, 'CONDORI ALVAREZ', 'PATRICIA', 'Av. Jaime Mendoza #500', 77890123, 'pcondori@sucre.bo', 1, NULL, NULL, 'Jefe de Recaudaciones y Tributos', 10, 12);
            ";
            using (var cmd = new SqlCommand(instSql, conn))
            {
                cmd.Parameters.AddWithValue("@hash", hash);
                await cmd.ExecuteNonQueryAsync();
            }

            // 3. Organigrama (Ubicaciones Orgánicas sincronizado con TUnidad)
            Console.WriteLine("🔹 Sembrando Organigrama Institucional (Sincronizado con TUnidad)...");
            var ubiSql = @"
                SET IDENTITY_INSERT dbo.ubicaciones_org ON;
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 1 OR codigo = 'DIR-GEN' OR codU = 1)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (1, 'DIR-GEN', 'Dirección General Ejecutiva', 'DGE', NULL, 1, 'Máxima Autoridad Ejecutiva de la institución', 1, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 2 OR codigo = 'SEC-GEN' OR codU = 2)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (2, 'SEC-GEN', 'Secretaría General', 'SG', 1, 2, 'Secretaría y Despacho General', 1, 2);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 3 OR codigo = 'VENT-UNI' OR codU = 3)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (3, 'VENT-UNI', 'Ventanilla Única de Correspondencia', 'VU', 2, 3, 'Recepción y despacho central de documentos', 1, 3);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 4 OR codigo = 'DIR-JUR' OR codU = 4)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (4, 'DIR-JUR', 'Dirección Jurídica', 'DJ', 1, 2, 'Asesoría y dictámenes legales', 1, 4);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 5 OR codigo = 'DIR-ADM' OR codU = 5)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (5, 'DIR-ADM', 'Dirección Administrativa Financiera', 'DAF', 1, 2, 'Gestión de recursos humanos, materiales y financieros', 1, 5);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 6 OR codigo = 'UNI-SIS' OR codU = 6)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (6, 'UNI-SIS', 'Unidad de Tecnologías de Información y Sistemas', 'UTIC', 5, 3, 'Soporte y desarrollo de sistemas informáticos', 1, 6);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 7 OR codigo = 'DIR-PLAN' OR codU = 7)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (7, 'DIR-PLAN', 'Dirección de Planificación y Medio Ambiente', 'DPMA', 1, 2, 'Planificación territorial y medio ambiente municipal', 1, 7);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 8 OR codigo = 'DIR-SAL' OR codU = 8)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (8, 'DIR-SAL', 'Dirección de Salud y Desarrollo Social', 'DSDS', 1, 2, 'Salud y programas sociales municipales', 1, 8);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 9 OR codigo = 'DIR-OBR' OR codU = 9)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (9, 'DIR-OBR', 'Dirección de Obras Públicas e Infraestructura', 'DOPI', 1, 2, 'Obras públicas e infraestructura urbana', 1, 9);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 10 OR codigo = 'DIR-ING' OR codU = 10)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo, codU) VALUES (10, 'DIR-ING', 'Dirección de Ingresos y Tributación', 'DIT', 1, 2, 'Recaudaciones e ingresos tributarios municipales', 1, 10);
                SET IDENTITY_INSERT dbo.ubicaciones_org OFF;";
            using (var cmd = new SqlCommand(ubiSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 4. Ciudadanos y Solicitantes Externos
            Console.WriteLine("🔹 Sembrando Ciudadanos y Solicitantes Externos (Padrón de Trámites)...");
            var perSql = @"
                SET IDENTITY_INSERT dbo.personas ON;
                IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE id = 1)
                    INSERT INTO dbo.personas (id, nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, direccion, activo) 
                    VALUES (1, 'Roberto', 'Flores', 'Gómez', '5001122', 'CH', 'M', 'SOLTERO', '70088990', 'rflores@gmail.com', 'ENTEL', 'Calle Estudiantes #120', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE id = 2)
                    INSERT INTO dbo.personas (id, nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, direccion, activo) 
                    VALUES (2, 'Juana', 'Mamani', 'Condori', '6003344', 'CH', 'F', 'CASADA', '71199887', 'jmamani@gmail.com', 'TIGO', 'Av. de las Américas #450', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE id = 3)
                    INSERT INTO dbo.personas (id, nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, direccion, activo) 
                    VALUES (3, 'Pedro', 'Alarcón', 'Vargas', '7005566', 'CH', 'M', 'CASADO', '72244556', 'palarcon@constructora.bo', 'VIVA', 'Calle Bolívar #200', 1);
                SET IDENTITY_INSERT dbo.personas OFF;";
            using (var cmd = new SqlCommand(perSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 5. Asignación de Roles al Personal Municipal
            Console.WriteLine("🔹 Sembrando Asignación de Roles al Personal Municipal...");
            var rolAsignSql = @"
                SET IDENTITY_INSERT dbo.usuario_roles ON;
                IF NOT EXISTS (SELECT 1 FROM dbo.usuario_roles WHERE id = 1)
                    INSERT INTO dbo.usuario_roles (id, usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, es_principal, activo) VALUES (1, 1, 1, 6, 'CONTROL_TOTAL', '2030-12-31', 1, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.usuario_roles WHERE id = 2)
                    INSERT INTO dbo.usuario_roles (id, usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, es_principal, activo) VALUES (2, 1, 2, 6, 'CONTROL_TOTAL', '2030-12-31', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.usuario_roles WHERE id = 3)
                    INSERT INTO dbo.usuario_roles (id, usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, es_principal, activo) VALUES (3, 2, 3, 3, 'CONTROL_TOTAL', '2030-12-31', 1, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.usuario_roles WHERE id = 4)
                    INSERT INTO dbo.usuario_roles (id, usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, es_principal, activo) VALUES (4, 3, 4, 6, 'CONTROL_TOTAL', '2030-12-31', 1, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.usuario_roles WHERE id = 5)
                    INSERT INTO dbo.usuario_roles (id, usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, es_principal, activo) VALUES (5, 4, 2, 1, 'CONTROL_TOTAL', '2030-12-31', 1, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.usuario_roles WHERE id = 6)
                    INSERT INTO dbo.usuario_roles (id, usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, es_principal, activo) VALUES (6, 5, 3, 3, 'CONTROL_TOTAL', '2030-12-31', 1, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.usuario_roles WHERE id = 7)
                    INSERT INTO dbo.usuario_roles (id, usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, es_principal, activo) VALUES (7, 6, 4, 4, 'CONTROL_TOTAL', '2030-12-31', 1, 1);
                SET IDENTITY_INSERT dbo.usuario_roles OFF;";
            using (var cmd = new SqlCommand(rolAsignSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 6. Tipos de Proceso
            Console.WriteLine("🔹 Sembrando Tipos de Proceso Externo (Hojas de Ruta DB_TRAMITES_EXTERNOS)...");
            var procSql = @"
                -- Trámites Externos Oficiales (Hojas de Ruta Institucionales)
                IF NOT EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE codigo = 'CM')
                    INSERT INTO dbo.tipos_proceso (codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo) 
                    VALUES ('CM', 'Correspondencia Municipal Externa', 'Hojas de Ruta de correspondencia oficial externa, notas y solicitudes ciudadanas o interinstitucionales', 'CORRESPONDENCIA', 3, 0, 24, 1);
                ELSE
                    UPDATE dbo.tipos_proceso 
                    SET nombre = 'Correspondencia Municipal Externa', 
                        descripcion = 'Hojas de Ruta de correspondencia oficial externa, notas y solicitudes ciudadanas o interinstitucionales', 
                        tipo_categoria = 'CORRESPONDENCIA',
                        tiempo_estimado_horas = 24
                    WHERE codigo = 'CM';

                IF NOT EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE codigo = 'CDE1')
                    INSERT INTO dbo.tipos_proceso (codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo) 
                    VALUES ('CDE1', 'Contratos Institucionales', 'Hojas de Ruta para suscripción y fiscalización de contratos de obras, bienes y servicios', 'CORRESPONDENCIA', 4, 0, 72, 1);

                IF NOT EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE codigo = 'CDE2')
                    INSERT INTO dbo.tipos_proceso (codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo) 
                    VALUES ('CDE2', 'Convenios Interinstitucionales', 'Hojas de Ruta para suscripción de convenios marco y específicos de cooperación', 'CORRESPONDENCIA', 2, 0, 48, 1);

                IF NOT EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE codigo = 'CDH1')
                    INSERT INTO dbo.tipos_proceso (codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo) 
                    VALUES ('CDH1', 'Condecoraciones y Distinciones', 'Hojas de Ruta para distinciones honoríficas, condecoraciones y reconocimientos municipales', 'CORRESPONDENCIA', 1, 0, 48, 1);
            ";
            using (var cmd = new SqlCommand(procSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 8. Parámetros Generales
            Console.WriteLine("🔹 Sembrando Parámetros Institucionales...");
            var paramSql = @"
                IF NOT EXISTS (SELECT 1 FROM dbo.parametros WHERE clave = 'INSTITUCION_NOMBRE')
                    INSERT INTO dbo.parametros (clave, valor, tipo_dato, descripcion, editable) VALUES ('INSTITUCION_NOMBRE', 'Gobierno Autónomo Municipal de Sucre', 'STRING', 'Nombre oficial de la institución que utiliza el sistema', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.parametros WHERE clave = 'INSTITUCION_SIGLA')
                    INSERT INTO dbo.parametros (clave, valor, tipo_dato, descripcion, editable) VALUES ('INSTITUCION_SIGLA', 'GAMS', 'STRING', 'Sigla de la institución', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.parametros WHERE clave = 'GESTION_ACTIVA')
                    INSERT INTO dbo.parametros (clave, valor, tipo_dato, descripcion, editable) VALUES ('GESTION_ACTIVA', '2026', 'INTEGER', 'Gestión fiscal / año calendario activo para trámites', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.parametros WHERE clave = 'CORRELATIVO_AUTO_RESET')
                    INSERT INTO dbo.parametros (clave, valor, tipo_dato, descripcion, editable) VALUES ('CORRELATIVO_AUTO_RESET', 'TRUE', 'BOOLEAN', 'Reinicio automático de correlativo anual', 1);";
            using (var cmd = new SqlCommand(paramSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 9. Trámites de Prueba y Flujo de Trabajo (Escritorio Virtual - Sprint 3)
            Console.WriteLine("🔹 Sembrando Trámites de Prueba para Escritorio Virtual (Sprint 3)...");
            var tramitesSeedSql = @"
                IF NOT EXISTS (SELECT 1 FROM dbo.tramites)
                BEGIN
                    DECLARE @Year INT = YEAR(GETDATE());
                    DECLARE @Ahora DATETIME2 = GETDATE();
                    DECLARE @Ayer DATETIME2 = DATEADD(DAY, -1, @Ahora);
                    DECLARE @Hace2Dias DATETIME2 = DATEADD(DAY, -2, @Ahora);
                    DECLARE @Hace3Dias DATETIME2 = DATEADD(DAY, -3, @Ahora);
                    DECLARE @Hace5Dias DATETIME2 = DATEADD(DAY, -5, @Ahora);
                    DECLARE @Hace10Dias DATETIME2 = DATEADD(DAY, -10, @Ahora);
                    
                    DECLARE @FechaVencida DATE = CAST(DATEADD(DAY, -2, @Ahora) AS DATE);
                    DECLARE @FechaVigente DATE = CAST(DATEADD(DAY, 4, @Ahora) AS DATE);

                    -- 1. Trámite CM-1: Correspondencia Externa (EN ATENCIÓN - UNI-SIS)
                    INSERT INTO dbo.tramites (
                        numero_correlativo, gestion, tipo_proceso_id, estado,
                        remitente, institucion_remitente, cite_externo, referencia,
                        tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
                        destinatario_nombre, destinatario_cargo, destinatario_unidad,
                        primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
                        creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
                        activo, created_at, updated_at
                    ) VALUES (
                        'CM-1/' + CAST(@Year AS VARCHAR), @Year, 1, 'EN_ATENCION',
                        'Ing. Roberto Zeballos Morales', 'Ministerio de Obras Públicas y Telecomunicaciones', 'MOPSV-DGT-102/2026',
                        'Solicitud de viabilidad técnica y compatibilidad de fibra óptica para el proyecto de modernización digital del Municipio de Sucre.',
                        'CORRESPONDENCIA', 12, 2, 'Para su atención, análisis técnico de infraestructura y respuesta formal.', 'ALTA',
                        'ADMINISTRADOR SISTEMA GENERAL', 'RESPONSABLE DE SISTEMAS', 'Unidad de Tecnologías de Información y Sistemas',
                        1, @Hace3Dias, @FechaVigente,
                        2, 3, 1, 6,
                        1, @Hace3Dias, @Ahora
                    );
                    DECLARE @T1_ID INT = SCOPE_IDENTITY();

                    INSERT INTO dbo.movimientos (
                        tramite_id, orden, tipo_movimiento, actividad_nombre,
                        usuario_origen_id, ubicacion_origen_id, usuario_destino_id, ubicacion_destino_id,
                        estado_movimiento, proveido, instruccion, tiempo_estimado_minutos,
                        fecha_recepcion, fecha_envio, created_at
                    ) VALUES 
                    (@T1_ID, 1, 'INICIO', 'Recepción en Ventanilla Única', 2, 3, 1, 6, 'DESPACHADO', 'Ingreso oficial por ventanilla. Derivado a Unidad de Sistemas.', 'Para informe técnico', 1440, @Hace3Dias, @Hace3Dias, @Hace3Dias),
                    (@T1_ID, 2, 'RECEPCION', 'Atención en Unidad de Sistemas', 1, 6, 1, 6, 'EN_ATENCION', 'Documentación recibida. En revisión de planos técnicos de conectividad municipal.', 'En curso', 1440, @Hace2Dias, NULL, @Ayer);

                    -- 2. Trámite CM-2: Solicitud URGENTE y VENCIDA (RF-04.8 - Alerta Roja)
                    INSERT INTO dbo.tramites (
                        numero_correlativo, gestion, tipo_proceso_id, estado,
                        remitente, institucion_remitente, cite_externo, referencia,
                        tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
                        destinatario_nombre, destinatario_cargo, destinatario_unidad,
                        primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
                        creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
                        activo, created_at, updated_at
                    ) VALUES (
                        'CM-2/' + CAST(@Year AS VARCHAR), @Year, 1, 'EN_ATENCION',
                        'Lic. Carmen Arispe Benitez', 'Banco Unión S.A.', 'BU-SUC-892/2026',
                        'Requerimiento urgente de renovación de certificados de seguridad y enlace API para pasarela de pagos tributarios RUAT.',
                        'CORRESPONDENCIA', 6, 1, 'Atención prioritaria inmediata para evitar suspensión de recaudación bancaria.', 'URGENTE',
                        'ADMINISTRADOR SISTEMA GENERAL', 'RESPONSABLE DE SISTEMAS', 'Unidad de Tecnologías de Información y Sistemas',
                        1, @Hace10Dias, @FechaVencida,
                        2, 3, 1, 6,
                        1, @Hace10Dias, @Ayer
                    );
                    DECLARE @T2_ID INT = SCOPE_IDENTITY();

                    INSERT INTO dbo.movimientos (
                        tramite_id, orden, tipo_movimiento, actividad_nombre,
                        usuario_origen_id, ubicacion_origen_id, usuario_destino_id, ubicacion_destino_id,
                        estado_movimiento, proveido, instruccion, tiempo_estimado_minutos,
                        fecha_recepcion, fecha_envio, created_at
                    ) VALUES 
                    (@T2_ID, 1, 'INICIO', 'Recepción en Ventanilla Única', 2, 3, 1, 6, 'DESPACHADO', 'Urgente por ventanilla. Pase a Sistemas.', 'Urgente', 720, @Hace10Dias, @Hace10Dias, @Hace10Dias),
                    (@T2_ID, 2, 'RECEPCION', 'Revisión técnica de pasarela', 1, 6, 1, 6, 'EN_ATENCION', 'Recepción confirmada. Coordinando con soporte de pasarela.', 'Urgente', 720, @Hace5Dias, NULL, @Hace5Dias);

                    -- 3. Trámite CDE1-1: Contrato Institucional POR RECIBIR (Pendiente de Recepción)
                    INSERT INTO dbo.tramites (
                        numero_correlativo, gestion, tipo_proceso_id, estado,
                        remitente, institucion_remitente, cite_externo, referencia,
                        tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
                        destinatario_nombre, destinatario_cargo, destinatario_unidad,
                        primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
                        creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
                        activo, created_at, updated_at
                    ) VALUES (
                        'CDE1-1/' + CAST(@Year AS VARCHAR), @Year, 2, 'POR_RECIBIR',
                        'Dr. Gonzalo Valda Cardozo', 'Empresa de Servicios Informáticos Andina SRL', 'ESIA-LEG-045/2026',
                        'Contrato administrativo de provisión, soporte y licenciamiento para servidores del Data Center Central del Gobierno Autónomo Municipal.',
                        'CORRESPONDENCIA', 45, 3, 'Para revisión técnica de especificaciones y visto bueno antes de firma de despacho.', 'NORMAL',
                        'ADMINISTRADOR SISTEMA GENERAL', 'RESPONSABLE DE SISTEMAS', 'Unidad de Tecnologías de Información y Sistemas',
                        1, @Ayer, @FechaVigente,
                        2, 3, 1, 6,
                        1, @Ayer, @Ayer
                    );
                    DECLARE @T3_ID INT = SCOPE_IDENTITY();

                    INSERT INTO dbo.movimientos (
                        tramite_id, orden, tipo_movimiento, actividad_nombre,
                        usuario_origen_id, ubicacion_origen_id, usuario_destino_id, ubicacion_destino_id,
                        estado_movimiento, proveido, instruccion, tiempo_estimado_minutos,
                        fecha_recepcion, fecha_envio, created_at
                    ) VALUES 
                    (@T3_ID, 1, 'INICIO', 'Recepción en Ventanilla Única', 2, 3, 1, 6, 'POR_RECIBIR', 'Despachado en carpeta oficial. Pendiente de recepción por Sistemas.', 'Para VoBo Técnico', 4320, NULL, @Ayer, @Ayer);

                    -- 4. Trámite CDE2-1: Convenio ATENDIDO listo para despachar
                    INSERT INTO dbo.tramites (
                        numero_correlativo, gestion, tipo_proceso_id, estado,
                        remitente, institucion_remitente, cite_externo, referencia,
                        tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
                        destinatario_nombre, destinatario_cargo, destinatario_unidad,
                        primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
                        creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
                        activo, created_at, updated_at
                    ) VALUES (
                        'CDE2-1/' + CAST(@Year AS VARCHAR), @Year, 3, 'ATENDIDO',
                        'Rectorado USFX', 'Universidad Mayor, Real y Pontificia de San Francisco Xavier de Chuquisaca', 'USFX-REC-332/2026',
                        'Convenio marco de cooperación interinstitucional para pasantías académicas e investigación en sistemas de información geográfica.',
                        'CORRESPONDENCIA', 18, 1, 'Atendido satisfactoriamente. Con informe favorable adjunto.', 'NORMAL',
                        'ADMINISTRADOR SISTEMA GENERAL', 'RESPONSABLE DE SISTEMAS', 'Unidad de Tecnologías de Información y Sistemas',
                        1, @Hace5Dias, @FechaVigente,
                        2, 3, 1, 6,
                        1, @Hace5Dias, @Ahora
                    );
                    DECLARE @T4_ID INT = SCOPE_IDENTITY();

                    INSERT INTO dbo.movimientos (
                        tramite_id, orden, tipo_movimiento, actividad_nombre,
                        usuario_origen_id, ubicacion_origen_id, usuario_destino_id, ubicacion_destino_id,
                        estado_movimiento, proveido, instruccion, tiempo_estimado_minutos,
                        fecha_recepcion, fecha_envio, created_at
                    ) VALUES 
                    (@T4_ID, 1, 'INICIO', 'Recepción en Ventanilla', 2, 3, 1, 6, 'DESPACHADO', 'Ingresado por ventanilla.', 'Atención', 2880, @Hace5Dias, @Hace5Dias, @Hace5Dias),
                    (@T4_ID, 2, 'EVALUACION', 'Evaluación técnica de Sistemas', 1, 6, 1, 6, 'ATENDIDO', 'Informe técnico INF-TIC-08/2026 elaborado con visto bueno favorable. Listo para remitir a Dirección Jurídica.', 'Concluido informe', 2880, @Hace3Dias, NULL, @Ayer);

                    -- 5. Trámite CM-3: DESPACHADO por Sistemas hacia Dirección Jurídica
                    INSERT INTO dbo.tramites (
                        numero_correlativo, gestion, tipo_proceso_id, estado,
                        remitente, institucion_remitente, cite_externo, referencia,
                        tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
                        destinatario_nombre, destinatario_cargo, destinatario_unidad,
                        primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
                        creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
                        activo, created_at, updated_at
                    ) VALUES (
                        'CM-3/' + CAST(@Year AS VARCHAR), @Year, 1, 'POR_RECIBIR',
                        'ADMINISTRADOR SISTEMA GENERAL', 'Unidad de Tecnologías de Información y Sistemas', 'INF-TIC-05/2026',
                        'Informe pericial técnico sobre derechos de autor y licencias de software propietario para el Concejo Municipal.',
                        'CORRESPONDENCIA', 8, 1, 'Para criterio legal y elaboración de resolución municipal.', 'ALTA',
                        'JUAN CARLOS SANCHEZ MENDOZA', 'ASESOR LEGAL', 'Dirección Jurídica',
                        6, @Hace3Dias, @FechaVigente,
                        1, 6, 6, 4,
                        1, @Hace3Dias, @Ayer
                    );
                    DECLARE @T5_ID INT = SCOPE_IDENTITY();

                    INSERT INTO dbo.movimientos (
                        tramite_id, orden, tipo_movimiento, actividad_nombre,
                        usuario_origen_id, ubicacion_origen_id, usuario_destino_id, ubicacion_destino_id,
                        estado_movimiento, proveido, instruccion, tiempo_estimado_minutos,
                        fecha_recepcion, fecha_envio, created_at
                    ) VALUES 
                    (@T5_ID, 1, 'DESPACHO', 'Despacho desde Sistemas a Jurídica', 1, 6, 6, 4, 'POR_RECIBIR', 'Se remite informe técnico pericial foliado. Favor proceder con análisis de legalidad.', 'Para informe legal', 1440, NULL, @Ayer, @Ayer);

                    -- 6. Trámite CDH1-1: Condecoración para Funcionario Carlos Mamani (id 3)
                    INSERT INTO dbo.tramites (
                        numero_correlativo, gestion, tipo_proceso_id, estado,
                        remitente, institucion_remitente, cite_externo, referencia,
                        tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
                        destinatario_nombre, destinatario_cargo, destinatario_unidad,
                        primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
                        creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
                        activo, created_at, updated_at
                    ) VALUES (
                        'CDH1-1/' + CAST(@Year AS VARCHAR), @Year, 4, 'EN_ATENCION',
                        'Comité Cívico de Chuquisaca', 'Comité Cívico de los Intereses de Chuquisaca', 'CCICH-SUC-12/2026',
                        'Postulación oficial de personalidades e instituciones meritorias para la Condecoración Gran Mariscal de Ayacucho - Bicentenario.',
                        'CORRESPONDENCIA', 14, 2, 'Para compulsa de antecedentes curriculares y verificación de requisitos.', 'NORMAL',
                        'CARLOS MAMANI QUISPE', 'ANALISTA DE SISTEMAS', 'Unidad de Tecnologías de Información y Sistemas',
                        3, @Hace5Dias, @FechaVigente,
                        2, 3, 3, 6,
                        1, @Hace5Dias, @Ayer
                    );
                    DECLARE @T6_ID INT = SCOPE_IDENTITY();

                    INSERT INTO dbo.movimientos (
                        tramite_id, orden, tipo_movimiento, actividad_nombre,
                        usuario_origen_id, ubicacion_origen_id, usuario_destino_id, ubicacion_destino_id,
                        estado_movimiento, proveido, instruccion, tiempo_estimado_minutos,
                        fecha_recepcion, fecha_envio, created_at
                    ) VALUES 
                    (@T6_ID, 1, 'INICIO', 'Recepción en Ventanilla Única', 2, 3, 3, 6, 'DESPACHADO', 'Pase a analista asignado.', 'Para verificación', 2880, @Hace5Dias, @Hace5Dias, @Hace5Dias),
                    (@T6_ID, 2, 'REVISION', 'Verificación de expediente', 3, 6, 3, 6, 'EN_ATENCION', 'Expediente recepcionado. Verificando antecedentes de postulantes.', 'En curso', 2880, @Hace3Dias, NULL, @Ayer);

                    -- 7. Trámite CM-4: Trámite para Juan Carlos Sánchez (id 6, DIR-JUR)
                    INSERT INTO dbo.tramites (
                        numero_correlativo, gestion, tipo_proceso_id, estado,
                        remitente, institucion_remitente, cite_externo, referencia,
                        tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
                        destinatario_nombre, destinatario_cargo, destinatario_unidad,
                        primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
                        creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
                        activo, created_at, updated_at
                    ) VALUES (
                        'CM-4/' + CAST(@Year AS VARCHAR), @Year, 1, 'EN_ATENCION',
                        'Junta Vecinal Distrito 2', 'Asociación Comunitaria de Juntas Vecinales', 'JV-D2-44/2026',
                        'Demanda de cesión de terrenos municipales para construcción de módulo policial y posta de salud vecinal.',
                        'CORRESPONDENCIA', 22, 1, 'Para emisión de dictamen técnico-jurídico sobre derecho propietario municipal.', 'NORMAL',
                        'JUAN CARLOS SANCHEZ MENDOZA', 'ASESOR LEGAL', 'Dirección Jurídica',
                        6, @Hace3Dias, @FechaVigente,
                        2, 3, 6, 4,
                        1, @Hace3Dias, @Ayer
                    );
                    DECLARE @T7_ID INT = SCOPE_IDENTITY();

                    INSERT INTO dbo.movimientos (
                        tramite_id, orden, tipo_movimiento, actividad_nombre,
                        usuario_origen_id, ubicacion_origen_id, usuario_destino_id, ubicacion_destino_id,
                        estado_movimiento, proveido, instruccion, tiempo_estimado_minutos,
                        fecha_recepcion, fecha_envio, created_at
                    ) VALUES 
                    (@T7_ID, 1, 'INICIO', 'Recepción en Ventanilla', 2, 3, 6, 4, 'DESPACHADO', 'Derivado a Jurídica.', 'Dictamen legal', 1440, @Hace3Dias, @Hace3Dias, @Hace3Dias),
                    (@T7_ID, 2, 'ANALISIS', 'Análisis en Dirección Jurídica', 6, 4, 6, 4, 'EN_ATENCION', 'Revisando folio real en Catastro y Derechos Reales.', 'En estudio', 1440, @Ayer, NULL, @Ayer);

                    -- Inicializar correlativos
                    IF NOT EXISTS (SELECT 1 FROM dbo.correlativos WHERE gestion = @Year)
                    BEGIN
                        INSERT INTO dbo.correlativos (tipo_proceso_id, ubicacion_org_id, gestion, ultimo_numero, formato_patron, created_at, updated_at)
                        VALUES 
                        (1, 3, @Year, 4, '{CODIGO}-{NUMERO}/{GESTION}', @Ahora, @Ahora),
                        (2, 3, @Year, 1, '{CODIGO}-{NUMERO}/{GESTION}', @Ahora, @Ahora),
                        (3, 3, @Year, 1, '{CODIGO}-{NUMERO}/{GESTION}', @Ahora, @Ahora),
                        (4, 3, @Year, 1, '{CODIGO}-{NUMERO}/{GESTION}', @Ahora, @Ahora);
                    END;

                    -- Documentos PDF adjuntos simulados
                    INSERT INTO dbo.adjuntos (
                        tramite_id, movimiento_id, nombre_original, nombre_almacenado,
                        ruta_archivo, tamano_bytes, tipo_mime, subido_por, activo, created_at
                    ) VALUES 
                    (@T1_ID, 1, 'Oficio_MOPSV_FibraOptica_2026.pdf', 'adj_t1_1.pdf', 'Uploads/2026/adj_t1_1.pdf', 245890, 'application/pdf', 2, 1, @Hace3Dias),
                    (@T1_ID, 1, 'Especificaciones_Tecnicas_Red.pdf', 'adj_t1_2.pdf', 'Uploads/2026/adj_t1_2.pdf', 589410, 'application/pdf', 2, 1, @Hace3Dias),
                    (@T2_ID, 1, 'Requerimiento_Certificados_BancoUnion.pdf', 'adj_t2_1.pdf', 'Uploads/2026/adj_t2_1.pdf', 182300, 'application/pdf', 2, 1, @Hace10Dias),
                    (@T3_ID, 1, 'Contrato_DataCenter_AndinaSRL.pdf', 'adj_t3_1.pdf', 'Uploads/2026/adj_t3_1.pdf', 1240500, 'application/pdf', 2, 1, @Ayer);
                END;";
            using (var cmd = new SqlCommand(tramitesSeedSql, conn)) await cmd.ExecuteNonQueryAsync();

            Console.WriteLine("\n🎉 ¡Datos iniciales y de prueba sembrados exitosamente en SQL Server!");
            Console.WriteLine("Credenciales disponibles (Contraseña para todos: admin123):");
            Console.WriteLine("  • admin      : Administrador General del Sistema y Trámites");
            Console.WriteLine("  • mfernandez : Encargada de Ventanilla Única");
            Console.WriteLine("  • acaceres   : Técnico de Ventanilla Única");
            Console.WriteLine("  • eleano     : Director General Ejecutivo");
            Console.WriteLine("  • jsanchez   : Asesor Jurídico");
            Console.WriteLine("  • cmamani    : Analista de Sistemas (Funcionario)");
            Console.WriteLine("Catálogos sembrados:");
            Console.WriteLine("  • TUnidad    : 10 unidades activas");
            Console.WriteLine("  • TCargo     : 14 cargos oficiales");
            Console.WriteLine("  • TEmpleados : 10 funcionarios con CI y contacto");
            Console.WriteLine("============================================================\n");
        }
    }
}
