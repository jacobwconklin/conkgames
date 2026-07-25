export interface Game {
  slug: string;
  title: string;
  description: string;
  players: string;
  multiplayerType?: 'online' | 'local';
  platforms: string[];
  thumbnail: string;
  url: string;
  featured?: boolean;
  imageFit?: 'cover' | 'contain';
}

export const games: Game[] = [
  {
    slug: 'typefight',
    title: 'TypeFight',
    description: 'Cooperative and competitive typing games.',
    players: '1-8',
    multiplayerType: 'online',
    platforms: ['Keyboard', 'Browser'],
    thumbnail: '/thumbs/typefight.png',
    url: 'https://typefight.conkgames.com/',
    featured: true,
  },
  {
    slug: 'technoholdem',
    title: 'Techno Hold\'em',
    description: 'Form poker hands with falling cards.',
    players: '1',
    platforms: ['iOS'],
    thumbnail: '/thumbs/technoholdem.png',
    url: 'https://lostsinner117.itch.io/technoholdem',
    imageFit: 'contain',
  },
  {
    slug: 'phonepass',
    title: 'PhonePass',
    description: 'Hot Potato Word Guessing Game',
    players: '4-Infinity',
    multiplayerType: 'local',
    platforms: ['Phone', 'Browser'],
    thumbnail: '/thumbs/phonepass.png',
    url: 'https://conkgames.com/phonepass',
    imageFit: 'contain',
  },
  {
    slug: 'headsup',
    title: 'Heads Up',
    description: 'Weeble wobbles meet Gang Beasts',
    players: '2-8',
    multiplayerType: 'local',
    platforms: ['Windows', 'Controllers'],
    thumbnail: '/thumbs/headsup.png',
    url: 'https://lostsinner117.itch.io/heads-up',
  },
  {
    slug: 'peak',
    title: 'Peak',
    description: 'Race and sabotage your friends',
    players: '2-4',
    multiplayerType: 'local',
    platforms: ['Windows', 'Controllers'],
    thumbnail: '/thumbs/peak.png',
    url: 'https://lostsinner117.itch.io/peak',
  },
];
