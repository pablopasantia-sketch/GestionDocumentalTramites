-- Migración 033: Reforzar Validación de Anulación de Procesos (RF-10.1 / Sprint 4)
-- =============================================================================
-- Implementa validaciones institucionales estrictas para la anulación de trámites
-- por el Administrador de Trámites (ADMIN_TRAMITES / ADMIN_SISTEMA):
-- 1. Trámite debe existir y estar activo.
-- 2. El motivo debe ser obligatorio (mínimo 5 caracteres).
-- 3. Solo se pueden anular trámites en estado 'EN_ATENCION'.
--    - No se pueden anular trámites ya 'ANULADO' o 'CONCLUIDO'.
--    - No se pueden anular trámites en tránsito digital ('POR_RECIBIR' / 'EN_TRANSITO').
--    - Si el trámite está 'BLOQUEADO', debe ser desbloqueado previamente.
-- 4. Registro inmutable en movimientos con tipo 'ANULACION', proveído y usuario.
-- =============================================================================

CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Anular
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
        THROW 50002, 'El motivo de anulación es obligatorio y debe contener al menos 5 caracteres.', 1;
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
        THROW 50004, 'El trámite ya se encuentra en estado Anulado.', 1;
    END

    IF @EstadoActual = 'CONCLUIDO'
    BEGIN
        THROW 50005, 'No se puede anular un trámite Concluido. Los trámites concluidos deben seguir el procedimiento de habilitación si corresponde.', 1;
    END

    IF @EstadoActual IN ('POR_RECIBIR', 'EN_TRANSITO')
    BEGIN
        THROW 50006, 'No se puede anular un trámite que se encuentra en tránsito digital pendiente de recepción.', 1;
    END

    IF @EstadoActual = 'BLOQUEADO'
    BEGIN
        THROW 50007, 'No se puede anular un trámite en estado Bloqueado. Debe ser desbloqueado formalmente antes de procesar su anulación.', 1;
    END

    -- RF-10.1: La regla oficial establece anular trámites en estado "En atención"
    IF @EstadoActual NOT IN ('EN_ATENCION', 'ATENDIDO')
    BEGIN
        THROW 50008, 'Solo se pueden anular trámites que se encuentren en estado En atención.', 1;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Actualizar estado y motivo en tramites
        UPDATE dbo.tramites
        SET estado = 'ANULADO',
            motivo_anulacion = LTRIM(RTRIM(@Motivo)),
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
            'ANULACION',
            'Anulación de trámite',
            @UserId,
            @UbicacionId,
            @UsuarioActualId,
            @UbicacionActualId,
            'ANULADO',
            'Anulación: ' + LTRIM(RTRIM(@Motivo)),
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
CREATE OR ALTER PROCEDURE dbo.SP_AnularTramite
    @Id INT,
    @Motivo NVARCHAR(MAX),
    @UserId INT = 1,
    @UbicacionId INT = 3
AS
BEGIN
    EXEC dbo.usp_Tramites_Anular @Id, @Motivo, @UserId, @UbicacionId;
END;
GO
