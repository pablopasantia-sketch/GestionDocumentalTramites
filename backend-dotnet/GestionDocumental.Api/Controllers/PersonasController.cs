using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Personas;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PersonasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PersonasController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? activo)
        {
            var query = _context.Personas.AsQueryable();

            if (activo == "all" || activo == "todos")
            {
                // Incluir todos (activos e inactivos)
            }
            else if (activo == "false" || activo == "inactivos")
            {
                query = query.Where(p => !p.Activo);
            }
            else // Por defecto solo activos
            {
                query = query.Where(p => p.Activo);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p => 
                    p.Nombres.ToLower().Contains(term) ||
                    p.ApellidoPaterno.ToLower().Contains(term) ||
                    (p.ApellidoMaterno != null && p.ApellidoMaterno.ToLower().Contains(term)) ||
                    p.Ci.ToLower().Contains(term));
            }

            var personas = await query
                .OrderBy(p => p.ApellidoPaterno)
                .ThenBy(p => p.Nombres)
                .Select(p => new PersonaDto
                {
                    Id = p.Id,
                    Nombres = p.Nombres,
                    ApellidoPaterno = p.ApellidoPaterno,
                    ApellidoMaterno = p.ApellidoMaterno,
                    Ci = p.Ci,
                    CiExpedido = p.CiExpedido,
                    Sexo = p.Sexo,
                    EstadoCivil = p.EstadoCivil,
                    Telefono = p.Telefono,
                    Email = p.Email,
                    EmpresaTelefonica = p.EmpresaTelefonica,
                    Direccion = p.Direccion,
                    Activo = p.Activo
                })
                .ToListAsync();

            return Ok(ApiResponse<List<PersonaDto>>.Ok(personas));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var p = await _context.Personas.FindAsync(id);
            if (p == null) return NotFound(ApiResponse.ErrorResult("Persona no encontrada."));

            var dto = new PersonaDto
            {
                Id = p.Id,
                Nombres = p.Nombres,
                ApellidoPaterno = p.ApellidoPaterno,
                ApellidoMaterno = p.ApellidoMaterno,
                Ci = p.Ci,
                CiExpedido = p.CiExpedido,
                Sexo = p.Sexo,
                EstadoCivil = p.EstadoCivil,
                Telefono = p.Telefono,
                Email = p.Email,
                EmpresaTelefonica = p.EmpresaTelefonica,
                Direccion = p.Direccion,
                Activo = p.Activo
            };

            return Ok(ApiResponse<PersonaDto>.Ok(dto));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePersonaDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));
            }

            var existingPersona = await _context.Personas.FirstOrDefaultAsync(p => p.Ci == dto.Ci.Trim());
            if (existingPersona != null)
            {
                if (!existingPersona.Activo)
                {
                    return Conflict(ApiResponse.ErrorResult($"Existe una persona dada de baja con el CI '{dto.Ci}' ({existingPersona.Nombres} {existingPersona.ApellidoPaterno}). Puede reactivarla cambiando el filtro a 'Dados de Baja (Inactivos)'."));
                }
                return Conflict(ApiResponse.ErrorResult($"Ya existe una persona registrada con el CI {dto.Ci}."));
            }

            var persona = new Persona
            {
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
                Activo = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Personas.Add(persona);
            await _context.SaveChangesAsync();

            var resultDto = new PersonaDto
            {
                Id = persona.Id,
                Nombres = persona.Nombres,
                ApellidoPaterno = persona.ApellidoPaterno,
                ApellidoMaterno = persona.ApellidoMaterno,
                Ci = persona.Ci,
                CiExpedido = persona.CiExpedido,
                Sexo = persona.Sexo,
                EstadoCivil = persona.EstadoCivil,
                Telefono = persona.Telefono,
                Email = persona.Email,
                EmpresaTelefonica = persona.EmpresaTelefonica,
                Direccion = persona.Direccion,
                Activo = persona.Activo
            };

            return CreatedAtAction(nameof(GetById), new { id = persona.Id }, 
                ApiResponse<PersonaDto>.Ok(resultDto, "Persona registrada exitosamente."));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePersonaDto dto)
        {
            var persona = await _context.Personas.FindAsync(id);
            if (persona == null) return NotFound(ApiResponse.ErrorResult("Persona no encontrada."));

            if (!string.IsNullOrWhiteSpace(dto.Ci) && dto.Ci.Trim() != persona.Ci)
            {
                bool ciExists = await _context.Personas.AnyAsync(p => p.Ci == dto.Ci.Trim() && p.Id != id);
                if (ciExists) return Conflict(ApiResponse.ErrorResult($"Ya existe otra persona con el CI {dto.Ci}."));
                persona.Ci = dto.Ci.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.Nombres)) persona.Nombres = dto.Nombres.Trim();
            if (!string.IsNullOrWhiteSpace(dto.ApellidoPaterno)) persona.ApellidoPaterno = dto.ApellidoPaterno.Trim();
            if (dto.ApellidoMaterno != null) persona.ApellidoMaterno = dto.ApellidoMaterno.Trim();
            if (!string.IsNullOrWhiteSpace(dto.CiExpedido)) persona.CiExpedido = dto.CiExpedido.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Sexo)) persona.Sexo = dto.Sexo.Trim();
            if (dto.EstadoCivil != null) persona.EstadoCivil = dto.EstadoCivil.Trim();
            if (dto.Telefono != null) persona.Telefono = dto.Telefono.Trim();
            if (dto.Email != null) persona.Email = dto.Email.Trim();
            if (dto.EmpresaTelefonica != null) persona.EmpresaTelefonica = dto.EmpresaTelefonica.Trim();
            if (dto.Direccion != null) persona.Direccion = dto.Direccion.Trim();

            persona.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var resultDto = new PersonaDto
            {
                Id = persona.Id,
                Nombres = persona.Nombres,
                ApellidoPaterno = persona.ApellidoPaterno,
                ApellidoMaterno = persona.ApellidoMaterno,
                Ci = persona.Ci,
                CiExpedido = persona.CiExpedido,
                Sexo = persona.Sexo,
                EstadoCivil = persona.EstadoCivil,
                Telefono = persona.Telefono,
                Email = persona.Email,
                EmpresaTelefonica = persona.EmpresaTelefonica,
                Direccion = persona.Direccion,
                Activo = persona.Activo
            };

            return Ok(ApiResponse<PersonaDto>.Ok(resultDto, "Persona actualizada exitosamente."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var persona = await _context.Personas.Include(p => p.Usuarios).FirstOrDefaultAsync(p => p.Id == id);
            if (persona == null) return NotFound(ApiResponse.ErrorResult("Persona no encontrada."));

            if (persona.Usuarios.Any(u => u.Activo))
            {
                return BadRequest(ApiResponse.ErrorResult("No se puede eliminar la persona: tiene cuentas de usuario activas asociadas."));
            }

            persona.Activo = false;
            persona.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Persona dada de baja exitosamente."));
        }

        [HttpPatch("{id}/reactivar")]
        public async Task<IActionResult> Reactivar(int id)
        {
            var persona = await _context.Personas.FindAsync(id);
            if (persona == null) return NotFound(ApiResponse.ErrorResult("Persona no encontrada."));

            persona.Activo = true;
            persona.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Persona reactivada exitosamente."));
        }
    }
}
