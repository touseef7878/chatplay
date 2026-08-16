CREATE TABLE `developerAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorOpenId` varchar(128) NOT NULL,
	`targetOpenId` varchar(128) NOT NULL,
	`targetUsername` varchar(32),
	`targetSupabaseAuthId` varchar(64),
	`action` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `developerAuditLog_id` PRIMARY KEY(`id`)
);
