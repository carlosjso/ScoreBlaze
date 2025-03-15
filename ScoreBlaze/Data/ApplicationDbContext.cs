using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ScoreBlaze.Models;

namespace ScoreBlaze.Data;

public class ApplicationDbContext : IdentityDbContext<IdentityUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Equipo> Equipos { get; set; }
    public DbSet<Jugador> Jugadores { get; set; }
    public DbSet<Partido> Partidos { get; set; }
    public DbSet<Cuarto> Cuartos { get; set; }
    public DbSet<Marcador> Marcadores { get; set; }
    public DbSet<Resultado> Resultados { get; set; }
    public DbSet<JugadorPartido> JugadorPartidos { get; set; }
    public DbSet<Punto> Puntos { get; set; }
    public DbSet<Foul> Fouls { get; set; }    

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ✅ Corregir tipos de datos que no soporta MariaDB
        builder.Entity<IdentityRole>().Property(r => r.Name).HasMaxLength(256).HasColumnType("varchar(256)");
        builder.Entity<IdentityRole>().Property(r => r.NormalizedName).HasMaxLength(256).HasColumnType("varchar(256)");
        builder.Entity<IdentityUser>().Property(u => u.Email).HasMaxLength(256).HasColumnType("varchar(256)");
        builder.Entity<IdentityUser>().Property(u => u.NormalizedEmail).HasMaxLength(256).HasColumnType("varchar(256)");
        builder.Entity<IdentityUser>().Property(u => u.NormalizedUserName).HasMaxLength(256).HasColumnType("varchar(256)");
        builder.Entity<IdentityUser>().Property(u => u.UserName).HasMaxLength(256).HasColumnType("varchar(256)");

        // ✅ Evitar `nvarchar(max)` en `ConcurrencyStamp`
        builder.Entity<IdentityRole>().Property(r => r.ConcurrencyStamp).HasColumnType("longtext");
        builder.Entity<IdentityUser>().Property(u => u.ConcurrencyStamp).HasColumnType("longtext");
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseMySql("Server=127.0.0.1;Port=3306;Database=scoreblaze_db;User=root;Password=;",
                new MySqlServerVersion(new Version(10, 4, 32))); // ⚠️ Usa la versión correcta de MariaDB
        }
    }
}
