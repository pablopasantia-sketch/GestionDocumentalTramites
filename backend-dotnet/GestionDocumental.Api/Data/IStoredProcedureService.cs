using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;

namespace GestionDocumental.Api.Data
{
    public interface IStoredProcedureService
    {
        Task<List<T>> QueryAsync<T>(string storedProcedureName, Func<SqlDataReader, T> map, params SqlParameter[] parameters);
        Task<T?> QueryFirstOrDefaultAsync<T>(string storedProcedureName, Func<SqlDataReader, T> map, params SqlParameter[] parameters);
        Task<int> ExecuteNonQueryAsync(string storedProcedureName, params SqlParameter[] parameters);
        Task<T?> ExecuteScalarAsync<T>(string storedProcedureName, params SqlParameter[] parameters);
        Task ExecuteMultiReaderAsync(string storedProcedureName, Func<SqlDataReader, Task> readerAction, params SqlParameter[] parameters);
    }
}
