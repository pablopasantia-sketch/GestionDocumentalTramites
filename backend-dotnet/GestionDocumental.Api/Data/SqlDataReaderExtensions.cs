using System;
using System.Data;
using Microsoft.Data.SqlClient;

namespace GestionDocumental.Api.Data
{
    public static class SqlDataReaderExtensions
    {
        private static int GetOrdinalSafe(SqlDataReader reader, string columnName)
        {
            try
            {
                return reader.GetOrdinal(columnName);
            }
            catch (IndexOutOfRangeException)
            {
                return -1;
            }
        }

        public static string? GetNullableString(this SqlDataReader reader, string columnName)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return null;
            return Convert.ToString(reader.GetValue(ordinal));
        }

        public static string GetSafeString(this SqlDataReader reader, string columnName, string defaultValue = "")
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return defaultValue;
            return Convert.ToString(reader.GetValue(ordinal)) ?? defaultValue;
        }

        public static int? GetNullableInt32(this SqlDataReader reader, string columnName)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return null;
            return reader.GetInt32(ordinal);
        }

        public static int GetSafeInt32(this SqlDataReader reader, string columnName, int defaultValue = 0)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return defaultValue;
            return Convert.ToInt32(reader.GetValue(ordinal));
        }

        public static short? GetNullableInt16(this SqlDataReader reader, string columnName)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return null;
            return Convert.ToInt16(reader.GetValue(ordinal));
        }

        public static short GetSafeInt16(this SqlDataReader reader, string columnName, short defaultValue = 0)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return defaultValue;
            return Convert.ToInt16(reader.GetValue(ordinal));
        }

        public static long? GetNullableInt64(this SqlDataReader reader, string columnName)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return null;
            return Convert.ToInt64(reader.GetValue(ordinal));
        }

        public static long GetSafeInt64(this SqlDataReader reader, string columnName, long defaultValue = 0)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return defaultValue;
            return Convert.ToInt64(reader.GetValue(ordinal));
        }

        public static bool? GetNullableBoolean(this SqlDataReader reader, string columnName)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return null;
            return Convert.ToBoolean(reader.GetValue(ordinal));
        }

        public static bool GetSafeBoolean(this SqlDataReader reader, string columnName, bool defaultValue = false)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return defaultValue;
            return Convert.ToBoolean(reader.GetValue(ordinal));
        }

        public static DateTime? GetNullableDateTime(this SqlDataReader reader, string columnName)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return null;
            return reader.GetDateTime(ordinal);
        }

        public static DateTime GetSafeDateTime(this SqlDataReader reader, string columnName)
        {
            int ordinal = GetOrdinalSafe(reader, columnName);
            if (ordinal < 0 || reader.IsDBNull(ordinal)) return DateTime.MinValue;
            return reader.GetDateTime(ordinal);
        }
    }
}
