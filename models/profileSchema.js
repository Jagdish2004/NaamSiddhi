const mongoose = require('mongoose');
const AutoIncrementFactory = require('mongoose-sequence');
const autoIncrement = AutoIncrementFactory(mongoose);

const profileSchema = new mongoose.Schema({
  soundexCode: {
    firstName: String,
    lastName: String,
  },
  firstNameHindi: String,
  firstNameEnglish: String,
  lastNameHindi: String,
  lastNameEnglish: String,
  occupationHindi: String,
  occupationEnglish: String,
  dob: Date,
  gender: String,
  role: String,
  mNumber: String,
  address: {
    locationHindi: String,
    locationEnglish: String,
    cityHindi: String,
    cityEnglish: String,
    districtHindi: String,
    districtEnglish: String,
    stateHindi: String,
    stateEnglish: String
  },
  descriptionHindi: String,
  descriptionEnglish: String,
  id: { type: Number, unique: true },  // The id field with unique index
  status: {
    type: String,
    enum: ['active', 'closed', 'pending'],
    default: 'active'
  },
  familyDetails: [{
    name: {
      english: String,
      hindi: String
    },
    relation: {
      english: String,
      hindi: String
    },
    contact: String
  }],
  caseDetails: [{
    caseNumber: String,
    section: String,
    role: {
        type: String,
        enum: ['criminal', 'victim', 'witness'],
        required: true
    },
    details: {
        english: String,
        hindi: String
    }
  }],
  appearance: {
    height: Number,
    weight: Number,
    complexion: {
      type: String,
      enum: ['fair', 'medium', 'dark']
    },
    build: {
      type: String,
      enum: ['slim', 'average', 'athletic', 'heavy']
    },
    facialFeatures: {
      english: String,
      hindi: String
    },
    scars: {
      english: String,
      hindi: String
    },
    tattoos: {
      english: String,
      hindi: String
    },
    otherFeatures: {
      english: String,
      hindi: String
    }
  }
}, {
  timestamps: true  // This adds createdAt and updatedAt fields automatically
});

// Apply the auto-increment plugin to the `id` field
profileSchema.plugin(autoIncrement, { inc_field: 'id' });

module.exports = mongoose.model('Profile', profileSchema);
