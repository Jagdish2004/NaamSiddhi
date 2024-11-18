const Profile = require('../models/profileSchema');
const { getSoundex } = require('../soundex',);

module.exports.searchRecord =(req,res)=>{
    res.render('records/search.ejs', { profiles: null });

}

module.exports.resultRecord = async (req, res) => {
  const { firstName, lastName } = req.body;

  const firstNameSoundex = getSoundex(firstName, false, false); 
  const lastNameSoundex = getSoundex(lastName, false, false);

  try {
    const profiles = await Profile.find({
      'soundexCode.firstName': firstNameSoundex,
      'soundexCode.lastName': lastNameSoundex,
    });
    

    res.render('records/search.ejs', { profiles });
  } catch (error) {
    console.error('Error searching profiles:', error);
    res.status(500).send('An error occurred while searching profiles.');
  }
};
