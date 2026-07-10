DROP INDEX `sources_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `sources_name_unique` ON `sources` (`name`,`type`,`country`);
