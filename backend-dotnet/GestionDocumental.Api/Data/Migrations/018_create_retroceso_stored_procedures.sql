-- Migración 018: Stored Procedures para Retroceder Proceso con Justificación (Sprint 3 - RF-04.5, RF-05.4, RF-05.5)
-- DB_TRAMITES_EXTERNOS T-SQL

-- ─────────────────────────────────────────────────────────────────────────────
-- Actualizar usp_Tramites_ObtenerPorId para incluir justificacion_retroceso en Resultset 2
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    -- Resultset 1: Datos principales del trámite
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        t.tipo_proceso_id,
        tp.codigo AS tipo_proceso_codigo,
        tp.nombre AS tipo_proceso_nombre,
        tp.tipo_categoria,
        t.estado,
        t.remitente,
        t.institucion_remitente,
        t.cite_externo,
        t.referencia,
        t.prioridad,
        t.nro_hojas,
        t.nro_anexos,
        t.instruccion,
        t.destinatario_nombre,
        t.destinatario_cargo,
        t.destinatario_unidad,
        t.cod_u_destino,
        t.cod_cargo_destino,
        t.ci_empleado_destino,
        t.fecha_creacion,
        t.fecha_limite_respuesta,
        ISNULL(e.Nombres + ' ' + ISNULL(e.Apellidos, ''), e.login) AS creado_por_usuario,
        uo.nombre AS unidad_origen
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    INNER JOIN dbo.TEmpleados e       ON e.id  = t.creado_por
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id = t.ubicacion_org_id
    WHERE t.id = @Id AND t.activo = 1;

    -- Resultset 2: Historial de movimientos (con justificacion_retroceso)
    SELECT
        m.orden,
        m.actividad_nombre AS actividad,
        m.tipo_movimiento,
        ISNULL(uo.nombre, 'Ventanilla Central') AS unidad_origen,
        ud.nombre AS unidad_destino,
        m.estado_movimiento AS estado,
        m.proveido,
        m.justificacion_retroceso,
        ISNULL(m.fecha_recepcion, ISNULL(m.fecha_envio, m.created_at)) AS fecha
    FROM dbo.movimientos m
    LEFT JOIN dbo.ubicaciones_org uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN dbo.ubicaciones_org ud ON ud.id = m.ubicacion_destino_id
    WHERE m.tramite_id = @Id
    ORDER BY m.orden ASC;

    -- Resultset 3: Documentos adjuntos activos
    SELECT
        a.id,
        a.tramite_id,
        a.movimiento_id,
        a.nombre_original,
        a.tamano_bytes,
        a.tipo_mime,
        ISNULL(e.Nombres + ' ' + ISNULL(e.Apellidos, ''), e.login) AS subido_por_nombre,
        a.created_at AS fecha_subida
    FROM dbo.adjuntos a
    INNER JOIN dbo.TEmpleados e ON e.id = a.subido_por
    WHERE a.tramite_id = @Id AND a.activo = 1
    ORDER BY a.id DESC;
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_Retroceder: Devuelve un trámite a la actividad/instancia anterior
-- con registro obligatorio de justificación (RF-05.4, RF-05.5)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Retroceder
    @TramiteId              INT,
    @UsuarioId              INT,
    @UbicacionOrgId         INT,
    @Justificacion          NVARCHAR(MAX),
    @Proveido               NVARCHAR(MAX)   = NULL,
    @NuevoMovimientoId      INT             OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar Justificación Obligatoria (RF-05.5)
        IF @Justificacion IS NULL OR LTRIM(RTRIM(@Justificacion)) = ''
        BEGIN
            THROW 50040, 'La justificación del retroceso es estrictamente obligatoria.', 1;
        END

        -- 2. Validar existencia y estado del trámite
        DECLARE @EstadoActual VARCHAR(30), @Correlativo VARCHAR(50);
        SELECT @EstadoActual = estado, @Correlativo = numero_correlativo
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50041, 'El trámite indicado no existe o se encuentra inactivo.', 1;
        END

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO')
        BEGIN
            THROW 50042, 'El trámite no puede retroceder porque se encuentra en estado Concluido, Anulado o Bloqueado.', 1;
        END

        -- 3. Validar que no esté en su primer movimiento (debe existir paso previo)
        DECLARE @TotalMovimientos INT;
        SELECT @TotalMovimientos = COUNT(1) 
        FROM dbo.movimientos 
        WHERE tramite_id = @TramiteId;

        IF @TotalMovimientos <= 1
        BEGIN
            THROW 50043, 'El trámite se encuentra en su actividad inicial de Ventanilla y no cuenta con una instancia anterior a la cual retroceder.', 1;
        END

        -- 4. Obtener la ubicación y usuario actual del trámite
        DECLARE @UbicacionActualId INT, @UsuarioActualId INT;
        SELECT 
            @UbicacionActualId = ISNULL(ubicacion_actual_id, @UbicacionOrgId),
            @UsuarioActualId = ISNULL(usuario_actual_id, @UsuarioId)
        FROM dbo.tramites
        WHERE id = @TramiteId;

        -- 5. Buscar el movimiento previo que despachó el trámite hacia la unidad/usuario actual
        -- Buscamos hacia atrás el último movimiento donde el origen sea DISTINTO al custodio actual
        DECLARE @DestinoUsuarioId INT = NULL;
        DECLARE @DestinoUbicacionId INT = NULL;

        SELECT TOP 1
            @DestinoUsuarioId = m.usuario_origen_id,
            @DestinoUbicacionId = m.ubicacion_origen_id
        FROM dbo.movimientos m
        WHERE m.tramite_id = @TramiteId
          AND (
              m.ubicacion_origen_id <> @UbicacionActualId
              OR (m.ubicacion_origen_id = @UbicacionActualId AND m.usuario_origen_id IS NOT NULL AND m.usuario_origen_id <> @UsuarioActualId)
          )
        ORDER BY m.orden DESC, m.id DESC;

        -- Si no hubo movimiento previo con origen distinto, verificar el creador original
        IF @DestinoUbicacionId IS NULL
        BEGIN
            DECLARE @CreadorUbicacionId INT, @CreadorUsuarioId INT;
            SELECT 
                @CreadorUbicacionId = ubicacion_org_id,
                @CreadorUsuarioId = creado_por
            FROM dbo.tramites
            WHERE id = @TramiteId;

            IF @CreadorUbicacionId <> @UbicacionActualId OR (@CreadorUsuarioId IS NOT NULL AND @CreadorUsuarioId <> @UsuarioActualId)
            BEGIN
                SET @DestinoUbicacionId = @CreadorUbicacionId;
                SET @DestinoUsuarioId = @CreadorUsuarioId;
            END
        END

        -- Si aún no se localiza destino previo distinto, el trámite no puede retroceder
        IF @DestinoUbicacionId IS NULL OR (@DestinoUbicacionId = @UbicacionActualId AND (@DestinoUsuarioId IS NULL OR @DestinoUsuarioId = @UsuarioActualId))
        BEGIN
            THROW 50043, 'El trámite se encuentra en su actividad inicial y no cuenta con una instancia o unidad remitente previa a la cual retroceder.', 1;
        END

        -- 6. Resolver datos del destinatario de retorno para el trámite
        DECLARE @NomUnidadRetorno NVARCHAR(150), @CodURetorno SMALLINT;
        SELECT 
            @NomUnidadRetorno = nombre,
            @CodURetorno = codU
        FROM dbo.ubicaciones_org 
        WHERE id = @DestinoUbicacionId;

        DECLARE @NomUsuarioRetorno NVARCHAR(150), @CargoUsuarioRetorno NVARCHAR(150);
        IF @DestinoUsuarioId IS NOT NULL
        BEGIN
            SELECT 
                @NomUsuarioRetorno = LTRIM(RTRIM(Nombres + ' ' + ISNULL(Apellidos, ''))),
                @CargoUsuarioRetorno = ISNULL(cargo_nombre, 'Funcionario')
            FROM dbo.TEmpleados 
            WHERE id = @DestinoUsuarioId;
        END

        -- Obtener el orden correlativo más alto existente
        DECLARE @UltimoOrden INT;
        SELECT @UltimoOrden = ISNULL(MAX(orden), 0)
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @Ahora DATETIME2 = GETDATE();
        DECLARE @ActividadRetorno VARCHAR(150) = 'Devolución / Retroceso a ' + ISNULL(@NomUnidadRetorno, 'Instancia Anterior');
        DECLARE @ProvFinal NVARCHAR(MAX) = CASE 
            WHEN @Proveido IS NOT NULL AND LTRIM(RTRIM(@Proveido)) <> '' 
            THEN @Proveido + CHAR(13) + CHAR(10) + 'Motivo de devolución: ' + @Justificacion
            ELSE 'Trámite devuelto para subsanación o corrección. Motivo: ' + @Justificacion
        END;

        -- 7. Insertar Movimiento de Retroceso
        INSERT INTO dbo.movimientos (
            tramite_id,
            orden,
            tipo_movimiento,
            actividad_nombre,
            usuario_origen_id,
            ubicacion_origen_id,
            usuario_destino_id,
            ubicacion_destino_id,
            estado_movimiento,
            proveido,
            justificacion_retroceso,
            instruccion,
            fecha_envio,
            fecha_recepcion,
            created_at
        ) VALUES (
            @TramiteId,
            @UltimoOrden + 1,
            'RETROCESO',
            @ActividadRetorno,
            @UsuarioId,
            @UbicacionOrgId,
            @DestinoUsuarioId,
            @DestinoUbicacionId,
            'POR_RECIBIR',
            @ProvFinal,
            @Justificacion,
            'Devuelto para subsanación / corrección',
            @Ahora,
            NULL,
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        -- 7. Actualizar estado y ubicación actual del trámite
        UPDATE dbo.tramites
        SET estado                  = 'POR_RECIBIR',
            usuario_actual_id       = @DestinoUsuarioId,
            ubicacion_actual_id     = @DestinoUbicacionId,
            cod_u_destino           = @CodURetorno,
            destinatario_nombre     = @NomUsuarioRetorno,
            destinatario_cargo      = @CargoUsuarioRetorno,
            destinatario_unidad     = @NomUnidadRetorno,
            instruccion             = 'Devuelto para subsanación / corrección',
            updated_at              = @Ahora
        WHERE id = @TramiteId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
