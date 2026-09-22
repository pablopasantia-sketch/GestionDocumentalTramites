using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Cargar sobreescritura de configuración local si existe (no trackeado en git)
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Procesar comandos CLI de base de datos si fueron solicitados
if (args.Length > 0)
{
    var cmd = args[0].ToLower();
    var subCmd = args.Length > 1 ? args[1].ToLower() : "";

    if (cmd == "db:init" || (cmd == "db" && subCmd == "init"))
    {
        var dbManager = new DatabaseManager(builder.Configuration);
        await dbManager.InitDbAsync();
        return;
    }
    if (cmd == "db:seed" || (cmd == "db" && subCmd == "seed"))
    {
        var dbManager = new DatabaseManager(builder.Configuration);
        await dbManager.SeedDbAsync();
        return;
    }
    if (cmd == "migrate:status" || (cmd == "migrate" && subCmd == "status"))
    {
        var dbManager = new DatabaseManager(builder.Configuration);
        await dbManager.MigrateStatusAsync();
        return;
    }
    if (cmd == "migrate:reset" || (cmd == "migrate" && subCmd == "reset"))
    {
        var dbManager = new DatabaseManager(builder.Configuration);
        await dbManager.MigrateResetAsync();
        return;
    }
    if (cmd == "migrate" || cmd == "migrate:up" || (cmd == "migrate" && (subCmd == "up" || string.IsNullOrEmpty(subCmd))))
    {
        var dbManager = new DatabaseManager(builder.Configuration);
        await dbManager.MigrateUpAsync();
        return;
    }
}

// 1. Cadena de conexión Microsoft SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=127.0.0.1,1433;Database=DBNotasCMS;User Id=sa;Password=SqlAdminSucre2026!;TrustServerCertificate=True;MultipleActiveResultSets=True;";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddTransient<DatabaseManager>();

// 2. Inyección de Dependencias
builder.Services.AddScoped<IAuthService, AuthService>();

// 3. Configuración de Autenticación JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? "gestion_documental_tramites_jwt_secret_key_2026_sucre_institutional_32bytes!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "GestionDocumentalApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "GestionDocumentalClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(5)
    };
});

// 4. Configuración de CORS para Frontend React
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AppCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 5. Controladores y Serialización JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// 6. Swagger con Soporte para Tokens JWT
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "API — Gestión Documental y Trámites",
        Version = "v1",
        Description = "API REST institucional en ASP.NET Core (.NET 8) para la Gaceta Municipal de Sucre."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Autenticación JWT usando el encabezado Authorization. Ejemplo: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Pipeline de Middleware
app.UseSwagger(c =>
{
    c.RouteTemplate = "swagger/{documentName}/swagger.json";
});
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AppCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Redirigir la raíz a la interfaz interactiva de Swagger
app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();
