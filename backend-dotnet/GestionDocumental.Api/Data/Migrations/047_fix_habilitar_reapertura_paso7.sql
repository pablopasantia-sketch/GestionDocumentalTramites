-- =============================================================================
-- 047_fix_habilitar_reapertura_paso7.sql
-- Corrige la reactivación de trámites concluidos (RF-10.2).
--
-- Motivo: la migración 034 dejaba el trámite en estado EN_ATENCION pero sin
-- tocar `paso_actual` (que quedaba en 8 tras el Despacho Final). Como ninguna
-- acción del circuito corresponde al paso 8, el expediente reaparecía en la
-- bandeja del Secretario General pero sin ninguna operación ejecutable.
--
-- Nueva conducta: al habilitar un CONCLUIDO se reabre en la etapa de
-- Secretaría General (paso 7, unidad 4) con ambas firmas conservadas. Se limpian
-- los datos del despacho anterior para que no quede un CITE viejo vigente, y
-- la única acción pendiente es un nuevo Despacho Final.
-- =============================================================================

USE DB_TRAMITES_EXTERNOS;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Habilitar
    @Id          INT,
    @Motivo      NVARCHAR(MAX),
    @UserId      INT,
    @UbicacionId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @Id IS NULL OR @Id <= 0
    BEGIN
        THROW 50001, 'Identificador de trámite inválido.', 1;
    END

    IF @Motivo IS NULL OR LEN(LTRIM(RTRIM(@Motivo))) < 5
    BEGIN
        THROW 50002, 'El motivo de habilitación es obligatorio y debe contener al menos 5 caracteres.', 1;
    END

    DECLARE @EstadoActual VARCHAR(50);
    DECLARE @UsuarioActualId INT;
    DECLARE @UbicacionActualId INT;

    SELECT
        @EstadoActual = estado,
        @UsuarioActualId = usuario_actual_id,
        @UbicacionActualId = ubicacion_actual_id
    FROM dbo.tramites
    WHERE id = @Id AND activo = 1;

    IF @EstadoActual IS NULL
    BEGIN
        THROW 50003, 'El trámite no existe o se encuentra inactivo.', 1;
    END

    IF @EstadoActual = 'ANULADO'
    BEGIN
        THROW 50004, 'No se puede habilitar un trámite Anulado. La anulación es una cancelación definitiva.', 1;
    END

    IF @EstadoActual <> 'CONCLUIDO'
    BEGIN
        THROW 50005, 'Solo se pueden habilitar trámites que se encuentren en estado Concluido.', 1;
    END

    -- La unidad 4 (Secretaría General) es la dueña del paso 7. Se resuelve el id
    -- real de la tabla para no depender de que la PK coincida con el codU.
    DECLARE @UbicacionSecretariaId INT;
    SELECT TOP 1 @UbicacionSecretariaId = id
    FROM dbo.ubicaciones_org
    WHERE codU = 4 AND activo = 1;
    SET @UbicacionSecretariaId = ISNULL(@UbicacionSecretariaId, 4);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Reabrir en Secretaría General (paso 7), conservando las firmas ya
        --    registradas. El Despacho Final vuelve a ser la acción pendiente.
        UPDATE dbo.tramites
        SET estado                      = 'EN_ATENCION',
            paso_actual                 = 7,
            fecha_conclusion            = NULL,
            usuario_actual_id           = NULL,
            ubicacion_actual_id         = @UbicacionSecretariaId,
            despacho_final_fecha        = NULL,
            despacho_final_cite         = NULL,
            despacho_final_destinatario = NULL,
            updated_at                  = GETDATE()
        WHERE id = @Id AND activo = 1;

        -- 2. Registrar en auditoría inmutable (movimientos)
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1 FROM dbo.movimientos WHERE tramite_id = @Id;

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
            fecha_envio,
            created_at
        ) VALUES (
            @Id,
            @NextOrden,
            'HABILITACION',
            'Habilitación de trámite concluido',
            @UserId,
            @UbicacionId,
            @UsuarioActualId,
            @UbicacionActualId,
            'EN_ATENCION',
            'Habilitación: ' + LTRIM(RTRIM(@Motivo)) +
                '. Reabierto en Secretaría General (paso 7) con firmas conservadas; ' +
                'se limpiaron los datos del despacho anterior.',
            GETDATE(),
            GETDATE()
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Wrapper compatible (firma sin cambios respecto de la migración 034)
CREATE OR ALTER PROCEDURE dbo.SP_HabilitarTramite
    @Id INT,
    @Motivo NVARCHAR(MAX),
    @UserId INT = 1,
    @UbicacionId INT = 3
AS
BEGIN
    EXEC dbo.usp_Tramites_Habilitar @Id, @Motivo, @UserId, @UbicacionId;
END;
GO
