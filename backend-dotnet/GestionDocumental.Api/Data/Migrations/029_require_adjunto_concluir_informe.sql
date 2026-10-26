-- =============================================================================
-- MIGRACIÓN 029: EXIGIR INFORME DIGITAL ADJUNTO PARA CONCLUIR ETAPA DE COMISIÓN
-- Modifica usp_Tramites_ConcluirInformeComision para verificar que exista al menos
-- un documento PDF adjunto en dbo.adjuntos antes de permitir fijar fecha_fin_informe.
-- =============================================================================

CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ConcluirInformeComision
    @TramiteId       INT,
    @UsuarioId       INT,
    @Proveido        NVARCHAR(MAX) = NULL,
    @NuevoMovimientoId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @EstadoActual VARCHAR(30),
                @FechaInicio DATETIME2,
                @FechaLimite DATE,
                @UbicacionActualId INT;

        SELECT 
            @EstadoActual      = estado,
            @FechaInicio       = fecha_inicio_informe,
            @FechaLimite       = fecha_limite_respuesta,
            @UbicacionActualId = ubicacion_actual_id
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50004, 'El trámite especificado no existe o se encuentra inactivo.', 1;
        END

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO')
        BEGIN
            THROW 50005, 'No se puede concluir el informe en un trámite Anulado, Bloqueado o Concluido.', 1;
        END

        DECLARE @Ahora DATETIME2 = SYSDATETIME();

        -- Verificar si el plazo ya había expirado (fecha_limite_respuesta < Hoy)
        IF @FechaLimite IS NOT NULL AND CAST(@Ahora AS DATE) > @FechaLimite
        BEGIN
            THROW 50006, 'SISTEMA CERRADO: El plazo reglamentario de elaboración de informe ha expirado. Por normativa CMS, no se admiten informes extemporáneos.', 1;
        END

        -- Verificar que exista al menos un documento digital PDF adjunto en el expediente
        IF NOT EXISTS (SELECT 1 FROM dbo.adjuntos WHERE tramite_id = @TramiteId AND activo = 1)
        BEGIN
            THROW 50007, 'No se puede concluir la elaboración del informe sin haber cargado previamente el archivo digital (PDF) del Informe de Comisión.', 1;
        END

        -- Si no se había iniciado, se fija fecha de inicio simultánea
        IF @FechaInicio IS NULL
        BEGIN
            SET @FechaInicio = @Ahora;
            UPDATE dbo.tramites
            SET fecha_inicio_informe = @Ahora,
                dias_plazo_informe = ISNULL(dias_plazo_informe, 10)
            WHERE id = @TramiteId;
        END

        -- 1. Actualizar fecha_fin_informe en dbo.tramites
        UPDATE dbo.tramites
        SET fecha_fin_informe = @Ahora,
            updated_at        = @Ahora
        WHERE id = @TramiteId;

        -- 2. Determinar siguiente orden de movimiento
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @UbicacionUsuario INT = @UbicacionActualId;
        IF @UbicacionUsuario IS NULL
        BEGIN
            SELECT TOP 1 @UbicacionUsuario = id FROM dbo.ubicaciones_org WHERE activo = 1;
        END

        -- 3. Registrar movimiento de conclusión de informe
        DECLARE @DetalleMov NVARCHAR(MAX) = ISNULL(@Proveido, 'Informe técnico de comisión concluido satisfactoriamente. Trámite habilitado para su tratamiento en Sesión del Pleno Camaral.');
        DECLARE @NomActividad VARCHAR(150) = 'Conclusión de Informe de Comisión CMS';

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
            instruccion,
            tiempo_estimado_minutos,
            fecha_envio,
            fecha_recepcion,
            created_at
        ) VALUES (
            @TramiteId,
            @NextOrden,
            'INFORME_CONCLUIDO',
            @NomActividad,
            @UsuarioId,
            @UbicacionUsuario,
            @UsuarioId,
            @UbicacionUsuario,
            @EstadoActual,
            @DetalleMov,
            'Habilitado formalmente para consideración y tratamiento en Sesión del Pleno CMS.',
            0,
            @Ahora,
            @Ahora,
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
