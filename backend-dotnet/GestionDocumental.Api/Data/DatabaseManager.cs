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
                ?? "Server=127.0.0.1,1433;Database=DBNotasCMS;User Id=sa;Password=SqlAdminSucre2026!;TrustServerCertificate=True;MultipleActiveResultSets=True;";
            
            var builder = new SqlConnectionStringBuilder(_connectionString);
            _databaseName = string.IsNullOrWhiteSpace(builder.InitialCatalog) ? "DBNotasCMS" : builder.InitialCatalog;

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

            // 2. Organigrama (Ubicaciones Orgánicas)
            Console.WriteLine("🔹 Sembrando Organigrama Institucional...");
            var ubiSql = @"
                SET IDENTITY_INSERT dbo.ubicaciones_org ON;
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 1)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo) VALUES (1, 'DIR-GEN', 'Dirección General Ejecutiva', 'DGE', NULL, 1, 'Máxima Autoridad Ejecutiva de la institución', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 2)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo) VALUES (2, 'SEC-GEN', 'Secretaría General', 'SG', 1, 2, 'Secretaría y Despacho General', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 3)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo) VALUES (3, 'VENT-UNI', 'Ventanilla Única de Correspondencia', 'VU', 2, 3, 'Recepción y despacho central de documentos', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 4)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo) VALUES (4, 'DIR-JUR', 'Dirección Jurídica', 'DJ', 1, 2, 'Asesoría y dictámenes legales', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 5)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo) VALUES (5, 'DIR-ADM', 'Dirección Administrativa Financiera', 'DAF', 1, 2, 'Gestión de recursos humanos, materiales y financieros', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE id = 6)
                    INSERT INTO dbo.ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo) VALUES (6, 'UNI-SIS', 'Unidad de Tecnologías de Información y Sistemas', 'UTIC', 5, 3, 'Soporte y desarrollo de sistemas informáticos', 1);
                SET IDENTITY_INSERT dbo.ubicaciones_org OFF;";
            using (var cmd = new SqlCommand(ubiSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 3. Personas Iniciales
            Console.WriteLine("🔹 Sembrando Personas...");
            var perSql = @"
                SET IDENTITY_INSERT dbo.personas ON;
                IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE id = 1)
                    INSERT INTO dbo.personas (id, nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, direccion, activo) VALUES (1, 'Administrador', 'Sistema', 'General', '1000001', 'CH', 'M', 'SOLTERO', '70012345', 'admin@gob.bo', 'ENTEL', 'Oficina Central Sucre', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE id = 2)
                    INSERT INTO dbo.personas (id, nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, direccion, activo) VALUES (2, 'María', 'Fernández', 'Rojas', '2000002', 'CH', 'F', 'SOLTERA', '70054321', 'mfernandez@gob.bo', 'TIGO', 'Av. Hernando Siles #123', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE id = 3)
                    INSERT INTO dbo.personas (id, nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, direccion, activo) VALUES (3, 'Carlos', 'Mamani', 'Quispe', '3000003', 'CH', 'M', 'CASADO', '70098765', 'cmamani@gob.bo', 'ENTEL', 'Calle Calvo #456', 1);
                SET IDENTITY_INSERT dbo.personas OFF;";
            using (var cmd = new SqlCommand(perSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 4. Usuarios Iniciales (Password: admin123)
            Console.WriteLine("🔹 Sembrando Usuarios con Hashes BCrypt...");
            var hash = BCrypt.Net.BCrypt.HashPassword("admin123", workFactor: 10);
            var usrSql = @"
                SET IDENTITY_INSERT dbo.usuarios ON;
                IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE id = 1)
                    INSERT INTO dbo.usuarios (id, persona_id, login, password_hash, cargo, activo) VALUES (1, 1, 'admin', @hash, 'Administrador General', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE id = 2)
                    INSERT INTO dbo.usuarios (id, persona_id, login, password_hash, cargo, activo) VALUES (2, 2, 'mfernandez', @hash, 'Responsable de Ventanilla Única', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE id = 3)
                    INSERT INTO dbo.usuarios (id, persona_id, login, password_hash, cargo, activo) VALUES (3, 3, 'cmamani', @hash, 'Analista de Sistemas', 1);
                SET IDENTITY_INSERT dbo.usuarios OFF;";
            using (var cmd = new SqlCommand(usrSql, conn))
            {
                cmd.Parameters.AddWithValue("@hash", hash);
                await cmd.ExecuteNonQueryAsync();
            }

            // 5. Asignación de Roles
            Console.WriteLine("🔹 Sembrando Asignación de Roles (Multi-Rol)...");
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
                SET IDENTITY_INSERT dbo.usuario_roles OFF;";
            using (var cmd = new SqlCommand(rolAsignSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 6. Tipos de Proceso
            Console.WriteLine("🔹 Sembrando Tipos de Proceso y SLA...");
            var procSql = @"
                SET IDENTITY_INSERT dbo.tipos_proceso ON;
                IF NOT EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE id = 1)
                    INSERT INTO dbo.tipos_proceso (id, codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo) VALUES (1, 'SV', 'Solicitud de Vacaciones', 'Trámite interno para la solicitud y aprobación de vacaciones de personal', 'TRAMITE', 5, 0, 48, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE id = 2)
                    INSERT INTO dbo.tipos_proceso (id, codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo) VALUES (2, 'CM', 'Compra Menor', 'Trámite de adquisición de bienes o servicios menores', 'TRAMITE', 5, 0, 72, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE id = 3)
                    INSERT INTO dbo.tipos_proceso (id, codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo) VALUES (3, 'CORR-EXT', 'Correspondencia Externa', 'Recepción y derivación de notas, cartas y solicitudes externas', 'CORRESPONDENCIA', 3, 0, 24, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE id = 4)
                    INSERT INTO dbo.tipos_proceso (id, codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo) VALUES (4, 'MEMO', 'Memorándum Interno', 'Comunicaciones oficiales y circulares entre unidades', 'CORRESPONDENCIA', 2, 0, 24, 1);
                SET IDENTITY_INSERT dbo.tipos_proceso OFF;";
            using (var cmd = new SqlCommand(procSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 7. Parámetros Generales
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

            // 8. Tablas Institucionales (Sprint 2 - DBNotasCMS)
            Console.WriteLine("🔹 Sembrando Unidades, Cargos y Empleados Institucionales (DBNotasCMS)...");
            var instSql = @"
                -- TUnidad
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 1)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (1, 'DIRECCION GENERAL EJECUTIVA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 2)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (2, 'SECRETARIA GENERAL', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 3)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (3, 'VENTANILLA UNICA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 4)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (4, 'DIRECCION JURIDICA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 5)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (5, 'DIRECCION ADMINISTRATIVA FINANCIERA', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TUnidad WHERE CodU = 6)
                    INSERT INTO dbo.TUnidad (CodU, NombU, Activo) VALUES (6, 'UNIDAD DE SISTEMAS Y TECNOLOGIAS', 1);

                -- TCargo
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 1)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (1, 'DIRECTOR GENERAL', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 2)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (2, 'SECRETARIO GENERAL', 2);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 3)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (3, 'ENCARGADO DE VENTANILLA UNICA', 3);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 4)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (4, 'ASESOR JURIDICO', 4);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 5)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (5, 'DIRECTOR ADMINISTRATIVO', 5);
                IF NOT EXISTS (SELECT 1 FROM dbo.TCargo WHERE CodCargo = 6)
                    INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU) VALUES (6, 'ANALISTA DE SISTEMAS', 6);

                -- TEmpleados
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 1000001)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo) VALUES (1000001, 'SISTEMA GENERAL', 'ADMINISTRADOR', 'Oficina Central Sucre', 70012345, 'admin@gob.bo', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 2000002)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo) VALUES (2000002, 'FERNANDEZ ROJAS', 'MARIA', 'Av. Hernando Siles #123', 70054321, 'mfernandez@gob.bo', 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = 3000003)
                    INSERT INTO dbo.TEmpleados (CI, Apellidos, Nombres, Direccion, Cel, Email, Activo) VALUES (3000003, 'MAMANI QUISPE', 'CARLOS', 'Calle Calvo #456', 70098765, 'cmamani@gob.bo', 1);
            ";
            using (var cmd = new SqlCommand(instSql, conn)) await cmd.ExecuteNonQueryAsync();

            Console.WriteLine("\n🎉 ¡Datos iniciales sembrados exitosamente en SQL Server!");
            Console.WriteLine("Credenciales por defecto:");
            Console.WriteLine("  • Usuario: admin       | Contraseña: admin123 (Roles: ADMIN_SISTEMA, ADMIN_TRAMITES)");
            Console.WriteLine("  • Usuario: mfernandez  | Contraseña: admin123 (Rol: VENTANILLA_UNICA)");
            Console.WriteLine("  • Usuario: cmamani     | Contraseña: admin123 (Rol: FUNCIONARIO)");
            Console.WriteLine("Tablas institucionales sembradas:");
            Console.WriteLine("  • TUnidad: 6 unidades activas");
            Console.WriteLine("  • TCargo: 6 cargos institucionales");
            Console.WriteLine("  • TEmpleados: 3 empleados de prueba");
            Console.WriteLine("============================================================\n");
        }
    }
}
