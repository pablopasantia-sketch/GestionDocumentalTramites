using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GestionDocumental.Api.DTOs.Auth;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.Services;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<AuthResponse>.Fail("Datos de solicitud inválidos."));
            }

            var result = await _authService.LoginAsync(request);
            if (!result.Success)
            {
                return Unauthorized(result);
            }

            return Ok(result);
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(ApiResponse<UserDto>.Fail("Token inválido o expirado."));
            }

            int? activeRolId = int.TryParse(User.FindFirst("rolId")?.Value, out int rId) ? rId : null;
            int? activeUbicacionId = int.TryParse(User.FindFirst("ubicacionOrgId")?.Value, out int uId) ? uId : null;

            var result = await _authService.GetProfileAsync(userId, activeRolId, activeUbicacionId);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Datos de solicitud inválidos."));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(ApiResponse.ErrorResult("Token inválido o expirado."));
            }

            var result = await _authService.ChangePasswordAsync(userId, request);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [Authorize]
        [HttpPost("switch-role")]
        public async Task<IActionResult> SwitchRole([FromBody] SwitchRoleRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<SwitchRoleResponse>.Fail("Datos de solicitud inválidos."));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(ApiResponse<SwitchRoleResponse>.Fail("Token inválido o expirado."));
            }

            var result = await _authService.SwitchRoleAsync(userId, request);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
    }
}
