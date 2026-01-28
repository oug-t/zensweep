import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			user: User | null;
			session: Session | null;
			getSession: () => Promise<Session | null>;
		}

		interface PageData {
			session?: Session | null;
		}
	}
}

export {};
