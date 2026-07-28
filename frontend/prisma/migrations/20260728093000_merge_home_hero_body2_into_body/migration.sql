-- body/body2 were always two halves of the same prose (first paragraph +
-- optional second paragraph), only split because the fields used to be
-- plain textareas. Now that body is a rich-text field, a second paragraph
-- can live inside it directly — fold body2 in as a second <p> and drop the
-- column. Rows without a body2 are untouched (still plain text, rendered
-- as before by HeroPhotoStack's legacy-content fallback).
UPDATE "HomeHeroSlide"
SET "body" = '<p>' || "body" || '</p><p>' || "body2" || '</p>'
WHERE "body2" IS NOT NULL;

ALTER TABLE "HomeHeroSlide" DROP COLUMN "body2";
