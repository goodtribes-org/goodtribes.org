import { ProjectFilters } from "goodtribes-frontend";

const onNavigate = () => {};

export function Default() {
  return <ProjectFilters sort="new" onNavigate={onNavigate} />;
}

export function WithFilters() {
  return (
    <ProjectFilters
      sort="top"
      status="prototype"
      category="Environment"
      sdg="13"
      onNavigate={onNavigate}
    />
  );
}

export function Searching() {
  return <ProjectFilters sort="trending" q="clean water" onNavigate={onNavigate} />;
}
