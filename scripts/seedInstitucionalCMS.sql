-- =============================================================================
-- Script de Seed Institucional: Concejo Municipal de Sucre (CMS)
-- Base de Datos: DB_TRAMITES_EXTERNOS
-- 
-- Poblamiento oficial e idempotente del Organigrama del CMS:
-- 1. Catálogo de Unidades Organizacionales (dbo.TUnidad y dbo.ubicaciones_org)
-- 2. Catálogo de Cargos Dependientes (dbo.TCargo)
-- 
-- Idempotencia garantizada con MERGE y verificaciones IF NOT EXISTS.
-- =============================================================================

USE DB_TRAMITES_EXTERNOS;
GO

SET NOCOUNT ON;
PRINT '=============================================================================';
PRINT '🏛️  INICIANDO POBLAMIENTO OFICIAL CMS (UNIDADES Y CARGOS)';
PRINT '=============================================================================';

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Asegurar longitud suficiente de columnas para la nomenclatura oficial
-- ─────────────────────────────────────────────────────────────────────────────
IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'TUnidad' AND column_name = 'NombU' AND character_maximum_length < 150
)
BEGIN
    PRINT '🔹 Ajustando longitud de dbo.TUnidad.NombU a VARCHAR(150)...';
    ALTER TABLE dbo.TUnidad ALTER COLUMN NombU VARCHAR(150) NOT NULL;
END
GO

IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'TCargo' AND column_name = 'NombreC' AND character_maximum_length < 150
)
BEGIN
    PRINT '🔹 Ajustando longitud de dbo.TCargo.NombreC a VARCHAR(150)...';
    ALTER TABLE dbo.TCargo ALTER COLUMN NombreC VARCHAR(150) NOT NULL;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CATÁLOGO DE UNIDADES ORGANIZACIONALES (dbo.TUnidad)
--    21 Unidades Oficiales del Concejo Municipal de Sucre (CMS)
-- ─────────────────────────────────────────────────────────────────────────────
PRINT '🔹 Sembrando 21 Unidades Oficiales en dbo.TUnidad...';

MERGE dbo.TUnidad AS target
USING (
    VALUES
        (CAST(1 AS SMALLINT),  'Presidencia del Concejo Municipal',                                                                          CAST(1 AS BIT)),
        (CAST(2 AS SMALLINT),  'Pleno del Concejo Municipal',                                                                                CAST(1 AS BIT)),
        (CAST(3 AS SMALLINT),  'Vicepresidencia del Concejo Municipal',                                                                      CAST(1 AS BIT)),
        (CAST(4 AS SMALLINT),  'Secretaría General del Concejo Municipal',                                                                   CAST(1 AS BIT)),
        (CAST(5 AS SMALLINT),  'Secretaría Administrativa',                                                                                  CAST(1 AS BIT)),
        (CAST(6 AS SMALLINT),  'Comisión Autonómica y Legislativa Municipal (C.A.L.M.)',                                                      CAST(1 AS BIT)),
        (CAST(7 AS SMALLINT),  'Comisión de Medio Ambiente, Salubridad y Defensa del Consumidor (C.M.A.S.D.C.)',                              CAST(1 AS BIT)),
        (CAST(8 AS SMALLINT),  'Comisión de Obras Públicas, Planificación y Ordenamiento Territorial (C.O.P.P.O.T.)',                           CAST(1 AS BIT)),
        (CAST(9 AS SMALLINT),  'Comisión de Desarrollo Económico, Productivo Local, Financiera y de Gestión Administrativa (C.D.E.P.L.F.G.A.)', CAST(1 AS BIT)),
        (CAST(10 AS SMALLINT), 'Comisión de Desarrollo Humano, Social y Seguridad Ciudadana (C.D.H.S.S.C.)',                                 CAST(1 AS BIT)),
        (CAST(11 AS SMALLINT), 'Comisión de Ética y Procesos Administrativos',                                                               CAST(1 AS BIT)),
        (CAST(12 AS SMALLINT), 'Asesoría General del Pleno',                                                                                 CAST(1 AS BIT)),
        (CAST(13 AS SMALLINT), 'Jefatura de Comunicación',                                                                                   CAST(1 AS BIT)),
        (CAST(14 AS SMALLINT), 'Jefatura de Contabilidad',                                                                                   CAST(1 AS BIT)),
        (CAST(15 AS SMALLINT), 'Unidad de Cómputo / Sistemas',                                                                               CAST(1 AS BIT)),
        (CAST(16 AS SMALLINT), 'Ventanilla Única CMS',                                                                                       CAST(1 AS BIT)),
        (CAST(17 AS SMALLINT), 'Unidad de Archivos y Gaceta Municipal',                                                                      CAST(1 AS BIT)),
        (CAST(18 AS SMALLINT), 'Unidad de Activos Fijos',                                                                                    CAST(1 AS BIT)),
        (CAST(19 AS SMALLINT), 'Unidad de Almacenes',                                                                                        CAST(1 AS BIT)),
        (CAST(20 AS SMALLINT), 'Unidad de Recursos Humanos',                                                                                 CAST(1 AS BIT)),
        (CAST(21 AS SMALLINT), 'Servicios Generales y Mensajería',                                                                           CAST(1 AS BIT))
) AS source (CodU, NombU, Activo)
ON target.CodU = source.CodU
WHEN MATCHED THEN
    UPDATE SET 
        target.NombU  = source.NombU,
        target.Activo = source.Activo
