ALTER TABLE `facturas` ADD `cliente_nombre` text;--> statement-breakpoint
ALTER TABLE `facturas` ADD `cliente_tipo_doc` text;--> statement-breakpoint
ALTER TABLE `facturas` ADD `cliente_nro_doc` text;--> statement-breakpoint
ALTER TABLE `facturas` ADD `cliente_domicilio` text;--> statement-breakpoint
ALTER TABLE `facturas` ADD `vendedor_nombre` text;--> statement-breakpoint
UPDATE `facturas` SET
  `cliente_nombre` = (SELECT `nombre` FROM `clientes` WHERE `clientes`.`id` = `facturas`.`cliente_id`),
  `cliente_tipo_doc` = (SELECT `tipo_doc` FROM `clientes` WHERE `clientes`.`id` = `facturas`.`cliente_id`),
  `cliente_nro_doc` = (SELECT `nro_doc` FROM `clientes` WHERE `clientes`.`id` = `facturas`.`cliente_id`),
  `cliente_domicilio` = (SELECT `domicilio` FROM `clientes` WHERE `clientes`.`id` = `facturas`.`cliente_id`),
  `vendedor_nombre` = (SELECT `nombre` FROM `usuarios` WHERE `usuarios`.`id` = `facturas`.`usuario_id`);
