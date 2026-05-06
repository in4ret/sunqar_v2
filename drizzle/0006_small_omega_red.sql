CREATE TABLE `__new_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`period` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`blocks` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint

INSERT INTO `__new_reports` (
	`id`,
	`title`,
	`description`,
	`period`,
	`active`,
	`blocks`,
	`created_by`,
	`created_at`,
	`updated_by`,
	`updated_at`
)
SELECT
	`id`,
	`title`,
	`description`,
	`period`,
	`active`,
	`blocks`,
	`created_by`,
	`created_at`,
	`created_by`,
	`created_at`
FROM `reports`;
--> statement-breakpoint

DROP TABLE `reports`;
--> statement-breakpoint
ALTER TABLE `__new_reports` RENAME TO `reports`;
