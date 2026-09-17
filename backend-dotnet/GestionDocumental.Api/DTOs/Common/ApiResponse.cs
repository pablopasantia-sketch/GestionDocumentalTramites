using System;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Common
{
    public class ApiResponse<T>
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("data")]
        public T? Data { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public static ApiResponse<T> Ok(T? data, string message = "Operación exitosa")
        {
            return new ApiResponse<T>
            {
                Success = true,
                Data = data,
                Message = message,
                Timestamp = DateTime.UtcNow
            };
        }

        public static ApiResponse<T> Fail(string message, T? data = default)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Data = data,
                Message = message,
                Timestamp = DateTime.UtcNow
            };
        }
    }

    public class ApiResponse : ApiResponse<object>
    {
        public static ApiResponse SuccessResult(string message = "Operación exitosa")
        {
            return new ApiResponse
            {
                Success = true,
                Data = null,
                Message = message,
                Timestamp = DateTime.UtcNow
            };
        }

        public static ApiResponse ErrorResult(string message)
        {
            return new ApiResponse
            {
                Success = false,
                Data = null,
                Message = message,
                Timestamp = DateTime.UtcNow
            };
        }
    }
}
