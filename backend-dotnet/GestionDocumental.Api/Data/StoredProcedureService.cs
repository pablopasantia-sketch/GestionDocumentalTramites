using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace GestionDocumental.Api.Data
{
    public class StoredProcedureService : IStoredProcedureService
    {
        private readonly string _connectionString;

        public StoredProcedureService(IConfiguration config)
        {
            _connectionString = config.GetConnectionString("DefaultConnection") 
                ?? "Server=127.0.0.1,1433;Database=DB_TRAMITES_EXTERNOS;User Id=sa;Password=SqlAdminSucre2026!;TrustServerCertificate=True;MultipleActiveResultSets=True;";
        }

        public async Task<List<T>> QueryAsync<T>(string storedProcedureName, Func<SqlDataReader, T> map, params SqlParameter[] parameters)
        {
            var results = new List<T>();
            using var connection = new SqlConnection(_connectionString);
            using var command = new SqlCommand(storedProcedureName, connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            if (parameters != null && parameters.Length > 0)
            {
                command.Parameters.AddRange(parameters);
            }

            await connection.OpenAsync();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(map(reader));
            }

            return results;
        }

        public async Task<T?> QueryFirstOrDefaultAsync<T>(string storedProcedureName, Func<SqlDataReader, T> map, params SqlParameter[] parameters)
        {
            using var connection = new SqlConnection(_connectionString);
            using var command = new SqlCommand(storedProcedureName, connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            if (parameters != null && parameters.Length > 0)
            {
                command.Parameters.AddRange(parameters);
            }

            await connection.OpenAsync();
            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return map(reader);
            }

            return default;
        }

        public async Task<int> ExecuteNonQueryAsync(string storedProcedureName, params SqlParameter[] parameters)
        {
            using var connection = new SqlConnection(_connectionString);
            using var command = new SqlCommand(storedProcedureName, connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            if (parameters != null && parameters.Length > 0)
            {
                command.Parameters.AddRange(parameters);
            }

            await connection.OpenAsync();
            int rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected;
        }

        public async Task<T?> ExecuteScalarAsync<T>(string storedProcedureName, params SqlParameter[] parameters)
        {
            using var connection = new SqlConnection(_connectionString);
            using var command = new SqlCommand(storedProcedureName, connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            if (parameters != null && parameters.Length > 0)
            {
                command.Parameters.AddRange(parameters);
            }

            await connection.OpenAsync();
            object? result = await command.ExecuteScalarAsync();
            if (result == null || result is DBNull)
            {
                return default;
            }

            return (T)Convert.ChangeType(result, typeof(T));
        }

        public async Task ExecuteMultiReaderAsync(string storedProcedureName, Func<SqlDataReader, Task> readerAction, params SqlParameter[] parameters)
        {
            using var connection = new SqlConnection(_connectionString);
            using var command = new SqlCommand(storedProcedureName, connection)
            {
                CommandType = CommandType.StoredProcedure
            };

            if (parameters != null && parameters.Length > 0)
            {
                command.Parameters.AddRange(parameters);
            }

            await connection.OpenAsync();
            using var reader = await command.ExecuteReaderAsync();
            await readerAction(reader);
        }
    }
}
