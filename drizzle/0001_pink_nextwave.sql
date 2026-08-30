CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`checkName` varchar(120) NOT NULL,
	`result` enum('pass','flag','not_applicable') NOT NULL,
	`confidence` int NOT NULL DEFAULT 0,
	`explanation` text NOT NULL,
	`flaggedRegion` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(768) NOT NULL,
	`documentType` enum('aadhaar','pan','passport','marksheet','bank_statement','other') NOT NULL DEFAULT 'other',
	`originalFilename` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('processing','verified','needs_review','likely_forged') NOT NULL DEFAULT 'processing',
	`confidenceScore` int NOT NULL DEFAULT 0,
	`referenceCode` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_referenceCode_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`reviewerId` int,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`reviewerNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
