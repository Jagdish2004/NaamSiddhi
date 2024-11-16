const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  soundexCode: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },

  
  occupation: { type: String }, 
  dob: { type: Date, required: true }, 
  gender: { 
    type: String, 
    enum: ['Male', 'Female'], 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['Criminal', 'Victim', 'Witness'], 
    required: true 
  },

 
  mNumber: { type: Number, required: true }, // Mobile number

 
  address: {
    location: { type: String, required: true }, 
    city: { type: String, required: true }, 
    district: { type: String, required: true },
    state: { type: String, required: true }, 
  },

  // Additional details
  description: { type: String }, // Optional description
  crime: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Crime' 
  }, 
  familyDetail: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Family' 
  }, 
});


const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
