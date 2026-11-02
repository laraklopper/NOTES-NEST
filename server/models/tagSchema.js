//tagSchema.js
const mongoose = require('mongoose');
 
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
      maxlength: [30, 'Tag name cannot exceed 30 characters']
    }
  },
  { timestamps: true } // createdAt / updatedAt
);
 
tagSchema.index({ user: 1, name: 1 }, { unique: true }); // one tag name per user → 409 on duplicates
 
tagSchema.post('findOneAndDelete', async function (tag) { // remove the tag from every note that used it
  if (!tag) return; // nothing was deleted
  await mongoose.model('Note').updateMany(
    { user: tag.user, tags: tag._id },
    { $pull: { tags: tag._id } }
  );
});
 
tagSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.__v; return ret; } // hide version key
});
 
module.exports = mongoose.model('Tag', tagSchema);
 