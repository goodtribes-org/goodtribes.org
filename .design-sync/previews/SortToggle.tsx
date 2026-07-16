import { SortToggle } from "goodtribes-frontend";

const onNavigate = () => {};

export function Default() {
  return <SortToggle sort="new" onNavigate={onNavigate} />;
}

export function Top() {
  return <SortToggle sort="top" onNavigate={onNavigate} />;
}

export function Trending() {
  return <SortToggle sort="trending" onNavigate={onNavigate} />;
}
