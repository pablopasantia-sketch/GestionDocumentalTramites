-- Migración 036: Mejora de la Consulta Pública de Trámites e Hoja de Ruta (RF-09 / Sprint 5)
-- =========================================================================================
-- Permite búsqueda flexible por número correlativo exacto, con prefijo o número simple.
-- Proyecta información enriquecida para seguimiento ciudadano:
-- - Código y tiempo estimado de tipo de proceso
-- - Fecha límite de respuesta normativo
-- - Ubicación actual y funcionario/cargo responsable
-- =========================================================================================

CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ConsultaPublica
    @Correlativo NVARCHAR(50),
    @Gestion     INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year INT = ISNULL(@Gestion, YEAR(GETDATE()));
    DECLARE @CleanCorr NVARCHAR(50) = LTRIM(RTRIM(@Correlativo));

    SELECT TOP 1
        t.id,
        t.numero_correlativo,
        t.gestion,
        tp.nombre AS tipo_proceso,
        tp.codigo AS tipo_proceso_codigo,
        tp.tipo_categoria,
        ISNULL(tp.tiempo_estimado_horas, 48) AS tiempo_estimado_horas,
        t.referencia,
        t.remitente,
        t.estado,
        t.prioridad,
        t.nro_hojas,
        t.fecha_creacion,
        t.fecha_conclusion,
        t.fecha_limite_respuesta,
        ISNULL(ua.nombre, 'Despacho Central') AS ubicacion_actual,
        ISNULL(uo.nombre, 'Ventanilla Única') AS unidad_origen,
        ISNULL(emp.Nombres + ' ' + emp.Apellidos, 'En Despacho / Mesa de Entrada') AS usuario_actual_nombre,
        ISNULL(emp.cargo_nombre, 'Funcionario Responsable') AS usuario_actual_cargo
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id = t.ubicacion_org_id
    LEFT JOIN dbo.ubicaciones_org ua  ON ua.id = t.ubicacion_actual_id
    LEFT JOIN dbo.TEmpleados emp      ON emp.id = t.usuario_actual_id
    WHERE (
        t.numero_correlativo = @CleanCorr
        OR t.numero_correlativo = @CleanCorr + '/' + CAST(@Year AS VARCHAR)
        OR t.numero_correlativo LIKE '%-' + @CleanCorr + '/' + CAST(@Year AS VARCHAR)
        OR t.numero_correlativo LIKE '%-' + @CleanCorr
        OR t.numero_correlativo LIKE @CleanCorr + '/%'
    )
    AND (@Gestion IS NULL OR t.gestion = @Year)
    AND t.activo = 1
    ORDER BY 
        CASE WHEN t.numero_correlativo = @CleanCorr THEN 1 ELSE 2 END ASC,
        t.id DESC;
END;
GO
