using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Personas;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PersonasController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public PersonasController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        private static PersonaDto MapPersona(SqlDataReader reader) => new PersonaDto
        {
            Id = reader.GetSafeInt32("id"),
            Nombres = reader.GetSafeString("nombres"),
            ApellidoPaterno = reader.GetSafeString("apellido_paterno"),
            ApellidoMaterno = reader.GetNullableString("apellido_materno"),
            Ci = reader.GetSafeString("ci"),
            CiExpedido = reader.GetNullableString("ci_expedido"),
            Sexo = reader.GetNullableString("sexo"),
            EstadoCivil = reader.GetNullableString("estado_civil"),
            Telefono = reader.GetNullableString("telefono"),
            Email = reader.GetNullableString("email"),
            EmpresaTelefonica = reader.GetNullableString("empresa_telefonica"),
            Direccion = reader.GetNullableString("direccion"),
            Activo = reader.GetSafeBoolean("activo")
        };

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? activo)
        {
            string activoParam = "activos";
            if (activo == "all" || activo == "todos")
            {
                activoParam = "todos";
            }
            else if (activo == "false" || activo == "inactivos")
            {
                activoParam = "inactivos";
            }

            var personas = await _sp.QueryAsync(
                "dbo.usp_Personas_Listar",
                MapPersona,
                new SqlParameter("@Search", SqlDbType.VarChar, 100) { Value = (object?)search?.Trim() ?? DBNull.Value },
                new SqlParameter("@Activo", SqlDbType.VarChar, 20) { Value = activoParam },
                new SqlParameter("@Offset", SqlDbType.Int) { Value = 0 },
                new SqlParameter("@Limit", SqlDbType.Int) { Value = 500 }
            );

            return Ok(ApiResponse<List<PersonaDto>>.Ok(personas));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var p = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Personas_ObtenerPorId",
                MapPersona,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (p == null) return NotFound(ApiResponse.ErrorResult("Persona no encontrada."));

            return Ok(ApiResponse<PersonaDto>.Ok(p));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePersonaDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));
            }

            // Verificar si el CI ya existe mediante SP
            var existing = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Personas_ObtenerPorCI",
                MapPersona,
                new SqlParameter("@Ci", SqlDbType.VarChar, 20) { Value = dto.Ci.Trim() }
            );

            if (existing != null)
            {
                if (!existing.Activo)
                {
                    return Conflict(ApiResponse.ErrorResult($"Existe una persona dada de baja con el CI '{dto.Ci}' ({existing.Nombres} {existing.ApellidoPaterno}). Puede reactivarla cambiando el filtro a 'Dados de Baja (Inactivos)'."));
                }
                return Conflict(ApiResponse.ErrorResult($"Ya existe una persona registrada con el CI {dto.Ci}."));
            }

            var outParam = new SqlParameter("@NuevoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Personas_Insertar",
                    new SqlParameter("@Nombres", SqlDbType.VarChar, 100) { Value = dto.Nombres.Trim() },
                    new SqlParameter("@ApellidoPaterno", SqlDbType.VarChar, 100) { Value = dto.ApellidoPaterno.Trim() },
                    new SqlParameter("@ApellidoMaterno", SqlDbType.VarChar, 100) { Value = (object?)dto.ApellidoMaterno?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Ci", SqlDbType.VarChar, 20) { Value = dto.Ci.Trim() },
                    new SqlParameter("@CiExpedido", SqlDbType.VarChar, 5) { Value = dto.CiExpedido?.Trim() ?? "CH" },
                    new SqlParameter("@Sexo", SqlDbType.VarChar, 10) { Value = dto.Sexo?.Trim() ?? "M" },
                    new SqlParameter("@EstadoCivil", SqlDbType.VarChar, 20) { Value = (object?)dto.EstadoCivil?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Telefono", SqlDbType.VarChar, 20) { Value = (object?)dto.Telefono?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Email", SqlDbType.VarChar, 150) { Value = (object?)dto.Email?.Trim() ?? DBNull.Value },
                    new SqlParameter("@EmpresaTelefonica", SqlDbType.VarChar, 20) { Value = (object?)dto.EmpresaTelefonica?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Direccion", SqlDbType.VarChar, 255) { Value = (object?)dto.Direccion?.Trim() ?? DBNull.Value },
                    outParam
                );

                int nuevoId = (int)outParam.Value;

                var resultDto = new PersonaDto
                {
                    Id = nuevoId,
                    Nombres = dto.Nombres.Trim(),
                    ApellidoPaterno = dto.ApellidoPaterno.Trim(),
                    ApellidoMaterno = dto.ApellidoMaterno?.Trim(),
                    Ci = dto.Ci.Trim(),
                    CiExpedido = dto.CiExpedido?.Trim() ?? "CH",
                    Sexo = dto.Sexo?.Trim() ?? "M",
                    EstadoCivil = dto.EstadoCivil?.Trim(),
                    Telefono = dto.Telefono?.Trim(),
                    Email = dto.Email?.Trim(),
                    EmpresaTelefonica = dto.EmpresaTelefonica?.Trim(),
                    Direccion = dto.Direccion?.Trim(),
                    Activo = true
                };

                return CreatedAtAction(nameof(GetById), new { id = nuevoId }, 
                    ApiResponse<PersonaDto>.Ok(resultDto, "Persona registrada exitosamente."));
            }
            catch (SqlException ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult($"Error al registrar persona: {ex.Message}"));
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePersonaDto dto)
        {
            var persona = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Personas_ObtenerPorId",
                MapPersona,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (persona == null) return NotFound(ApiResponse.ErrorResult("Persona no encontrada."));

            string ci = !string.IsNullOrWhiteSpace(dto.Ci) ? dto.Ci.Trim() : persona.Ci;
            string nombres = !string.IsNullOrWhiteSpace(dto.Nombres) ? dto.Nombres.Trim() : persona.Nombres;
            string apellidoPaterno = !string.IsNullOrWhiteSpace(dto.ApellidoPaterno) ? dto.ApellidoPaterno.Trim() : persona.ApellidoPaterno;
            string? apellidoMaterno = dto.ApellidoMaterno != null ? dto.ApellidoMaterno.Trim() : persona.ApellidoMaterno;
            string ciExpedido = !string.IsNullOrWhiteSpace(dto.CiExpedido) ? dto.CiExpedido.Trim() : (persona.CiExpedido ?? "CH");
            string sexo = !string.IsNullOrWhiteSpace(dto.Sexo) ? dto.Sexo.Trim() : (persona.Sexo ?? "M");
            string? estadoCivil = dto.EstadoCivil != null ? dto.EstadoCivil.Trim() : persona.EstadoCivil;
            string? telefono = dto.Telefono != null ? dto.Telefono.Trim() : persona.Telefono;
            string? email = dto.Email != null ? dto.Email.Trim() : persona.Email;
            string? empresaTelefonica = dto.EmpresaTelefonica != null ? dto.EmpresaTelefonica.Trim() : persona.EmpresaTelefonica;
            string? direccion = dto.Direccion != null ? dto.Direccion.Trim() : persona.Direccion;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Personas_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Nombres", SqlDbType.VarChar, 100) { Value = nombres },
                    new SqlParameter("@ApellidoPaterno", SqlDbType.VarChar, 100) { Value = apellidoPaterno },
                    new SqlParameter("@ApellidoMaterno", SqlDbType.VarChar, 100) { Value = (object?)apellidoMaterno ?? DBNull.Value },
                    new SqlParameter("@Ci", SqlDbType.VarChar, 20) { Value = ci },
                    new SqlParameter("@CiExpedido", SqlDbType.VarChar, 5) { Value = ciExpedido },
                    new SqlParameter("@Sexo", SqlDbType.VarChar, 10) { Value = sexo },
                    new SqlParameter("@EstadoCivil", SqlDbType.VarChar, 20) { Value = (object?)estadoCivil ?? DBNull.Value },
                    new SqlParameter("@Telefono", SqlDbType.VarChar, 20) { Value = (object?)telefono ?? DBNull.Value },
                    new SqlParameter("@Email", SqlDbType.VarChar, 150) { Value = (object?)email ?? DBNull.Value },
                    new SqlParameter("@EmpresaTelefonica", SqlDbType.VarChar, 20) { Value = (object?)empresaTelefonica ?? DBNull.Value },
                    new SqlParameter("@Direccion", SqlDbType.VarChar, 255) { Value = (object?)direccion ?? DBNull.Value },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = persona.Activo }
                );

                var resultDto = new PersonaDto
                {
                    Id = id,
                    Nombres = nombres,
                    ApellidoPaterno = apellidoPaterno,
                    ApellidoMaterno = apellidoMaterno,
                    Ci = ci,
                    CiExpedido = ciExpedido,
                    Sexo = sexo,
                    EstadoCivil = estadoCivil,
                    Telefono = telefono,
                    Email = email,
                    EmpresaTelefonica = empresaTelefonica,
                    Direccion = direccion,
                    Activo = persona.Activo
                };

                return Ok(ApiResponse<PersonaDto>.Ok(resultDto, "Persona actualizada exitosamente."));
            }
            catch (SqlException ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult($"Error al actualizar persona: {ex.Message}"));
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Personas_EliminarLogico",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id }
                );
                return Ok(ApiResponse.SuccessResult("Persona dada de baja exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPatch("{id}/reactivar")]
        public async Task<IActionResult> Reactivar(int id)
        {
            var persona = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Personas_ObtenerPorId",
                MapPersona,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (persona == null) return NotFound(ApiResponse.ErrorResult("Persona no encontrada."));

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Personas_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Nombres", SqlDbType.VarChar, 100) { Value = persona.Nombres },
                    new SqlParameter("@ApellidoPaterno", SqlDbType.VarChar, 100) { Value = persona.ApellidoPaterno },
                    new SqlParameter("@ApellidoMaterno", SqlDbType.VarChar, 100) { Value = (object?)persona.ApellidoMaterno ?? DBNull.Value },
                    new SqlParameter("@Ci", SqlDbType.VarChar, 20) { Value = persona.Ci },
                    new SqlParameter("@CiExpedido", SqlDbType.VarChar, 5) { Value = persona.CiExpedido ?? "CH" },
                    new SqlParameter("@Sexo", SqlDbType.VarChar, 10) { Value = persona.Sexo ?? "M" },
                    new SqlParameter("@EstadoCivil", SqlDbType.VarChar, 20) { Value = (object?)persona.EstadoCivil ?? DBNull.Value },
                    new SqlParameter("@Telefono", SqlDbType.VarChar, 20) { Value = (object?)persona.Telefono ?? DBNull.Value },
                    new SqlParameter("@Email", SqlDbType.VarChar, 150) { Value = (object?)persona.Email ?? DBNull.Value },
                    new SqlParameter("@EmpresaTelefonica", SqlDbType.VarChar, 20) { Value = (object?)persona.EmpresaTelefonica ?? DBNull.Value },
                    new SqlParameter("@Direccion", SqlDbType.VarChar, 255) { Value = (object?)persona.Direccion ?? DBNull.Value },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = true }
                );

                return Ok(ApiResponse.SuccessResult("Persona reactivada exitosamente."));
            }
            catch (SqlException ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult($"Error al reactivar persona: {ex.Message}"));
            }
        }
    }
}
