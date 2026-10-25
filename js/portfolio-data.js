// One ordered list drives every menu, tab, map marker and 3D platform, so the
// numbering is always 01–06 in the same order everywhere. `preview` is shown on
// the card that appears as the car drives up to a platform.
export const portfolioSections = [
  { id: 'projects',   number: '01', label: 'Work',       mapLabel: 'WORK',       summary: 'Case studies · Four-Part Harmony & AirSculpt', preview: 'Inside: two case studies, how my design grew, four data projects', file: 'sections/projects.html',   landmark: 'projects',   color: '#ee6aa7' },
  { id: 'skills',     number: '02', label: 'Skills',     mapLabel: 'SKILLS',     summary: 'What I learned in CPSC 581 & where I used it', preview: 'Inside: what I learned, methods per project, technical skills', file: 'sections/skills.html',     landmark: 'skills',     color: '#4fc9bd' },
  { id: 'philosophy', number: '03', label: 'Philosophy', mapLabel: 'PHILOSOPHY', summary: 'My design values, approach & tools',           preview: 'Inside: four values, a five-step approach, tools I keep and drop', file: 'sections/philosophy.html', landmark: 'philosophy', color: '#7fa8ff' },
  { id: 'experience', number: '04', label: 'Experience', mapLabel: 'EXPERIENCE', summary: 'Event work & what it taught me about people',  preview: 'Inside: three event roles and what they taught me', file: 'sections/experience.html', landmark: 'people',     color: '#f08a5d' },
  { id: 'education',  number: '05', label: 'About',      mapLabel: 'ABOUT',      summary: 'Education & portfolio log',                   preview: 'Inside: University of Calgary, GPA, coursework, portfolio log', file: 'sections/education.html',  landmark: 'education',  color: '#e8c35a' },
  { id: 'contact',    number: '06', label: 'Contact',    mapLabel: 'CONTACT',    summary: 'Email & resume',                                preview: 'Inside: email and a resume download', file: 'sections/contact.html',    landmark: 'contact',    color: '#a58cf0' },
];

export const sectionById = Object.fromEntries(
  portfolioSections.map((section) => [section.id, section]),
);
