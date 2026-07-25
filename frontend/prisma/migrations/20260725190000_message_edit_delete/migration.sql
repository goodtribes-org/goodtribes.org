-- Let message authors edit or soft-delete their own chat messages.
-- deletedAt is a distinct tombstone from hiddenAt (moderator action) so the
-- two flows never fight over the same column; threadParent uses onDelete:
-- NoAction, so a hard delete would fail once a message has replies.
ALTER TABLE "Message" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3);