WHEN NOT MATCHED THEN
    INSERT (CodU, NombU, Activo)
    VALUES (source.CodU, source.NombU, source.Activo);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SINCRONIZACIÓN DE dbo.ubicaciones_org CON dbo.TUnidad
--    Para el árbol de navegación del sistema y selectores institucionales
-- ─────────────────────────────────────────────────────────────────────────────
PRINT '🔹 Sincronizando dbo.ubicaciones_org con las 21 Unidades del CMS...';

-- Sincronizar unidades existentes o insertar nuevas en ubicaciones_org
MERGE dbo.ubicaciones_org AS target
USING (
    VALUES
        (CAST(1 AS SMALLINT),  'CMS-PRES',       'Presidencia del Concejo Municipal',                                                                          'PRES',        1, 1),
        (CAST(2 AS SMALLINT),  'CMS-PLENO',      'Pleno del Concejo Municipal',                                                                                'PLENO',       1, 1),
        (CAST(3 AS SMALLINT),  'CMS-VICE',       'Vicepresidencia del Concejo Municipal',                                                                      'VICE',        2, 1),
        (CAST(4 AS SMALLINT),  'CMS-SEC-GEN',    'Secretaría General del Concejo Municipal',                                                                   'SEC-GEN',     2, 1),
        (CAST(5 AS SMALLINT),  'CMS-SEC-ADM',    'Secretaría Administrativa',                                                                                  'SEC-ADM',     2, 1),
        (CAST(6 AS SMALLINT),  'CMS-CALM',       'Comisión Autonómica y Legislativa Municipal (C.A.L.M.)',                                                      'CALM',        2, 1),
        (CAST(7 AS SMALLINT),  'CMS-CMASDC',     'Comisión de Medio Ambiente, Salubridad y Defensa del Consumidor (C.M.A.S.D.C.)',                              'CMASDC',      2, 1),
        (CAST(8 AS SMALLINT),  'CMS-COPPOT',     'Comisión de Obras Públicas, Planificación y Ordenamiento Territorial (C.O.P.P.O.T.)',                           'COPPOT',      2, 1),
        (CAST(9 AS SMALLINT),  'CMS-CDEPLFGA',   'Comisión de Desarrollo Económico, Productivo Local, Financiera y de Gestión Administrativa (C.D.E.P.L.F.G.A.)', 'CDEPLFGA',    2, 1),
        (CAST(10 AS SMALLINT), 'CMS-CDHSSC',     'Comisión de Desarrollo Humano, Social y Seguridad Ciudadana (C.D.H.S.S.C.)',                                 'CDHSSC',      2, 1),
        (CAST(11 AS SMALLINT), 'CMS-CETICA',     'Comisión de Ética y Procesos Administrativos',                                                               'CETICA',      2, 1),
        (CAST(12 AS SMALLINT), 'CMS-ASES-GEN',   'Asesoría General del Pleno',                                                                                 'AGP',         2, 1),
        (CAST(13 AS SMALLINT), 'CMS-JCOM',       'Jefatura de Comunicación',                                                                                   'COM',         3, 1),
        (CAST(14 AS SMALLINT), 'CMS-JCONT',      'Jefatura de Contabilidad',                                                                                   'CONT',        3, 1),
        (CAST(15 AS SMALLINT), 'CMS-COMP',       'Unidad de Cómputo / Sistemas',                                                                               'COMP',        3, 1),
        (CAST(16 AS SMALLINT), 'CMS-VU',         'Ventanilla Única CMS',                                                                                       'VU',          3, 1),
        (CAST(17 AS SMALLINT), 'CMS-ARCH-GAC',   'Unidad de Archivos y Gaceta Municipal',                                                                      'GAC',         3, 1),
        (CAST(18 AS SMALLINT), 'CMS-ACT-FIJ',    'Unidad de Activos Fijos',                                                                                    'AF',          3, 1),
        (CAST(19 AS SMALLINT), 'CMS-ALM',        'Unidad de Almacenes',                                                                                        'ALM',         3, 1),
        (CAST(20 AS SMALLINT), 'CMS-RRHH',       'Unidad de Recursos Humanos',                                                                                 'RRHH',        3, 1),
        (CAST(21 AS SMALLINT), 'CMS-SERV-GEN',   'Servicios Generales y Mensajería',                                                                           'SG',          3, 1)
) AS source (codU, codigo, nombre, sigla, nivel, activo)
ON target.codU = source.codU
WHEN MATCHED THEN
    UPDATE SET 
        target.codigo    = source.codigo,
        target.nombre    = source.nombre,
        target.sigla     = source.sigla,
        target.nivel     = source.nivel,
        target.activo    = source.activo,
        target.updated_at = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (codigo, nombre, sigla, nivel, padre_id, descripcion, activo, codU, created_at, updated_at)
    VALUES (source.codigo, source.nombre, source.sigla, source.nivel, NULL, 'Unidad Organizacional Oficial del CMS', source.activo, source.codU, SYSDATETIME(), SYSDATETIME());
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CATÁLOGO DE CARGOS POR UNIDAD (dbo.TCargo)
--    Cargos oficiales del Concejo Municipal de Sucre (CMS)
-- ─────────────────────────────────────────────────────────────────────────────
PRINT '🔹 Sembrando Cargos Oficiales del CMS en dbo.TCargo...';

