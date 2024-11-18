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
  id: { type: Number, unique: true }  // The id field with unique index
});

// Apply the auto-increment plugin to the `id` field
profileSchema.plugin(autoIncrement, { inc_field: 'id' });

module.exports = mongoose.model('Profile', profileSchema);
