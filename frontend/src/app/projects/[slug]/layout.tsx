import ProjectTabNav from "./ProjectTabNav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <>
      <div className="pt-6">
        <ProjectTabNav slug={slug} />
      </div>
      {children}
    </>
  );
}
