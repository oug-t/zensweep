import { supabase } from '$lib/supabase';

export const load = async () => {
    // Force a fresh fetch by selecting the sum directly from the table
    // instead of relying solely on the RPC function
    const { data: rawSum } = await supabase
        .from('game_results')
        .select('time');

    const totalSeconds = rawSum?.reduce((acc, curr) => acc + (curr.time || 0), 0) || 0;

    const { count: started } = await supabase.from('game_results').select('*', { count: 'exact', head: true });
    const { count: completed } = await supabase.from('game_results').select('*', { count: 'exact', head: true }).eq('win', true);

    return {
        stats: {
            started: started || 0,
            completed: completed || 0,
            seconds: totalSeconds // This will now reflect the 31821 seconds (8.8 hrs)
        }
    };
};
