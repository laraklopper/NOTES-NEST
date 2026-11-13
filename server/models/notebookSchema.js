//notebookSchema.js
const mongoose = require('mongoose');
const {hexColourRegex} =require('../util/schemaUtil')

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
        default: '#1F4E79', 
        match: [hexColourRegex, 'Colour must be a hex code, e.g. #1F4E79']
    }
},{
    timestamps: true
});

notebookSchema.index({ user: 1, name: 1 }, { unique: true }); // no duplicate notebook names per user → 409
 
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