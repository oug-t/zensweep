import { supabase } from '$lib/supabase';

export const load = async () => {
	const { data: rawSum } = await supabase.from('game_results').select('time');

	const totalSeconds = rawSum?.reduce((acc, curr) => acc + (curr.time || 0), 0) || 0;

	const { count: started } = await supabase
		.from('game_results')
		.select('*', { count: 'exact', head: true });
	const { count: completed } = await supabase
		.from('game_results')
		.select('*', { count: 'exact', head: true })
		.eq('win', true);

	return {
		stats: {
			started: started || 0,
			completed: completed || 0,
			seconds: totalSeconds
		}
	};
};
