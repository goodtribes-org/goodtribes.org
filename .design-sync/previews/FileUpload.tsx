import { FileUpload } from "goodtribes-frontend";

const AVATAR_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='#43aa8b'/><circle cx='48' cy='38' r='18' fill='white' opacity='0.9'/><rect x='18' y='62' width='60' height='34' rx='30' fill='white' opacity='0.9'/></svg>`,
  );

export function Empty() {
  return <FileUpload onUpload={() => {}} visibility="public" />;
}

export function WithExistingAvatar() {
  return <FileUpload onUpload={() => {}} visibility="private" currentImageUrl={AVATAR_DATA_URI} />;
}
