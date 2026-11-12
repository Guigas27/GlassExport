-- GlassExport - banco de dados inicial
-- Compatível com a implementação atual de src/Store.js.
-- Execute este arquivo no MySQL Workbench ou pelo cliente MySQL.

CREATE DATABASE IF NOT EXISTS glass_export
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE glass_export;

CREATE TABLE IF NOT EXISTS app_data (
  entity VARCHAR(40) NOT NULL,
  id VARCHAR(80) NOT NULL,
  payload LONGTEXT NOT NULL,
  PRIMARY KEY (entity, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Os registros são gravados como JSON na coluna payload.
-- Entidades atualmente utilizadas:
-- products, clients, orders, currencies, countries
