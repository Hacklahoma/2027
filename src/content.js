// All copy and links for the landing page live here.
// Anything in [BRACKETS] is a placeholder that still needs a real value.

export const event = {
  name: 'Hacklahoma',
  kicker: 'The University of Oklahoma’s student hackathon',
  dates: 'February 6–7, 2027',
  place: 'Norman, Oklahoma',
  tagline: 'Oklahoma’s largest hackathon',
  venue: '[VENUE]',
  apply: { label: 'Register', href: 'https://register.hacklahoma.org/' },
  contact: 'hacklahoma@ou.edu',
};

// The big lanterns that float beside the stream of light.
export const chapters = [
  {
    numeral: 'I',
    label: 'The light',
    title: 'What is Hacklahoma?',
    body: 'Oklahoma’s largest hackathon. Twenty-four hours to build something that doesn’t exist yet, with free food, merch, mentors and people you met that morning.',
  },
  {
    numeral: 'II',
    label: 'Everyone carries one',
    title: 'Who is it for?',
    body: 'Any student over 18, any major, any background. Coders, artists, writers. Never built anything? Workshops and mentors run all night.',
  },
  {
    numeral: 'III',
    label: 'The night',
    title: 'What you’ll find',
    body: 'Sponsor challenges, workshops, food at 3 a.m., prizes, and people you’ll keep building with long after the lanterns go out.',
  },
  {
    numeral: 'IV',
    label: 'When & where',
    title: 'February 6–7, 2027',
    body: '[VENUE] at the University of Oklahoma, Norman. Bring a laptop and an idea, or just bring yourself.',
    cta: true,
  },
];

export const faqs = [
  {
    q: 'What’s a hack, anyway?',
    a: 'Something rigged together inelegantly but effectively. Like duct-taping a hole in a sinking boat to keep it afloat.',
  },
  {
    q: 'What is a hackathon?',
    a: 'A weekend sprint where you team up, learn something new and build a project from scratch. At the end you demo it to judges, and maybe walk away with a prize.',
  },
  {
    q: 'Who can participate?',
    a: 'Any student over the age of 18, regardless of major, background or skill level.',
  },
  {
    q: 'How much does it cost?',
    a: 'Nothing. Admission is free for all students, and so are lunch, dinner, breakfast and the snacks in between.',
  },
  {
    q: 'Do I need a team?',
    a: 'Teams can have up to 4 people. Come solo and find yours at the team-building session when hacking starts.',
  },
  {
    q: 'I’ve never coded. Can I still come?',
    a: 'Yes. Beginner workshops and mentors run all weekend, and plenty of first-timers ship something they’re proud of.',
  },
  {
    q: 'What should I bring?',
    a: 'A laptop, chargers, toiletries, a change of clothes, a sleeping bag and pillow. It runs 24 hours.',
  },
  {
    q: 'Can I work on an old project?',
    a: 'No. Brainstorm and gather tools beforehand, but the project itself has to be new.',
  },
  {
    q: 'Is travel covered?',
    a: 'Not at this time. [CONFIRM FOR 2027]',
  },
];

// tier: 'title' | 'gold' | 'silver'. Add `logo: '/sponsors/x.svg'` once logos exist.
export const sponsors = [
  { name: '[TITLE SPONSOR]', tier: 'title' },
  { name: '[GOLD SPONSOR]', tier: 'gold' },
  { name: '[GOLD SPONSOR]', tier: 'gold' },
  { name: '[SILVER SPONSOR]', tier: 'silver' },
  { name: '[SILVER SPONSOR]', tier: 'silver' },
  { name: '[SILVER SPONSOR]', tier: 'silver' },
  { name: '[COMMUNITY]', tier: 'silver' },
];

export const sponsorCta = { label: 'Light a lantern with us', href: 'mailto:hacklahoma@ou.edu' };

export const pastYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((year) => ({
  year,
  href: `https://${year}.hacklahoma.org`,
}));

export const team = { label: 'Meet the exec team', href: '[EXEC PAGE URL]' };

export const socials = [
  { label: 'Instagram', href: '[INSTAGRAM URL]' },
  { label: 'LinkedIn', href: '[LINKEDIN URL]' },
  { label: 'Discord', href: '[DISCORD URL]' },
  { label: 'MLH Code of Conduct', href: 'https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md' },
];
