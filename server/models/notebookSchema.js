//notebookSchema.js
const mongoose = require('mongoose');
const { hexColourRegex, DEFAULT_NOTEBOOK_COLOUR, NAME_COLLATION } = require('../util/schemaUtil');

const notebookSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Notebook name is required'],
        trim: true,
        maxlength: [80, 'Notebook name cannot exceed 80 characters'],
    },
    colour:{
        type: String,
        default: DEFAULT_NOTEBOOK_COLOUR,
        match: [hexColourRegex, 'Colour must be a hex code, e.g. #1F4E79']
    }
},{
    timestamps: true
});

/* No duplicate notebook names per user, ignoring case ("Work" = "work") → 409.
The collation also lets GET /notebooks sort A–Z case-insensitively using this index.
Named so it doesn't clash with the old case-sensitive user_1_name_1 index, which can be dropped */
notebookSchema.index({ user: 1, name: 1 }, { unique: true, collation: NAME_COLLATION, name: 'user_1_name_1_ci' });

notebookSchema.post('findOneAndDelete', async function (notebook) { // keep notes when a notebook is deleted
  if (!notebook) return; // nothing was deleted
  await mongoose.model('Note').updateMany(
    { notebook: notebook._id },
    { $set: { notebook: null } }, // move notes to "No notebook"
    { timestamps: false } // moving a note isn't an edit, so keep its updatedAt (and list order)
  );
});

notebookSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.__v; return ret; } // hide version key
});

module.exports = mongoose.model('Notebook', notebookSchema);
