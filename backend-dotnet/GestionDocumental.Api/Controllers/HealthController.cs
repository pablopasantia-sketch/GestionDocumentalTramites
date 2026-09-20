using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HealthController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetHealth()
        {
            try
            {
                bool canConnect = await _context.Database.CanConnectAsync();
                var connection = _context.Database.GetDbConnection();
                var uptime = (int)(DateTime.UtcNow - System.Diagnostics.Process.GetCurrentProcess().StartTime.ToUniversalTime()).TotalSeconds;

                var data = new
                {
                    status = canConnect ? "OK" : "ERROR",
                    framework = ".NET 8.0 LTS Web API",
                    environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development",
                    uptimeSeconds = uptime,
                    database = new
                    {
                        connected = canConnect,
                        engine = "Microsoft SQL Server 2022 (Docker)",
                        server = connection.DataSource,
                        databaseName = connection.Database,
                        provider = "Microsoft.EntityFrameworkCore.SqlServer",
                        status = canConnect ? "Conectado" : "Desconectado"
                    },
                    serverTime = DateTime.UtcNow
                };

                return Ok(ApiResponse<object>.Ok(data, "Servicio backend operativo"));
            }
            catch (Exception ex)
            {
                var errorData = new
                {
                    status = "ERROR",
                    framework = ".NET 8.0 LTS Web API",
                    database = new
                    {
                        connected = false,
                        engine = "Microsoft SQL Server 2022",
                        error = ex.Message,
                        status = "Error de conexión"
                    },
                    serverTime = DateTime.UtcNow
                };

                return StatusCode(500, ApiResponse<object>.Fail("Fallo de conexión", errorData));
            }
        }
    }
}
