export interface Game {
  slug: string;
  title: string;
  description: string;
  players: string;   // e.g. "1", "2", "1-4"
  thumbnail: string;
  url: string;
  featured?: boolean;
  imageFit?: 'cover' | 'contain';  // defaults to 'cover'
}

export const games: Game[] = [
  {
    slug: 'typefight',
    title: 'TypeFight',
    description: 'Cooperative and competitive typing games.',
    players: '1-8',
    thumbnail: '/thumbs/typefight.png',
    url: 'https://typefight.conkgames.com/',
    featured: true,
  },
  {
    slug: 'technoholdem',
    title: 'Techno Hold\'em',
    description: 'Form poker hands with falling cards.',
    players: '1',
    thumbnail: '/thumbs/technoholdem.png',
    url: 'https://lostsinner117.itch.io/technoholdem',
    imageFit: 'contain',
  },
  {
    slug: 'phonepass',
    title: 'PhonePass',
    description: 'Hot Potato Word Guessing Game',
    players: '4-Infinity',
    thumbnail: '/thumbs/phonepass.png',
    url: 'https://conkgames.com/phonepass',
    imageFit: 'contain',
  },
];
