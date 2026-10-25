export const portfolioSections = [
  { id: 'experience', number: '02', label: 'Experience', mapLabel: 'EXPERIENCE', file: 'sections/experience.html', landmark: 'people',    color: '#f08a5d' },
  { id: 'projects',   number: '01', label: 'Projects',   mapLabel: 'PROJECTS',   file: 'sections/projects.html',   landmark: 'projects',  color: '#ee6aa7' },
  { id: 'skills',     number: '03', label: 'Skills',     mapLabel: 'SKILLS',     file: 'sections/skills.html',     landmark: 'skills',    color: '#4fc9bd' },
  { id: 'education',  number: '04', label: 'Education',  mapLabel: 'EDUCATION',  file: 'sections/education.html',  landmark: 'education', color: '#e8c35a' },
  { id: 'contact',    number: '05', label: 'Contact',    mapLabel: 'CONTACT',    file: 'sections/contact.html',    landmark: 'contact',   color: '#a58cf0' },
];

export const sectionById = Object.fromEntries(
  portfolioSections.map((section) => [section.id, section]),
);
