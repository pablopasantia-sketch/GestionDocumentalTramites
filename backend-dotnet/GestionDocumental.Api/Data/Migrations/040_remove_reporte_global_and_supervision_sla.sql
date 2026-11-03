-- Migración 040: Retiro de Reporte Global y Supervisión SLA (Sprint 4 / Sprint 5)
-- =========================================================================================
-- Las pestañas "Supervisión SLA y Tiempos", "Métricas y Trazabilidad Municipal" y
-- "Reporte Global" fueron retiradas del Hub de Trámites por decisión funcional.
--
-- Esta migración elimina los objetos de base de datos que quedaron sin uso:
--   * dbo.usp_Reportes_Global                  (migración 037)
--   * dbo.usp_Supervision_ObtenerMetricasSLA   (migración 035)
--   * idx_tramites_fecha_conclusion            (índice creado en la migración 037,
--                                               utilizado únicamente por el reporte global)
--
-- Las migraciones 035 y 037 se conservan intactas como historial.
-- =========================================================================================

DROP PROCEDURE IF EXISTS dbo.usp_Reportes_Global;
GO

DROP PROCEDURE IF EXISTS dbo.usp_Supervision_ObtenerMetricasSLA;
GO

DROP INDEX IF EXISTS idx_tramites_fecha_conclusion ON dbo.tramites;
GO
