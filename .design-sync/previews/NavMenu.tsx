import { NavMenu } from "goodtribes-frontend";

export function LoggedOut() {
  return <NavMenu session={null} onSignOut={() => {}} />;
}

export function LoggedIn() {
  return <NavMenu session={{ user: { name: "Elin Karlsson" } }} onSignOut={() => {}} />;
}
