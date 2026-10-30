-- Migración 034: Stored Procedure para Habilitar Trámite Concluido (RF-10.2 / Sprint 4)
-- =============================================================================
-- Implementa la operación institucional de reactivación/habilitación de un trámite
-- concluido por el Administrador de Trámites (ADMIN_TRAMITES / ADMIN_SISTEMA):
-- 1. Trámite debe existir y estar activo.
-- 2. El motivo de habilitación es obligatorio (mínimo 5 caracteres).
-- 3. Solo se pueden habilitar trámites en estado 'CONCLUIDO'.
-- 4. El trámite retorna al estado operativo 'EN_ATENCION', limpiando la fecha de conclusión.
-- 5. Se asienta en movimientos un registro inmutable con tipo 'HABILITACION', orden correlativo,
--    proveído con la justificación y usuario/ubicación del administrador.
-- =============================================================================

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

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Reactivar trámite retornándolo al flujo operativo EN_ATENCION
        UPDATE dbo.tramites
        SET estado = 'EN_ATENCION',
            fecha_conclusion = NULL,
            updated_at = GETDATE()
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
            'Habilitación: ' + LTRIM(RTRIM(@Motivo)),
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

-- Wrapper compatible
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
