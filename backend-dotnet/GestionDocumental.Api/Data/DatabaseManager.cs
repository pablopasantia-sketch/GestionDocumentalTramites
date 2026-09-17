using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
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
                ?? "Server=127.0.0.1;Port=3306;Database=gestion_documental_db;User=root;Password=12345;CharSet=utf8mb4;";
            
            var builder = new MySqlConnectionStringBuilder(_connectionString);
            _databaseName = string.IsNullOrWhiteSpace(builder.Database) ? "gestion_documental_db" : builder.Database;

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

        private MySqlConnection GetServerConnection()
        {
            var builder = new MySqlConnectionStringBuilder(_connectionString)
            {
                Database = "" // Conexión a nivel servidor
            };
            return new MySqlConnection(builder.ConnectionString);
        }

        private MySqlConnection GetDatabaseConnection()
        {
            var builder = new MySqlConnectionStringBuilder(_connectionString)
            {
                Database = _databaseName,
                AllowUserVariables = true
            };
            return new MySqlConnection(builder.ConnectionString);
        }

        public async Task<bool> EnsureDatabaseExistsAsync()
        {
            using var conn = GetServerConnection();
            await conn.OpenAsync();

            var sql = $"CREATE DATABASE IF NOT EXISTS `{_databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
            using var cmd = new MySqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
            return true;
        }

        public async Task<bool> EnsureMigrationTableAsync()
        {
            await EnsureDatabaseExistsAsync();

            using var conn = GetDatabaseConnection();
            await conn.OpenAsync();

            var sql = @"
                CREATE TABLE IF NOT EXISTS `_migrations` (
                  `id` INT AUTO_INCREMENT PRIMARY KEY,
                  `name` VARCHAR(255) NOT NULL,
                  `batch` INT NOT NULL DEFAULT 1,
                  `executed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE KEY `uk_migration_name` (`name`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

            using var cmd = new MySqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
            return true;
        }

        /// <summary>
        /// db:init - Inicializa la base de datos y ejecuta todas las migraciones pendientes
        /// </summary>
        public async Task InitDbAsync()
        {
            Console.WriteLine("\n============================================================");
            Console.WriteLine($"🚀 INICIALIZANDO BASE DE DATOS: {_databaseName}");
            Console.WriteLine("============================================================");

            await EnsureDatabaseExistsAsync();
            Console.WriteLine($"✅ Base de datos '{_databaseName}' verificada/creada.");

            await EnsureMigrationTableAsync();
            Console.WriteLine("✅ Tabla de control de migraciones `_migrations` lista.");

            await MigrateUpAsync();

            // Listar tablas creadas
            using var conn = GetDatabaseConnection();
            await conn.OpenAsync();

            using var cmd = new MySqlCommand("SHOW TABLES;", conn);
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

            using (var cmd = new MySqlCommand("SELECT name, batch FROM `_migrations`;", conn))
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

                using var tx = await conn.BeginTransactionAsync();
                try
                {
                    using var execCmd = new MySqlCommand(sql, conn, tx);
                    await execCmd.ExecuteNonQueryAsync();

                    using var recordCmd = new MySqlCommand("INSERT INTO `_migrations` (`name`, `batch`) VALUES (@name, @batch);", conn, tx);
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

            using (var cmd = new MySqlCommand("SELECT name, batch, executed_at FROM `_migrations` ORDER BY id ASC;", conn))
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

            Console.WriteLine("🧹 Desactivando chequeo de claves foráneas y eliminando tablas...");
            using (var cmd = new MySqlCommand("SET FOREIGN_KEY_CHECKS = 0;", conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            var tables = new List<string>();
            using (var cmd = new MySqlCommand("SHOW TABLES;", conn))
            using (var reader = await cmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    tables.Add(reader.GetString(0));
                }
            }

            foreach (var table in tables)
            {
                using var dropCmd = new MySqlCommand($"DROP TABLE IF EXISTS `{table}`;", conn);
                await dropCmd.ExecuteNonQueryAsync();
            }

            using (var cmd = new MySqlCommand("SET FOREIGN_KEY_CHECKS = 1;", conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            Console.WriteLine($"✅ {tables.Count} tablas eliminadas.");

            await MigrateUpAsync();
        }

        /// <summary>
        /// db:seed - Inserta datos semilla estándar y neutros para desarrollo y pruebas
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
                INSERT INTO `roles` (`id`, `codigo`, `nombre`, `descripcion`, `activo`) VALUES
                (1, 'ADMIN_SISTEMA', 'Administrador de Sistema', 'Gestión de usuarios, personas, organigrama y parámetros base del sistema', 1),
                (2, 'ADMIN_TRAMITES', 'Administrador de Trámites', 'Gestión operativa de trámites, anulación, redirección y reportes de transparencia', 1),
                (3, 'VENTANILLA_UNICA', 'Ventanilla Única', 'Recepción de trámites, registro de correspondencias, emisión de hojas de ruta y bloqueo', 1),
                (4, 'FUNCIONARIO', 'Funcionario', 'Atención de trámites, proveídos, adjuntos y derivación en escritorio virtual', 1)
                ON DUPLICATE KEY UPDATE `codigo` = VALUES(`codigo`), `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`), `activo` = 1;";
            using (var cmd = new MySqlCommand(rolesSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 2. Organigrama (Ubicaciones Orgánicas)
            Console.WriteLine("🔹 Sembrando Organigrama Institucional...");
            var ubiSql = @"
                INSERT INTO `ubicaciones_org` (`id`, `codigo`, `nombre`, `sigla`, `padre_id`, `nivel`, `descripcion`, `activo`) VALUES
                (1, 'DIR-GEN', 'Dirección General Ejecutiva', 'DGE', NULL, 1, 'Máxima Autoridad Ejecutiva de la institución', 1),
                (2, 'SEC-GEN', 'Secretaría General', 'SG', 1, 2, 'Secretaría y Despacho General', 1),
                (3, 'VENT-UNI', 'Ventanilla Única de Correspondencia', 'VU', 2, 3, 'Recepción y despacho central de documentos', 1),
                (4, 'DIR-JUR', 'Dirección Jurídica', 'DJ', 1, 2, 'Asesoría y dictámenes legales', 1),
                (5, 'DIR-ADM', 'Dirección Administrativa Financiera', 'DAF', 1, 2, 'Gestión de recursos humanos, materiales y financieros', 1),
                (6, 'UNI-SIS', 'Unidad de Tecnologías de Información y Sistemas', 'UTIC', 5, 3, 'Soporte y desarrollo de sistemas informáticos', 1)
                ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `sigla` = VALUES(`sigla`), `activo` = 1;";
            using (var cmd = new MySqlCommand(ubiSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 3. Personas Iniciales
            Console.WriteLine("🔹 Sembrando Personas...");
            var perSql = @"
                INSERT INTO `personas` (`id`, `nombres`, `apellido_paterno`, `apellido_materno`, `ci`, `ci_expedido`, `sexo`, `estado_civil`, `telefono`, `email`, `empresa_telefonica`, `direccion`, `activo`) VALUES
                (1, 'Administrador', 'Sistema', 'General', '1000001', 'CH', 'M', 'SOLTERO', '70012345', 'admin@gob.bo', 'ENTEL', 'Oficina Central Sucre', 1),
                (2, 'María', 'Fernández', 'Rojas', '2000002', 'CH', 'F', 'SOLTERA', '70054321', 'mfernandez@gob.bo', 'TIGO', 'Av. Hernando Siles #123', 1),
                (3, 'Carlos', 'Mamani', 'Quispe', '3000003', 'CH', 'M', 'CASADO', '70098765', 'cmamani@gob.bo', 'ENTEL', 'Calle Calvo #456', 1)
                ON DUPLICATE KEY UPDATE `nombres` = VALUES(`nombres`), `email` = VALUES(`email`), `activo` = 1;";
            using (var cmd = new MySqlCommand(perSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 4. Usuarios Iniciales (Password: admin123)
            Console.WriteLine("🔹 Sembrando Usuarios con Hashes BCrypt...");
            var hash = BCrypt.Net.BCrypt.HashPassword("admin123", workFactor: 10);
            var usrSql = @"
                INSERT INTO `usuarios` (`id`, `persona_id`, `login`, `password_hash`, `cargo`, `activo`) VALUES
                (1, 1, 'admin', @hash, 'Administrador General', 1),
                (2, 2, 'mfernandez', @hash, 'Responsable de Ventanilla Única', 1),
                (3, 3, 'cmamani', @hash, 'Analista de Sistemas', 1)
                ON DUPLICATE KEY UPDATE `login` = VALUES(`login`), `password_hash` = VALUES(`password_hash`), `cargo` = VALUES(`cargo`), `activo` = 1;";
            using (var cmd = new MySqlCommand(usrSql, conn))
            {
                cmd.Parameters.AddWithValue("@hash", hash);
                await cmd.ExecuteNonQueryAsync();
            }

            // 5. Asignación de Roles
            Console.WriteLine("🔹 Sembrando Asignación de Roles (Multi-Rol)...");
            var rolAsignSql = @"
                INSERT INTO `usuario_roles` (`id`, `usuario_id`, `rol_id`, `ubicacion_org_id`, `nivel_acceso`, `fecha_expiracion`, `es_principal`, `activo`) VALUES
                (1, 1, 1, 6, 'CONTROL_TOTAL', '2030-12-31', 1, 1),
                (2, 1, 2, 6, 'CONTROL_TOTAL', '2030-12-31', 0, 1),
                (3, 2, 3, 3, 'CONTROL_TOTAL', '2030-12-31', 1, 1),
                (4, 3, 4, 6, 'CONTROL_TOTAL', '2030-12-31', 1, 1)
                ON DUPLICATE KEY UPDATE `nivel_acceso` = VALUES(`nivel_acceso`), `es_principal` = VALUES(`es_principal`), `activo` = 1;";
            using (var cmd = new MySqlCommand(rolAsignSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 6. Tipos de Proceso
            Console.WriteLine("🔹 Sembrando Tipos de Proceso y SLA...");
            var procSql = @"
                INSERT INTO `tipos_proceso` (`id`, `codigo`, `nombre`, `descripcion`, `tipo_categoria`, `ubicacion_org_id`, `correlativo_seq`, `tiempo_estimado_horas`, `activo`) VALUES
                (1, 'SV', 'Solicitud de Vacaciones', 'Trámite interno para la solicitud y aprobación de vacaciones de personal', 'TRAMITE', 5, 0, 48, 1),
                (2, 'CM', 'Compra Menor', 'Trámite de adquisición de bienes o servicios menores', 'TRAMITE', 5, 0, 72, 1),
                (3, 'CORR-EXT', 'Correspondencia Externa', 'Recepción y derivación de notas, cartas y solicitudes externas', 'CORRESPONDENCIA', 3, 0, 24, 1),
                (4, 'MEMO', 'Memorándum Interno', 'Comunicaciones oficiales y circulares entre unidades', 'CORRESPONDENCIA', 2, 0, 24, 1)
                ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `activo` = 1;";
            using (var cmd = new MySqlCommand(procSql, conn)) await cmd.ExecuteNonQueryAsync();

            // 7. Parámetros Generales
            Console.WriteLine("🔹 Sembrando Parámetros Institucionales...");
            var paramSql = @"
                INSERT INTO `parametros` (`clave`, `valor`, `tipo_dato`, `descripcion`, `editable`) VALUES
                ('INSTITUCION_NOMBRE', 'Gobierno Autónomo Municipal de Sucre', 'STRING', 'Nombre oficial de la institución que utiliza el sistema', 1),
                ('INSTITUCION_SIGLA', 'GAMS', 'STRING', 'Sigla de la institución', 1),
                ('GESTION_ACTIVA', '2026', 'INTEGER', 'Gestión fiscal / año calendario activo para trámites', 1),
                ('CORRELATIVO_AUTO_RESET', 'TRUE', 'BOOLEAN', 'Reinicio automático de correlativo anual', 1)
                ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`), `descripcion` = VALUES(`descripcion`);";
            using (var cmd = new MySqlCommand(paramSql, conn)) await cmd.ExecuteNonQueryAsync();

            Console.WriteLine("\n🎉 ¡Datos iniciales sembrados exitosamente!");
            Console.WriteLine("Credenciales por defecto:");
            Console.WriteLine("  • Usuario: admin       | Contraseña: admin123 (Roles: ADMIN_SISTEMA, ADMIN_TRAMITES)");
            Console.WriteLine("  • Usuario: mfernandez  | Contraseña: admin123 (Rol: VENTANILLA_UNICA)");
            Console.WriteLine("  • Usuario: cmamani     | Contraseña: admin123 (Rol: FUNCIONARIO)");
            Console.WriteLine("============================================================\n");
        }
    }
}
