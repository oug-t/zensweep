// src/routes/about/+page.server.ts
export const load = async ({ locals: { supabase } }) => {
    const { count: started } = await supabase
        .from('game_results')
        .select('*', { count: 'exact', head: true });

    const { count: completed } = await supabase
        .from('game_results')
        .select('*', { count: 'exact', head: true })
        .eq('win', true);

    const { data: totalSeconds, error: rpcError } = await supabase
        .rpc('get_total_sweeping_time');

    if (rpcError) {
        console.error('RPC Error:', rpcError);
    }

    return {
        stats: {
            started: started || 0,
            completed: completed || 0,
            seconds: totalSeconds || 0 
        }
    };
};
