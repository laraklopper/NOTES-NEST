//tagSchema.js
const mongoose = require('mongoose');
const { MAX_TAG_LENGTH } = require('../util/schemaUtil');// Shared tag name length limit (also used by noteRoutes.js)

const tagSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true // every query is filtered by owner
    },
    name: {
      type: String,
      required: [true, 'Tag name is required'],
      trim: true,
      lowercase: true, // "React", " react " and "REACT" all become "react"
      maxlength: [MAX_TAG_LENGTH, `Tag name cannot exceed ${MAX_TAG_LENGTH} characters`]
    }
  },
  { timestamps: true } // createdAt / updatedAt
);

tagSchema.index({ user: 1, name: 1 }, { unique: true }); // one tag name per user → 409 on duplicates

// Remove the given tag ids from every note that uses them.
// timestamps: false — removing a tag isn't an edit, so the notes keep their updatedAt (and list order)
const pullTagsFromNotes = (tagIds) => mongoose.model('Note').updateMany(
  { tags: { $in: tagIds } },
  { $pull: { tags: { $in: tagIds } } },
  { timestamps: false }
);

tagSchema.post('findOneAndDelete', async function (tag) { // remove the tag from every note that used it
  if (!tag) return; // nothing was deleted
  await pullTagsFromNotes([tag._id]);
});

// Same cleanup for deleteOne / deleteMany (e.g. deleting an account or removing unused tags),
// so notes are never left holding ids of tags that no longer exist
tagSchema.pre(['deleteOne', 'deleteMany'], { document: false, query: true }, async function () {
  const tags = await this.model.find(this.getFilter()).select('_id').lean(); // the tags about to be deleted
  if (tags.length === 0) return;
  await pullTagsFromNotes(tags.map((tag) => tag._id));
});

tagSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.__v; return ret; } // hide version key
});

module.exports = mongoose.model('Tag', tagSchema);
