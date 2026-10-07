-- =============================================================================
-- MIGRACIÓN 019: PROCEDIMIENTO ALMACENADO PARA MARCAR TRÁMITE COMO ATENDIDO
-- Sistema Wayka MVP - Sprint 3 (Flujo Directo de Trabajo)
-- Base de datos: DB_TRAMITES_EXTERNOS (Microsoft SQL Server T-SQL)
-- =============================================================================

CREATE OR ALTER PROCEDURE dbo.usp_Tramites_MarcarAtendido
    @TramiteId              INT,
    @UsuarioId              INT,
    @UbicacionOrgId         INT,
    @Proveido               NVARCHAR(MAX),
    @ActividadNombre        VARCHAR(150)    = NULL,
    @NuevoMovimientoId      INT             OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar existencia y estado del trámite
        DECLARE @EstadoActual VARCHAR(30), @Correlativo VARCHAR(50), @UsuarioActualId INT, @UbicacionActualId INT;
        SELECT 
            @EstadoActual = estado, 
            @Correlativo = numero_correlativo,
            @UsuarioActualId = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50050, 'El trámite indicado no existe o se encuentra inactivo.', 1;
        END

        IF @EstadoActual IN ('CONCLUIDO', 'ANULADO', 'BLOQUEADO')
        BEGIN
            THROW 50051, 'El trámite se encuentra en estado Concluido, Anulado o Bloqueado y no puede ser modificado.', 1;
        END

        IF @EstadoActual = 'POR_RECIBIR'
        BEGIN
            THROW 50052, 'El trámite se encuentra pendiente de recepción. Debe recepcionarlo primero antes de concluir su atención.', 1;
        END

        IF @Proveido IS NULL OR LTRIM(RTRIM(@Proveido)) = ''
        BEGIN
            THROW 50053, 'Debe ingresar una nota de informe, dictamen técnico o proveído de atención (mínimo 3 caracteres).', 1;
        END

        DECLARE @Ahora DATETIME2 = GETDATE();

        -- 2. Actualizar estado del trámite a ATENDIDO (listo para despachar)
        UPDATE dbo.tramites
        SET estado              = 'ATENDIDO',
            usuario_actual_id   = @UsuarioId,
            ubicacion_actual_id = @UbicacionOrgId,
            updated_at          = @Ahora
        WHERE id = @TramiteId;

        -- 3. Actualizar o registrar en movimientos
        DECLARE @UltimoMovId INT, @UltimoOrden INT, @UltimoEstadoMov VARCHAR(30);
        SELECT TOP 1 
            @UltimoMovId = id,
            @UltimoOrden = orden,
            @UltimoEstadoMov = estado_movimiento
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId
        ORDER BY orden DESC, id DESC;

        -- Si el último movimiento está activo en la misma oficina, actualizarlo a ATENDIDO
        IF @UltimoMovId IS NOT NULL AND @UltimoEstadoMov IN ('EN_ATENCION', 'RECIBIDO')
        BEGIN
            UPDATE dbo.movimientos
            SET estado_movimiento       = 'ATENDIDO',
                proveido                = CASE 
                                            WHEN proveido IS NOT NULL AND LTRIM(RTRIM(proveido)) <> '' 
                                            THEN proveido + CHAR(13) + CHAR(10) + 'Atención concluida: ' + @Proveido
                                            ELSE @Proveido 
                                          END,
                actividad_nombre        = ISNULL(@ActividadNombre, actividad_nombre)
            WHERE id = @UltimoMovId;

            SET @NuevoMovimientoId = @UltimoMovId;
        END
        ELSE
        BEGIN
            -- Insertar nuevo movimiento interno tipo ATENCION / EVALUACION
            DECLARE @NomActividad VARCHAR(150) = ISNULL(@ActividadNombre, 'Informe y atención técnica concluida');

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
                fecha_envio,
                fecha_recepcion,
                created_at
            ) VALUES (
                @TramiteId,
                ISNULL(@UltimoOrden, 0) + 1,
                'EVALUACION',
                @NomActividad,
                @UsuarioId,
                @UbicacionOrgId,
                @UsuarioId,
                @UbicacionOrgId,
                'ATENDIDO',
                @Proveido,
                'Listo para despacho institucional',
                NULL,
                @Ahora,
                @Ahora
            );

            SET @NuevoMovimientoId = SCOPE_IDENTITY();
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
