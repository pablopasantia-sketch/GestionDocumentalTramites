-- Migración 032: Stored Procedures para Bloquear y Desbloquear Procesos (RF-11 / Sprint 4)
-- =============================================================================
-- Implementa las operaciones institucionales de Bloqueo y Desbloqueo temporal
-- de trámites por Ventanilla Única y Administración, con auditoría inmutable.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_Bloquear: Bloqueo administrativo temporal de trámite (RF-11.1, RF-11.2, RF-11.3)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Bloquear
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

    IF @Motivo IS NULL OR LEN(LTRIM(RTRIM(@Motivo))) < 3
    BEGIN
        THROW 50002, 'El motivo o proveído del bloqueo es obligatorio y debe tener al menos 3 caracteres.', 1;
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

    IF @EstadoActual = 'BLOQUEADO'
    BEGIN
        THROW 50004, 'El trámite ya se encuentra en estado Bloqueado.', 1;
    END

    IF @EstadoActual IN ('CONCLUIDO', 'ANULADO')
    BEGIN
        THROW 50005, 'No se puede bloquear un trámite en estado Concluido o Anulado.', 1;
    END

    -- RF-11.1: Trámites que no estén en tránsito digital o despachados sin confirmación
    IF @EstadoActual IN ('POR_RECIBIR', 'EN_TRANSITO')
    BEGIN
        THROW 50006, 'No se puede bloquear un trámite que se encuentra en tránsito digital o despachado pendiente de recepción.', 1;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Actualizar estado del trámite
        UPDATE dbo.tramites
        SET estado = 'BLOQUEADO',
            motivo_bloqueo = LTRIM(RTRIM(@Motivo)),
            updated_at = GETDATE()
        WHERE id = @Id;

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
            'BLOQUEO',
            'Bloqueo de proceso',
            @UserId,
            @UbicacionId,
            @UsuarioActualId,
            @UbicacionActualId,
            'BLOQUEADO',
            'Bloqueo: ' + LTRIM(RTRIM(@Motivo)),
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

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_Desbloquear: Reactivación de trámite bloqueado (RF-11.4)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Desbloquear
    @Id          INT,
    @Motivo      NVARCHAR(MAX),
    @UserId      INT,
    @UbicacionId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @Id IS NULL OR @Id <= 0
    BEGIN
        THROW 50011, 'Identificador de trámite inválido.', 1;
    END

    IF @Motivo IS NULL OR LEN(LTRIM(RTRIM(@Motivo))) < 3
    BEGIN
        THROW 50012, 'El motivo o proveído del desbloqueo es obligatorio y debe tener al menos 3 caracteres.', 1;
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
        THROW 50013, 'El trámite no existe o se encuentra inactivo.', 1;
    END

    IF @EstadoActual <> 'BLOQUEADO'
    BEGIN
        THROW 50014, 'El trámite no se encuentra en estado Bloqueado.', 1;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Reactivar trámite al estado operativo EN_ATENCION
        UPDATE dbo.tramites
        SET estado = 'EN_ATENCION',
            motivo_bloqueo = NULL,
            updated_at = GETDATE()
        WHERE id = @Id;

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
            'DESBLOQUEO',
            'Desbloqueo de proceso',
            @UserId,
            @UbicacionId,
            @UsuarioActualId,
            @UbicacionActualId,
            'EN_ATENCION',
            'Desbloqueo: ' + LTRIM(RTRIM(@Motivo)),
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Wrappers compatibles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.SP_BloquearTramite 
    @Id INT, 
    @Motivo NVARCHAR(MAX), 
    @UserId INT = 1, 
    @UbicacionId INT = 3 
AS 
BEGIN 
    EXEC dbo.usp_Tramites_Bloquear @Id, @Motivo, @UserId, @UbicacionId; 
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_DesbloquearTramite 
    @Id INT, 
    @Motivo NVARCHAR(MAX), 
    @UserId INT = 1, 
    @UbicacionId INT = 3 
AS 
BEGIN 
    EXEC dbo.usp_Tramites_Desbloquear @Id, @Motivo, @UserId, @UbicacionId; 
END;
GO
