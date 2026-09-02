ALTER TABLE `checks` ADD `provider` varchar(32);--> statement-breakpoint
ALTER TABLE `checks` ADD `providerState` varchar(24);--> statement-breakpoint
ALTER TABLE `documents` ADD `providerHealth` json;--> statement-breakpoint
ALTER TABLE `documents` ADD `extractedFields` json;--> statement-breakpoint
ALTER TABLE `documents` ADD `comparisonFindings` json;