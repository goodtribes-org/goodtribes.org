import { NavMenu } from "goodtribes-frontend";

const NAV_LABELS: Record<string, string> = {
  create: "Skapa",
  createNewProject: "Nytt projekt",
  createNewIdea: "Ny idé",
  createNewOrg: "Ny organisation",
  discover: "Utforska",
  discoverProjects: "Projekt",
  discoverIdeas: "Idéer",
  discoverOrgs: "Organisationer",
  discoverSkills: "Kompetenser",
  discoverMentors: "Mentorer",
  myAccount: "Mitt konto",
  signIn: "Logga in",
  logOut: "Logga ut",
  toggleMenu: "Öppna/stäng meny",
};

const ACCOUNT_LABELS: Record<string, string> = {
  profile: "Profil",
  workplace: "Arbetsrum",
  dashboard: "Dashboard",
  settings: "Inställningar",
  admin: "Admin",
};

const t = (key: string) => NAV_LABELS[key] ?? key;
const tAccount = (key: string) => ACCOUNT_LABELS[key] ?? key;
const onNavigate = () => {};

export function LoggedOut() {
  return <NavMenu session={null} onSignOut={() => {}} onNavigate={onNavigate} t={t} tAccount={tAccount} />;
}

export function LoggedIn() {
  return (
    <NavMenu
      session={{ user: { name: "Elin Karlsson" } }}
      onSignOut={() => {}}
      onNavigate={onNavigate}
      t={t}
      tAccount={tAccount}
    />
  );
}