MERGE dbo.TCargo AS target
USING (
    VALUES
        -- Pleno, Directiva y Despacho
        (CAST(1  AS SMALLINT), 'Presidente del Concejo Municipal',                                         CAST(1  AS SMALLINT)),
        (CAST(2  AS SMALLINT), 'Secretaria de Presidencia',                                                CAST(1  AS SMALLINT)),
        (CAST(3  AS SMALLINT), 'Asistente de Presidencia',                                                 CAST(1  AS SMALLINT)),

        (CAST(4  AS SMALLINT), 'Vicepresidente del Concejo Municipal',                                     CAST(3  AS SMALLINT)),
        (CAST(5  AS SMALLINT), 'Secretaria de Vicepresidencia',                                            CAST(3  AS SMALLINT)),

        (CAST(6  AS SMALLINT), 'Secretario General del Concejo Municipal',                                 CAST(4  AS SMALLINT)),
        (CAST(7  AS SMALLINT), 'Secretaria de Secretaría General',                                         CAST(4  AS SMALLINT)),

        (CAST(8  AS SMALLINT), 'Concejal Municipal 01',                                                    CAST(2  AS SMALLINT)),
        (CAST(9  AS SMALLINT), 'Concejal Municipal 02',                                                    CAST(2  AS SMALLINT)),
        (CAST(10 AS SMALLINT), 'Concejal Municipal 03',                                                    CAST(2  AS SMALLINT)),
        (CAST(11 AS SMALLINT), 'Concejal Municipal 04',                                                    CAST(2  AS SMALLINT)),
        (CAST(12 AS SMALLINT), 'Concejal Municipal 05',                                                    CAST(2  AS SMALLINT)),
        (CAST(13 AS SMALLINT), 'Concejal Municipal 06',                                                    CAST(2  AS SMALLINT)),
        (CAST(14 AS SMALLINT), 'Concejal Municipal 07',                                                    CAST(2  AS SMALLINT)),
        (CAST(15 AS SMALLINT), 'Concejal Municipal 08',                                                    CAST(2  AS SMALLINT)),
        (CAST(16 AS SMALLINT), 'Concejal Municipal 09',                                                    CAST(2  AS SMALLINT)),
        (CAST(17 AS SMALLINT), 'Concejal Municipal 10',                                                    CAST(2  AS SMALLINT)),
        (CAST(18 AS SMALLINT), 'Concejal Municipal 11',                                                    CAST(2  AS SMALLINT)),
        (CAST(19 AS SMALLINT), 'Asesor del Pleno',                                                         CAST(2  AS SMALLINT)),
        (CAST(20 AS SMALLINT), 'Secretaria del Pleno',                                                     CAST(2  AS SMALLINT)),
        (CAST(21 AS SMALLINT), 'Auxiliar del Pleno',                                                       CAST(2  AS SMALLINT)),
        (CAST(22 AS SMALLINT), 'Encargado de Registro y Revisión de Trámites',                             CAST(2  AS SMALLINT)),
        (CAST(23 AS SMALLINT), 'Asesor General del Pleno',                                                 CAST(12 AS SMALLINT)),

        -- Comisiones Permanentes
        -- 1. Comisión Autonómica y Legislativa Municipal (C.A.L.M.)
        (CAST(24 AS SMALLINT), 'Presidente de Comisión C.A.L.M.',                                          CAST(6  AS SMALLINT)),
        (CAST(25 AS SMALLINT), 'Asesor Legal I C.A.L.M.',                                                  CAST(6  AS SMALLINT)),
        (CAST(26 AS SMALLINT), 'Asesor Legal II C.A.L.M.',                                                 CAST(6  AS SMALLINT)),
        (CAST(27 AS SMALLINT), 'Asesor Técnico Legal C.A.L.M.',                                            CAST(6  AS SMALLINT)),
        (CAST(28 AS SMALLINT), 'Secretaria C.A.L.M.',                                                      CAST(6  AS SMALLINT)),

        -- 2. Comisión de Medio Ambiente, Salubridad y Defensa del Consumidor (C.M.A.S.D.C.)
        (CAST(29 AS SMALLINT), 'Presidente de Comisión C.M.A.S.D.C.',                                      CAST(7  AS SMALLINT)),
        (CAST(30 AS SMALLINT), 'Asesor Legal Comisión C.M.A.S.D.C.',                                       CAST(7  AS SMALLINT)),
        (CAST(31 AS SMALLINT), 'Asesor Técnico Ambientalista C.M.A.S.D.C.',                                CAST(7  AS SMALLINT)),

        -- 3. Comisión de Obras Públicas, Planificación y Ordenamiento Territorial (C.O.P.P.O.T.)
        (CAST(32 AS SMALLINT), 'Presidente de Comisión C.O.P.P.O.T.',                                      CAST(8  AS SMALLINT)),
        (CAST(33 AS SMALLINT), 'Asesor de Patrimonio C.O.P.P.O.T.',                                        CAST(8  AS SMALLINT)),
        (CAST(34 AS SMALLINT), 'Asesor Técnico Civil C.O.P.P.O.T.',                                        CAST(8  AS SMALLINT)),
        (CAST(35 AS SMALLINT), 'Asesor Legal C.O.P.P.O.T.',                                                CAST(8  AS SMALLINT)),
        (CAST(36 AS SMALLINT), 'Secretaria C.O.P.P.O.T.',                                                  CAST(8  AS SMALLINT)),

        -- 4. Comisión de Desarrollo Económico, Productivo Local, Financiera y de Gestión Administrativa (C.D.E.P.L.F.G.A.)
        (CAST(37 AS SMALLINT), 'Presidente de Comisión C.D.E.P.L.F.G.A.',                                  CAST(9  AS SMALLINT)),
        (CAST(38 AS SMALLINT), 'Asesor Económico I C.D.E.P.L.F.G.A.',                                      CAST(9  AS SMALLINT)),
        (CAST(39 AS SMALLINT), 'Asesor Económico II C.D.E.P.L.F.G.A.',                                     CAST(9  AS SMALLINT)),
        (CAST(40 AS SMALLINT), 'Asesor Económico III C.D.E.P.L.F.G.A.',                                    CAST(9  AS SMALLINT)),
        (CAST(41 AS SMALLINT), 'Asesor Legal I C.D.E.P.L.F.G.A.',                                          CAST(9  AS SMALLINT)),
        (CAST(42 AS SMALLINT), 'Asesor Legal II C.D.E.P.L.F.G.A.',                                         CAST(9  AS SMALLINT)),
        (CAST(43 AS SMALLINT), 'Asesor Técnico C.D.E.P.L.F.G.A.',                                          CAST(9  AS SMALLINT)),
        (CAST(44 AS SMALLINT), 'Secretaria C.D.E.P.L.F.G.A.',                                              CAST(9  AS SMALLINT)),

        -- 5. Comisión de Desarrollo Humano, Social y Seguridad Ciudadana (C.D.H.S.S.C.)
        (CAST(45 AS SMALLINT), 'Presidente de Comisión C.D.H.S.S.C.',                                      CAST(10 AS SMALLINT)),
        (CAST(46 AS SMALLINT), 'Asesor Legal C.D.H.S.S.C.',                                                CAST(10 AS SMALLINT)),
        (CAST(47 AS SMALLINT), 'Secretaria C.D.H.S.S.C.',                                                  CAST(10 AS SMALLINT)),

        -- 6. Comisión de Ética y Procesos Administrativos
        (CAST(48 AS SMALLINT), 'Presidente de Comisión de Ética y Procesos Administrativos',               CAST(11 AS SMALLINT)),

        -- Secretaría Administrativa y Áreas de Apoyo
        (CAST(49 AS SMALLINT), 'Secretario Administrativo',                                                CAST(5  AS SMALLINT)),
        (CAST(50 AS SMALLINT), 'Asesor Técnico Legal de Secretaría Administrativa',                        CAST(5  AS SMALLINT)),
        (CAST(51 AS SMALLINT), 'Secretaria de Secretaría Administrativa',                                  CAST(5  AS SMALLINT)),
        (CAST(52 AS SMALLINT), 'Secretaria Auxiliar Administrativa',                                       CAST(5  AS SMALLINT)),
        (CAST(53 AS SMALLINT), 'Cotizador',                                                                CAST(5  AS SMALLINT)),

        -- Ventanilla Única CMS
        (CAST(54 AS SMALLINT), 'Recepcionista de Ventanilla Única',                                        CAST(16 AS SMALLINT)),

        -- Comunicación
        (CAST(55 AS SMALLINT), 'Jefe de Comunicación',                                                     CAST(13 AS SMALLINT)),
        (CAST(56 AS SMALLINT), 'Responsable de Comunicación Social',                                       CAST(13 AS SMALLINT)),
        (CAST(57 AS SMALLINT), 'Profesional en Protocolo I',                                               CAST(13 AS SMALLINT)),
        (CAST(58 AS SMALLINT), 'Profesional en Protocolo II',                                              CAST(13 AS SMALLINT)),
        (CAST(59 AS SMALLINT), 'Asistente de Producción Auditiva y Diseño Gráfico',                        CAST(13 AS SMALLINT)),

        -- Contabilidad
        (CAST(60 AS SMALLINT), 'Jefe de Contabilidad',                                                     CAST(14 AS SMALLINT)),
        (CAST(61 AS SMALLINT), 'Responsable de Contabilidad',                                              CAST(14 AS SMALLINT)),
        (CAST(62 AS SMALLINT), 'Responsable de Presupuestos',                                              CAST(14 AS SMALLINT)),
        (CAST(63 AS SMALLINT), 'Encargado de Registro Contable y Tesorería',                               CAST(14 AS SMALLINT)),
        (CAST(64 AS SMALLINT), 'Archivista Contable',                                                      CAST(14 AS SMALLINT)),

        -- Cómputo / Sistemas
        (CAST(65 AS SMALLINT), 'Responsable de Cómputo',                                                   CAST(15 AS SMALLINT)),
        (CAST(66 AS SMALLINT), 'Técnico Programador',                                                      CAST(15 AS SMALLINT)),

        -- Archivo y Gaceta
        (CAST(67 AS SMALLINT), 'Responsable de Gaceta Municipal',                                          CAST(17 AS SMALLINT)),
        (CAST(68 AS SMALLINT), 'Archivista Gaceta',                                                        CAST(17 AS SMALLINT)),
        (CAST(69 AS SMALLINT), 'Encargado de Archivos',                                                    CAST(17 AS SMALLINT)),
        (CAST(70 AS SMALLINT), 'Organizador de Archivos',                                                  CAST(17 AS SMALLINT)),

        -- Activos Fijos y Almacenes
        (CAST(71 AS SMALLINT), 'Encargada de Activos Fijos',                                               CAST(18 AS SMALLINT)),
        (CAST(72 AS SMALLINT), 'Encargada de Almacenes',                                                   CAST(19 AS SMALLINT)),

        -- Recursos Humanos
        (CAST(73 AS SMALLINT), 'Responsable de Recursos Humanos',                                          CAST(20 AS SMALLINT)),

        -- Servicios Generales y Mensajería
        (CAST(74 AS SMALLINT), 'Mensajero I',                                                              CAST(21 AS SMALLINT)),
        (CAST(75 AS SMALLINT), 'Mensajero II',                                                             CAST(21 AS SMALLINT)),
        (CAST(76 AS SMALLINT), 'Chofer I',                                                                 CAST(21 AS SMALLINT)),
        (CAST(77 AS SMALLINT), 'Chofer II',                                                                CAST(21 AS SMALLINT)),
        (CAST(78 AS SMALLINT), 'Chofer III',                                                               CAST(21 AS SMALLINT)),
        (CAST(79 AS SMALLINT), 'Chofer IV',                                                                CAST(21 AS SMALLINT)),
        (CAST(80 AS SMALLINT), 'Chofer V',                                                                 CAST(21 AS SMALLINT)),
        (CAST(81 AS SMALLINT), 'Chofer VI',                                                                CAST(21 AS SMALLINT)),
        (CAST(82 AS SMALLINT), 'Conserje I',                                                               CAST(21 AS SMALLINT)),
        (CAST(83 AS SMALLINT), 'Conserje II',                                                              CAST(21 AS SMALLINT)),
        (CAST(84 AS SMALLINT), 'Conserje III',                                                             CAST(21 AS SMALLINT)),
        (CAST(85 AS SMALLINT), 'Encargado de Servicio de Té',                                              CAST(21 AS SMALLINT))
) AS source (CodCargo, NombreC, CodU)
ON target.CodCargo = source.CodCargo
WHEN MATCHED THEN
    UPDATE SET 
        target.NombreC = source.NombreC,
        target.CodU    = source.CodU
WHEN NOT MATCHED THEN
    INSERT (CodCargo, NombreC, CodU)
    VALUES (source.CodCargo, source.NombreC, source.CodU);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN FINAL Y REPORTE
-- ─────────────────────────────────────────────────────────────────────────────
DECLARE @TotalUnidades INT, @TotalCargos INT, @TotalUbicaciones INT;
SELECT @TotalUnidades = COUNT(*) FROM dbo.TUnidad;
SELECT @TotalCargos = COUNT(*) FROM dbo.TCargo;
SELECT @TotalUbicaciones = COUNT(*) FROM dbo.ubicaciones_org;

PRINT ' ';
PRINT '✅ POBLAMIENTO INSTITUCIONAL CMS COMPLETADO CON ÉXITO:';
PRINT '   - Total Unidades en TUnidad:       ' + CAST(@TotalUnidades AS VARCHAR(10));
PRINT '   - Total Ubicaciones Org:           ' + CAST(@TotalUbicaciones AS VARCHAR(10));
PRINT '   - Total Cargos en TCargo:          ' + CAST(@TotalCargos AS VARCHAR(10));
PRINT '=============================================================================';
GO
