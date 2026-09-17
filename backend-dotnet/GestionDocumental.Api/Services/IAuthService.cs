using System.Threading.Tasks;
using GestionDocumental.Api.DTOs.Auth;
using GestionDocumental.Api.DTOs.Common;

namespace GestionDocumental.Api.Services
{
    public interface IAuthService
    {
        Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request);
        Task<ApiResponse<UserDto>> GetProfileAsync(int userId, int? activeRolId, int? activeUbicacionId);
        Task<ApiResponse> ChangePasswordAsync(int userId, ChangePasswordRequest request);
        Task<ApiResponse<SwitchRoleResponse>> SwitchRoleAsync(int userId, SwitchRoleRequest request);
    }
}
