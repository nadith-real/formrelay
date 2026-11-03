CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`endpoint_slug` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`allowed_origins` text DEFAULT '[]' NOT NULL,
	`redirect_url` text,
	`success_message` text,
	`validation_config` text DEFAULT '{}' NOT NULL,
	`honeypot_field` text DEFAULT '_gotcha',
	`spam_protection` integer DEFAULT true NOT NULL,
	`rate_limit_per_minute` integer DEFAULT 30 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_endpoint_slug_unique` ON `forms` (`endpoint_slug`);--> statement-breakpoint
CREATE INDEX `forms_project_id_idx` ON `forms` (`project_id`);--> statement-breakpoint
CREATE TABLE `notification_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`submission_id` text,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notification_logs_submission_id_idx` ON `notification_logs` (`submission_id`);--> statement-breakpoint
CREATE INDEX `notification_logs_project_id_idx` ON `notification_logs` (`project_id`);--> statement-breakpoint
CREATE TABLE `project_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`provider` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`encrypted_credentials` text,
	`settings` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_integrations_project_provider_unique` ON `project_integrations` (`project_id`,`provider`);--> statement-breakpoint
CREATE TABLE `project_settings` (
	`project_id` text PRIMARY KEY NOT NULL,
	`retention_days` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`website_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`session_token_hash`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'unread' NOT NULL,
	`device_type` text,
	`browser` text,
	`country` text,
	`region` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `submissions_form_id_idx` ON `submissions` (`form_id`);--> statement-breakpoint
CREATE INDEX `submissions_created_at_idx` ON `submissions` (`created_at`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);