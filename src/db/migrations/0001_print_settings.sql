ALTER TABLE `settings` ADD `paper_width` integer DEFAULT 80 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `printer_name` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `printer_address` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `printer_cut` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `receipt_footer` text DEFAULT 'Thank you for your business' NOT NULL;