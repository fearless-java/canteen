ALTER TABLE "messages" ADD COLUMN "actor_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "actor_name" varchar(100);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "actor_avatar" varchar(500);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "link_type" varchar(50);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "link_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
