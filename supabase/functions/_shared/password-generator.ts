const ADJECTIVES = [
  'fire', 'swift', 'bold', 'silver', 'golden', 'steady', 'bright', 'quiet',
  'steel', 'rapid', 'iron', 'blue', 'crimson', 'northern', 'brave', 'clever',
  'quick', 'sharp', 'calm', 'solid', 'vivid', 'noble', 'keen', 'sturdy',
];

const NOUNS = [
  'eagle', 'hawk', 'falcon', 'condor', 'osprey', 'kestrel', 'harrier',
  'phoenix', 'talon', 'summit', 'ridge', 'canyon', 'river', 'beacon',
  'anchor', 'compass', 'rocket', 'cedar', 'maple', 'quartz',
];

/** Generates a phone-friendly password like "fire-eagle-47". */
export function generatePhoneFriendlyPassword(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 90) + 10;
  return `${adjective}-${noun}-${number}`;
}
