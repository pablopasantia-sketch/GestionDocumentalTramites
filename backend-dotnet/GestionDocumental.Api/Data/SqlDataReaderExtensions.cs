using System;
using System.Data;
using Microsoft.Data.SqlClient;

namespace GestionDocumental.Api.Data
{
    public static class SqlDataReaderExtensions
    {
        public static string? GetNullableString(this SqlDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }

        public static string GetSafeString(this SqlDataReader reader, string columnName, string defaultValue = "")
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : reader.GetString(ordinal);
        }

        public static int? GetNullableInt32(this SqlDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetInt32(ordinal);
        }

        public static int GetSafeInt32(this SqlDataReader reader, string columnName, int defaultValue = 0)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : Convert.ToInt32(reader.GetValue(ordinal));
        }

        public static short? GetNullableInt16(this SqlDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : Convert.ToInt16(reader.GetValue(ordinal));
        }

        public static short GetSafeInt16(this SqlDataReader reader, string columnName, short defaultValue = 0)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : Convert.ToInt16(reader.GetValue(ordinal));
        }

        public static long? GetNullableInt64(this SqlDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : Convert.ToInt64(reader.GetValue(ordinal));
        }

        public static long GetSafeInt64(this SqlDataReader reader, string columnName, long defaultValue = 0)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : Convert.ToInt64(reader.GetValue(ordinal));
        }

        public static bool? GetNullableBoolean(this SqlDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : Convert.ToBoolean(reader.GetValue(ordinal));
        }

        public static bool GetSafeBoolean(this SqlDataReader reader, string columnName, bool defaultValue = false)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? defaultValue : Convert.ToBoolean(reader.GetValue(ordinal));
        }

        public static DateTime? GetNullableDateTime(this SqlDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
        }

        public static DateTime GetSafeDateTime(this SqlDataReader reader, string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? DateTime.MinValue : reader.GetDateTime(ordinal);
        }
    }
}
