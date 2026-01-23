import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mtelmxyozxapwuchenjo.supabase.co';
const supabaseAnonKey =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10ZWxteHlvenhhcHd1Y2hlbmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MDk1ODcsImV4cCI6MjA4MzA4NTU4N30.prcQ7cnpBXYICfIFMaGdcCRfA91VqBhPN-Dxn2EVr2Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
