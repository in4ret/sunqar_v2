CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`channel` text NOT NULL,
	`content_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_source_channel_content_id_unique` ON `posts` (`source`,`channel`,`content_id`);