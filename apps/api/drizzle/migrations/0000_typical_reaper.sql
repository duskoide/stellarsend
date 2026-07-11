CREATE TABLE `beneficiaries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`full_name` text NOT NULL,
	`method` text NOT NULL,
	`bank_name` text,
	`account_number` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`source_asset` text NOT NULL,
	`source_amount` text NOT NULL,
	`dest_asset` text NOT NULL,
	`dest_amount` text NOT NULL,
	`exchange_rate` text NOT NULL,
	`fee_amount` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transfer_events` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_id` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`metadata` blob,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`receiver_id` text,
	`beneficiary_id` text,
	`source_asset` text NOT NULL,
	`source_amount` text NOT NULL,
	`dest_asset` text NOT NULL,
	`dest_amount` text NOT NULL,
	`exchange_rate` text NOT NULL,
	`fee_amount` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`stellar_tx_hash` text,
	`path_payment_json` blob,
	`sending_anchor_ref` text,
	`receiving_anchor_ref` text,
	`payout_method` text,
	`quote_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transfers_stellar_tx_hash_unique` ON `transfers` (`stellar_tx_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`full_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`country` text NOT NULL,
	`stellar_pub_key` text,
	`kyc_status` text DEFAULT 'none' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_idx` ON `users` (`email`);