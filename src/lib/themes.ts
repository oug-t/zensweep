export interface Theme {
	name: string;
	label: string;
	colors: {
		bg: string;
		main: string;
		sub: string;
		text: string;
		error: string;
	};
}

export const THEMES: Theme[] = [
	{
		name: 'z_modern',
		label: 'Z Modern',
		colors: {
			bg: '25 25 25',
			main: '216 180 254',
			sub: '161 161 170',
			text: '228 228 231',
			error: '239 68 68'
		}
	},
	{
		name: 'carbon',
		label: 'Carbon',
		colors: {
			bg: '49 49 49',
			main: '246 109 0',
			sub: '170 170 170',
			text: '245 229 200',
			error: '235 69 95'
		}
	},
	{
		name: 'serika_dark',
		label: 'Serika Dark',
		colors: {
			bg: '50 52 55',
			main: '226 183 20',
			sub: '160 162 165',
			text: '209 208 197',
			error: '202 71 84'
		}
	},
	{
		name: 'miami',
		label: 'Miami',
		colors: {
			bg: '24 24 24',
			main: '228 96 155',
			sub: '71 184 255',
			text: '240 240 240',
			error: '255 87 87'
		}
	},
	{
		name: 'dracula',
		label: 'Dracula',
		colors: {
			bg: '40 42 54',
			main: '189 147 249',
			sub: '139 233 253',
			text: '248 248 242',
			error: '255 85 85'
		}
	},
	{
		name: 'nord',
		label: 'Nord',
		colors: {
			bg: '46 52 64',
			main: '136 192 208',
			sub: '216 222 233',
			text: '236 239 244',
			error: '191 97 106'
		}
	},
	{
		name: 'gruvbox_dark',
		label: 'Gruvbox Dark',
		colors: {
			bg: '40 40 40',
			main: '215 153 33',
			sub: '235 219 178',
			text: '251 241 199',
			error: '204 36 29'
		}
	},
	{
		name: 'one_dark',
		label: 'One Dark',
		colors: {
			bg: '40 44 52',
			main: '97 175 239',
			sub: '171 178 191',
			text: '220 223 228',
			error: '224 108 117'
		}
	},
	{
		name: 'tokyo_night',
		label: 'Tokyo Night',
		colors: {
			bg: '26 27 38',
			main: '122 162 247',
			sub: '169 177 214',
			text: '192 202 245',
			error: '247 118 142'
		}
	}
];
