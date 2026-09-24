using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Persona> Personas => Set<Persona>();
        public DbSet<Usuario> Usuarios => Set<Usuario>();
        public DbSet<Rol> Roles => Set<Rol>();
        public DbSet<UsuarioRol> UsuarioRoles => Set<UsuarioRol>();
        public DbSet<UbicacionOrg> UbicacionesOrg => Set<UbicacionOrg>();
        public DbSet<TipoProceso> TiposProceso => Set<TipoProceso>();
        public DbSet<Correlativo> Correlativos => Set<Correlativo>();
        public DbSet<Tramite> Tramites => Set<Tramite>();
        public DbSet<Movimiento> Movimientos => Set<Movimiento>();
        public DbSet<Adjunto> Adjuntos => Set<Adjunto>();
        public DbSet<Parametro> Parametros => Set<Parametro>();

        // Tablas Institucionales (Sprint 2 - DB_TRAMITES_EXTERNOS)
        public DbSet<TUnidad> TUnidades => Set<TUnidad>();
        public DbSet<TCargo> TCargos => Set<TCargo>();
        public DbSet<TEmpleado> TEmpleados => Set<TEmpleado>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Índices y restricciones
            modelBuilder.Entity<Persona>()
                .HasIndex(p => p.Ci)
                .IsUnique();

            modelBuilder.Entity<Usuario>()
                .HasIndex(u => u.Login)
                .IsUnique();

            modelBuilder.Entity<Rol>()
                .HasIndex(r => r.Codigo)
                .IsUnique();

            modelBuilder.Entity<UbicacionOrg>()
                .HasIndex(u => u.Codigo)
                .IsUnique();

            modelBuilder.Entity<TipoProceso>()
                .HasIndex(tp => tp.Codigo)
                .IsUnique();

            modelBuilder.Entity<Parametro>()
                .HasIndex(p => p.Clave)
                .IsUnique();

            // UsuarioRol llave foránea compuesta o índices
            modelBuilder.Entity<UsuarioRol>()
                .HasIndex(ur => new { ur.UsuarioId, ur.RolId, ur.UbicacionOrgId })
                .IsUnique();

            // Tramite correlativo y gestión
            modelBuilder.Entity<Tramite>()
                .HasIndex(t => new { t.NumeroCorrelativo, t.Gestion });

            // Relación recursiva UbicacionOrg
            modelBuilder.Entity<UbicacionOrg>()
                .HasOne(u => u.Padre)
                .WithMany(u => u.Hijos)
                .HasForeignKey(u => u.PadreId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relación Usuario -> Persona
            modelBuilder.Entity<Usuario>()
                .HasOne(u => u.Persona)
                .WithMany(p => p.Usuarios)
                .HasForeignKey(u => u.PersonaId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relaciones Tramite
            modelBuilder.Entity<Tramite>()
                .HasOne(t => t.CreadoPorUsuario)
                .WithMany()
                .HasForeignKey(t => t.CreadoPor)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Tramite>()
                .HasOne(t => t.UbicacionOrg)
                .WithMany()
                .HasForeignKey(t => t.UbicacionOrgId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Tramite>()
                .HasOne(t => t.UsuarioActual)
                .WithMany()
                .HasForeignKey(t => t.UsuarioActualId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Tramite>()
                .HasOne(t => t.UbicacionActual)
                .WithMany()
                .HasForeignKey(t => t.UbicacionActualId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Tramite>()
                .HasOne(t => t.PrimerDestinatario)
                .WithMany()
                .HasForeignKey(t => t.PrimerDestinatarioId)
                .OnDelete(DeleteBehavior.SetNull);

            // Relaciones Movimiento
            modelBuilder.Entity<Movimiento>()
                .HasOne(m => m.Tramite)
                .WithMany(t => t.Movimientos)
                .HasForeignKey(m => m.TramiteId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Movimiento>()
                .HasOne(m => m.UsuarioOrigen)
                .WithMany()
                .HasForeignKey(m => m.UsuarioOrigenId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Movimiento>()
                .HasOne(m => m.UbicacionOrigen)
                .WithMany()
                .HasForeignKey(m => m.UbicacionOrigenId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relación TCargo -> TUnidad
            modelBuilder.Entity<TCargo>()
                .HasOne(c => c.Unidad)
                .WithMany(u => u.Cargos)
                .HasForeignKey(c => c.CodU)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
