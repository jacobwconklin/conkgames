import type { Game } from './games';

// Set featured on the current lab to update the Labs hero.
export const labs: Game[] = [
  {
    slug: 'custom-character',
    title: 'Custom Character',
    description: 'Draw your own sprites, bring a character to life, and build a platforming challenge with custom enemies.',
    players: '1',
    platforms: ['Browser'],
    thumbnail: '/thumbs/custom-character.png',
    url: '/labs/custom-character.html',
    featured: true,
  },
];
