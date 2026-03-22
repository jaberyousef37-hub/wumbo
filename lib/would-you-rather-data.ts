export type WyrCategory = 'Fun' | 'Extreme' | 'Food' | 'Superpowers' | 'Life';

export type WyrQuestion = {
  id: string;
  category: WyrCategory;
  a: string;
  b: string;
};

export const WYR_QUESTIONS: WyrQuestion[] = [
  { id: 'f1', category: 'Fun', a: 'Always talk in rhymes', b: 'Always sing your sentences' },
  { id: 'f2', category: 'Fun', a: 'Have a rewind button for life', b: 'Have a pause button for life' },
  { id: 'f3', category: 'Fun', a: 'Fight 100 duck-sized horses', b: 'Fight one horse-sized duck' },
  { id: 'f4', category: 'Fun', a: 'Only watch comedies forever', b: 'Only watch documentaries forever' },
  { id: 'f5', category: 'Fun', a: 'Be best friends with a ghost', b: 'Be best friends with a talking cat' },
  { id: 'f6', category: 'Fun', a: 'Time travel only to the past', b: 'Time travel only to the future' },
  { id: 'f7', category: 'Fun', a: 'Have perfect karaoke voice', b: 'Have perfect dance moves' },
  { id: 'f8', category: 'Fun', a: 'Live in a treehouse mansion', b: 'Live in an underwater apartment' },
  { id: 'f9', category: 'Fun', a: 'Speak every language fluently', b: 'Play every instrument perfectly' },
  { id: 'f10', category: 'Fun', a: 'Haunted house for a weekend', b: 'Camping in a thunderstorm' },
  { id: 'f11', category: 'Fun', a: 'Never use social media again', b: 'Never watch TV or streams again' },
  { id: 'f12', category: 'Fun', a: 'Win the lottery once', b: 'Always find $20 on the ground' },

  { id: 'e1', category: 'Extreme', a: 'Skydive from 15,000 feet', b: 'Scuba dive with sharks' },
  { id: 'e2', category: 'Extreme', a: 'Run a marathon in the desert', b: 'Climb a frozen waterfall' },
  { id: 'e3', category: 'Extreme', a: 'Spend a week alone in the wild', b: 'Spend a week in a busy megacity with no map' },
  { id: 'e4', category: 'Extreme', a: 'Try the spiciest pepper on Earth', b: 'Eat only unfamiliar street food for a month' },
  { id: 'e5', category: 'Extreme', a: 'Go on a zero‑gravity flight', b: 'Ride the world’s tallest roller coaster' },
  { id: 'e6', category: 'Extreme', a: 'Sleep on a cliff ledge in a portaledge', b: 'Sleep in an ice hotel at −5°C' },
  { id: 'e7', category: 'Extreme', a: 'White‑water raft Class V rapids', b: 'Surf 12‑foot waves' },
  { id: 'e8', category: 'Extreme', a: 'Race a supercar on a track', b: 'Pilot a stunt plane (with instructor)' },
  { id: 'e9', category: 'Extreme', a: 'Hike 20 miles with 40 lb pack', b: 'Bike 60 miles in one day' },
  { id: 'e10', category: 'Extreme', a: 'Bungee jump off a bridge', b: 'Swing into a canyon on a giant swing' },

  { id: 'fo1', category: 'Food', a: 'Give up pizza forever', b: 'Give up burgers forever' },
  { id: 'fo2', category: 'Food', a: 'Only eat sweet breakfast', b: 'Only eat savory breakfast' },
  { id: 'fo3', category: 'Food', a: 'Tacos every Tuesday forever', b: 'Sushi every Friday forever' },
  { id: 'fo4', category: 'Food', a: 'Never taste chocolate again', b: 'Never taste cheese again' },
  { id: 'fo5', category: 'Food', a: 'Cook every meal from scratch', b: 'Eat only restaurant food' },
  { id: 'fo6', category: 'Food', a: 'Hot coffee only', b: 'Iced coffee only' },
  { id: 'fo7', category: 'Food', a: 'Spicy food max level always', b: 'Mild food only forever' },
  { id: 'fo8', category: 'Food', a: 'Pasta for every dinner', b: 'Rice for every dinner' },
  { id: 'fo9', category: 'Food', a: 'Brunch culture forever', b: 'Midnight snacks culture forever' },
  { id: 'fo10', category: 'Food', a: 'Perfect homemade bread daily', b: 'Perfect pastries daily' },
  { id: 'fo11', category: 'Food', a: 'Only drink water and tea', b: 'Only drink juice and soda' },

  { id: 's1', category: 'Superpowers', a: 'Fly anywhere, anytime', b: 'Turn invisible on command' },
  { id: 's2', category: 'Superpowers', a: 'Read minds', b: 'See 10 seconds into the future' },
  { id: 's3', category: 'Superpowers', a: 'Teleport but only 1 mile max', b: 'Run at 200 mph' },
  { id: 's4', category: 'Superpowers', a: 'Control fire', b: 'Control water' },
  { id: 's5', category: 'Superpowers', a: 'Healing factor (minor injuries fast)', b: 'Never need sleep' },
  { id: 's6', category: 'Superpowers', a: 'Talk to animals', b: 'Understand every human language' },
  { id: 's7', category: 'Superpowers', a: 'Super strength', b: 'Super intelligence' },
  { id: 's8', category: 'Superpowers', a: 'Time loop one hour once a week', b: 'Slow time to 10% for 30s daily' },
  { id: 's9', category: 'Superpowers', a: 'Force fields around you', b: 'Laser vision you can dim' },
  { id: 's10', category: 'Superpowers', a: 'Clone yourself for chores only', b: 'Summon tools out of thin air' },
  { id: 's11', category: 'Superpowers', a: 'Breath underwater', b: 'Survive in space without a suit' },
  { id: 's12', category: 'Superpowers', a: 'Perfect memory forever', b: 'Perfect pitch and rhythm forever' },

  { id: 'l1', category: 'Life', a: 'Know how you die (not when)', b: 'Know when you die (not how)' },
  { id: 'l2', category: 'Life', a: 'Fame without fortune', b: 'Fortune without fame' },
  { id: 'l3', category: 'Life', a: 'Work your dream job for half pay', b: 'Boring job for double pay' },
  { id: 'l4', category: 'Life', a: 'Live 200 years in the past', b: 'Live 200 years in the future' },
  { id: 'l5', category: 'Life', a: 'Best friend moves across the world', b: 'Sibling moves in with you' },
  { id: 'l6', category: 'Life', a: 'Never feel anger again', b: 'Never feel jealousy again' },
  { id: 'l7', category: 'Life', a: 'Always tell the truth', b: 'Always keep every promise' },
  { id: 'l8', category: 'Life', a: 'Reset career at 30 with skills intact', b: 'Keep career but forget college memories' },
  { id: 'l9', category: 'Life', a: 'Tiny cozy apartment in NYC', b: 'Huge house in a quiet small town' },
  { id: 'l10', category: 'Life', a: 'Win a Nobel Prize', b: 'Win an Olympic gold medal' },
  { id: 'l11', category: 'Life', a: 'Perfect work‑life balance', b: 'Maximum wealth with busy schedule' },
  { id: 'l12', category: 'Life', a: 'Relive your best day once', b: 'Erase your worst day from memory' },
];
