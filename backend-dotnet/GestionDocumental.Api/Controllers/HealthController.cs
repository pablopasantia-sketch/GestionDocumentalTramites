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
                var data = new
                {
                    status = canConnect ? "OK" : "ERROR",
                    database = canConnect ? "Conectado" : "Desconectado",
                    framework = ".NET 8.0 Web API",
                    serverTime = DateTime.UtcNow
                };

                return Ok(ApiResponse<object>.Ok(data, "Servicio backend operativo"));
            }
            catch (Exception ex)
            {
                var errorData = new
                {
                    status = "ERROR",
                    database = "Error de conexión",
                    error = ex.Message,
                    serverTime = DateTime.UtcNow
                };

                return StatusCode(500, ApiResponse<object>.Fail("Fallo de conexión", errorData));
            }
        }
    }
}
