using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Institucional;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InstitucionalController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public InstitucionalController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        /// <summary>
        /// Obtiene todas las unidades institucionales (TUnidad)
        /// </summary>
        [HttpGet("unidades")]
        public async Task<IActionResult> GetUnidades([FromQuery] bool? activo = null)
        {
            var unidades = await _sp.QueryAsync(
                "dbo.usp_TUnidad_Listar",
                reader => new
                {
                    CodU = reader.GetSafeInt16("CodU"),
                    NombU = reader.GetSafeString("NombU"),
                    Activo = reader.GetSafeBoolean("Activo", true),
                    TotalCargos = 0
                },
                new SqlParameter("@Activo", SqlDbType.Bit) { Value = (object?)activo ?? DBNull.Value }
            );

            return Ok(ApiResponse<object>.Ok(unidades, "Unidades institucionales obtenidas exitosamente"));
        }

        /// <summary>
        /// Crea una nueva unidad institucional (TUnidad)
        /// </summary>
        [HttpPost("unidades")]
        public async Task<IActionResult> CreateUnidad([FromBody] CrearUnidadDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.Fail("Datos de unidad inválidos", ModelState));
            }

            var outParam = new SqlParameter("@NuevoCodU", SqlDbType.SmallInt) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TUnidad_Insertar",
                    new SqlParameter("@NombU", SqlDbType.VarChar, 50) { Value = request.NombU.Trim().ToUpper() },
                    outParam
                );

                short nuevoCod = (short)outParam.Value;

                var nuevaUnidad = new TUnidad
                {
                    CodU = nuevoCod,
                    NombU = request.NombU.Trim().ToUpper(),
                    Activo = request.Activo
                };

                return CreatedAtAction(nameof(GetUnidades), new { activo = true }, ApiResponse<object>.Ok(nuevaUnidad, "Unidad institucional creada con éxito"));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Actualiza una unidad institucional existente (TUnidad)
        /// </summary>
        [HttpPut("unidades/{codU:int}")]
        public async Task<IActionResult> UpdateUnidad(short codU, [FromBody] ActualizarUnidadDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.Fail("Datos de unidad inválidos", ModelState));
            }

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TUnidad_Actualizar",
                    new SqlParameter("@CodU", SqlDbType.SmallInt) { Value = codU },
                    new SqlParameter("@NombU", SqlDbType.VarChar, 50) { Value = request.NombU.Trim().ToUpper() },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = request.Activo }
                );

                var unidad = new TUnidad
                {
                    CodU = codU,
                    NombU = request.NombU.Trim().ToUpper(),
                    Activo = request.Activo
                };

                return Ok(ApiResponse<object>.Ok(unidad, "Unidad institucional actualizada con éxito"));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Elimina o da de baja lógica a una unidad institucional (TUnidad)
        /// </summary>
        [HttpDelete("unidades/{codU:int}")]
        public async Task<IActionResult> DeleteUnidad(short codU)
        {
            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TUnidad_EliminarLogico",
                    new SqlParameter("@CodU", SqlDbType.SmallInt) { Value = codU }
                );

                return Ok(ApiResponse<object>.Ok(null, "Unidad institucional dada de baja exitosamente"));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Obtiene los cargos institucionales (TCargo), con filtro opcional por unidad
        /// </summary>
        [HttpGet("cargos")]
        public async Task<IActionResult> GetCargos([FromQuery] short? codU = null)
        {
            var cargos = await _sp.QueryAsync(
                "dbo.usp_TCargo_Listar",
                reader => new
                {
                    CodCargo = reader.GetSafeInt16("CodCargo"),
                    NombreC = reader.GetSafeString("NombreC"),
                    CodU = reader.GetSafeInt16("CodU"),
                    UnidadNombre = reader.GetNullableString("NombreUnidad")
                },
                new SqlParameter("@CodU", SqlDbType.SmallInt) { Value = (object?)codU ?? DBNull.Value },
                new SqlParameter("@Activo", SqlDbType.Bit) { Value = DBNull.Value }
            );

            return Ok(ApiResponse<object>.Ok(cargos, "Cargos institucionales obtenidos exitosamente"));
        }

        /// <summary>
        /// Crea un nuevo cargo institucional (TCargo)
        /// </summary>
        [HttpPost("cargos")]
        public async Task<IActionResult> CreateCargo([FromBody] CrearCargoDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.Fail("Datos de cargo inválidos", ModelState));
            }

            var outParam = new SqlParameter("@NuevoCodCargo", SqlDbType.SmallInt) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TCargo_Insertar",
                    new SqlParameter("@NombreC", SqlDbType.VarChar, 50) { Value = request.NombreC.Trim().ToUpper() },
                    new SqlParameter("@CodU", SqlDbType.SmallInt) { Value = request.CodU },
                    outParam
                );

                short nuevoCod = (short)outParam.Value;

                var nuevoCargo = new TCargo
                {
                    CodCargo = nuevoCod,
                    NombreC = request.NombreC.Trim().ToUpper(),
                    CodU = request.CodU
                };

                return CreatedAtAction(nameof(GetCargos), new { codU = request.CodU }, ApiResponse<object>.Ok(nuevoCargo, "Cargo institucional creado con éxito"));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Actualiza un cargo institucional existente (TCargo)
        /// </summary>
        [HttpPut("cargos/{codCargo:int}")]
        public async Task<IActionResult> UpdateCargo(short codCargo, [FromBody] ActualizarCargoDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.Fail("Datos de cargo inválidos", ModelState));
            }

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TCargo_Actualizar",
                    new SqlParameter("@CodCargo", SqlDbType.SmallInt) { Value = codCargo },
                    new SqlParameter("@NombreC", SqlDbType.VarChar, 50) { Value = request.NombreC.Trim().ToUpper() },
                    new SqlParameter("@CodU", SqlDbType.SmallInt) { Value = request.CodU }
                );

                var cargo = new TCargo
                {
                    CodCargo = codCargo,
                    NombreC = request.NombreC.Trim().ToUpper(),
                    CodU = request.CodU
                };

                return Ok(ApiResponse<object>.Ok(cargo, "Cargo institucional actualizado con éxito"));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Elimina un cargo institucional (TCargo)
        /// </summary>
        [HttpDelete("cargos/{codCargo:int}")]
        public async Task<IActionResult> DeleteCargo(short codCargo)
        {
            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TCargo_Eliminar",
                    new SqlParameter("@CodCargo", SqlDbType.SmallInt) { Value = codCargo }
                );

                return Ok(ApiResponse<object>.Ok(null, "Cargo institucional eliminado exitosamente"));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        /// <summary>
        /// Obtiene los empleados institucionales (TEmpleados)
        /// </summary>
        [HttpGet("empleados")]
        public async Task<IActionResult> GetEmpleados([FromQuery] bool? activo = null, [FromQuery] string? search = null)
        {
            var empleados = await _sp.QueryAsync(
                "dbo.usp_TEmpleados_Listar",
                reader => new
                {
                    CI = reader.GetSafeInt32("CI"),
                    Apellidos = reader.GetSafeString("Apellidos"),
                    Nombres = reader.GetSafeString("Nombres"),
                    NombreCompleto = $"{reader.GetSafeString("Nombres")} {reader.GetSafeString("Apellidos")}".Trim(),
                    Direccion = reader.GetNullableString("Direccion"),
                    Cel = reader.GetNullableString("Cel"),
                    Email = reader.GetNullableString("Email"),
                    Activo = reader.GetSafeBoolean("Activo", true)
                },
                new SqlParameter("@Search", SqlDbType.VarChar, 100) { Value = (object?)search?.Trim() ?? DBNull.Value },
                new SqlParameter("@Activo", SqlDbType.Bit) { Value = (object?)activo ?? DBNull.Value },
                new SqlParameter("@Limit", SqlDbType.Int) { Value = 500 },
                new SqlParameter("@Offset", SqlDbType.Int) { Value = 0 }
            );

            return Ok(ApiResponse<object>.Ok(empleados, "Empleados institucionales obtenidos exitosamente"));
        }

        /// <summary>
        /// Obtiene el detalle de un empleado por CI
        /// </summary>
        [HttpGet("empleados/{ci:int}")]
        public async Task<IActionResult> GetEmpleadoPorCi(int ci)
        {
            var empleado = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_TEmpleados_ObtenerPorCI",
                reader => new
                {
                    CI = reader.GetSafeInt32("CI"),
                    Apellidos = reader.GetSafeString("Apellidos"),
                    Nombres = reader.GetSafeString("Nombres"),
                    NombreCompleto = $"{reader.GetSafeString("Nombres")} {reader.GetSafeString("Apellidos")}".Trim(),
                    Direccion = reader.GetNullableString("Direccion"),
                    Cel = reader.GetNullableString("Cel"),
                    Email = reader.GetNullableString("Email"),
                    Activo = reader.GetSafeBoolean("Activo", true)
                },
                new SqlParameter("@CI", SqlDbType.Int) { Value = ci }
            );

            if (empleado == null)
            {
                return NotFound(ApiResponse<object>.Fail($"Empleado con CI {ci} no encontrado en DB_TRAMITES_EXTERNOS."));
            }

            return Ok(ApiResponse<object>.Ok(empleado, "Empleado institucional encontrado"));
        }
    }
}
