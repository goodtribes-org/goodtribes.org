import { CountryMap } from "goodtribes-frontend";

const PROJECT_COUNTS = {
  Sweden: 42,
  Norway: 8,
  Germany: 15,
  Kenya: 6,
  "United States of America": 21,
  Brazil: 4,
};

const ORG_COUNTS = {
  Sweden: 17,
  Denmark: 5,
  "United Kingdom": 9,
  India: 3,
};

export function Projects() {
  return <CountryMap counts={PROJECT_COUNTS} unitLabel="projects" />;
}

export function Organisations() {
  return <CountryMap counts={ORG_COUNTS} unitLabel="organisations" />;
}
