const Profile = require('../models/profileSchema'); // Assuming your model file is at this path

module.exports.createRecord = (req, res) => {
  res.render('records/new.ejs');
};

module.exports.saveRecord = async (req, res) => {
    console.log(req.body);
    try {
      const {
        firstName, lastName, occupation, dob, gender, role, mNumber,
        address, description
      } = req.body;
  
      // Create a new profile (id will be automatically generated)
      const profile = new Profile({
        firstNameHindi: firstName,
        firstNameEnglish: firstName,
        lastNameHindi: lastName,
        lastNameEnglish: lastName,
        occupationHindi: occupation,
        occupationEnglish: occupation,
        dob,
        gender,
        role,
        mNumber,
        address: {
          locationHindi: address.location,
          locationEnglish: address.location,
          cityHindi: address.city,
          cityEnglish: address.city,
          districtHindi: address.district,
          districtEnglish: address.district,
          stateHindi: address.state,
          stateEnglish: address.state,
        },
        descriptionHindi: description,
        descriptionEnglish: description,
      });
  
      // Save the profile to the database
      console.log(profile);
      await profile.save();
      res.redirect('/success'); // Redirect to a success page after saving the record
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Error saving record');
    }
  };
  

  
